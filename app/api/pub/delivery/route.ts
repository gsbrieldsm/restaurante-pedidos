export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buscarCEP, geocodificar, haversine } from '@/lib/geocodigo'

/**
 * GET /api/pub/delivery?slug=xxx
 * Retorna config + zonas + cardápio do tenant (para a página pública de delivery).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug obrigatório.' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, nome_restaurante, plano')
    .eq('slug', slug)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restaurante não encontrado.' }, { status: 404 })
  }

  const [configRes, zonaRes, cardapioRes, configVisualRes] = await Promise.all([
    supabase.from('delivery_config').select('*').eq('tenant_id', tenant.id).maybeSingle(),
    supabase.from('delivery_zonas').select('*').eq('tenant_id', tenant.id).order('km_min'),
    supabase.from('cardapio_itens')
      .select('id, nome, descricao, preco, categoria, disponivel, imagem_url')
      .eq('tenant_id', tenant.id)
      .eq('disponivel', true)
      .order('categoria')
      .order('ordem'),
    supabase.from('configuracoes').select('logo_url, cor_primaria, banner_url').eq('tenant_id', tenant.id).maybeSingle(),
  ])

  const config = configRes.data
  if (!config || !config.ativo) {
    return NextResponse.json({ erro: 'delivery_inativo' })
  }

  return NextResponse.json({
    tenant: {
      id:   tenant.id,
      nome: tenant.nome_restaurante,
      plano: tenant.plano,
      logo_url:    configVisualRes.data?.logo_url ?? null,
      cor_primaria: configVisualRes.data?.cor_primaria ?? '#1A9B8A',
    },
    config,
    zonas:   zonaRes.data  ?? [],
    cardapio: cardapioRes.data ?? [],
  })
}

/**
 * POST /api/pub/delivery?slug=xxx&action=calcular
 * Calcula taxa de entrega para um CEP.
 * Body: { cep }
 *
 * POST /api/pub/delivery?slug=xxx&action=pedido
 * Cria um pedido de delivery.
 * Body: { cliente_nome, cliente_telefone, cep, numero, complemento, itens[], observacoes }
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug   = searchParams.get('slug')
  const action = searchParams.get('action') ?? 'pedido'

  if (!slug) return NextResponse.json({ error: 'slug obrigatório.' }, { status: 400 })

  const supabase = createServiceClient()

  // Busca tenant + config
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nome_restaurante')
    .eq('slug', slug)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Restaurante não encontrado.' }, { status: 404 })

  const [configRes, zonaRes] = await Promise.all([
    supabase.from('delivery_config').select('*').eq('tenant_id', tenant.id).maybeSingle(),
    supabase.from('delivery_zonas').select('*').eq('tenant_id', tenant.id).order('km_min'),
  ])

  const config = configRes.data
  if (!config || !config.ativo) {
    return NextResponse.json({ error: 'Delivery não está ativo para este restaurante.' }, { status: 403 })
  }

  const body = await req.json()

  // ─── calcular ─────────────────────────────────────────────────────────────
  if (action === 'calcular') {
    const { cep } = body
    if (!cep) return NextResponse.json({ error: 'CEP obrigatório.' }, { status: 422 })

    const enderecoData = await buscarCEP(cep)
    if (!enderecoData) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 422 })
    }

    // Geocodifica CEP do cliente
    const coordsCliente = await geocodificar(
      enderecoData.logradouro,
      '',
      enderecoData.localidade,
      enderecoData.uf,
      cep,
    )

    if (!coordsCliente) {
      // Sem coordenadas — retorna taxa padrão
      return NextResponse.json({
        ok: true,
        endereco: enderecoData,
        distancia_km: null,
        taxa_entrega: config.taxa_padrao,
        zona: null,
        fora_do_raio: false,
        aviso: 'Não foi possível calcular a distância exata. Taxa padrão aplicada.',
      })
    }

    // Restaurante precisa ter coordenadas
    if (!config.lat || !config.lng) {
      return NextResponse.json({
        ok: true,
        endereco: enderecoData,
        distancia_km: null,
        taxa_entrega: config.taxa_padrao,
        zona: null,
        fora_do_raio: false,
        aviso: 'Endereço do restaurante não geocodificado. Taxa padrão aplicada.',
      })
    }

    const distanciaKm = haversine(config.lat, config.lng, coordsCliente.lat, coordsCliente.lng)

    if (distanciaKm > (config.raio_maximo ?? 15)) {
      return NextResponse.json({
        ok: false,
        fora_do_raio: true,
        distancia_km: Math.round(distanciaKm * 10) / 10,
        raio_maximo: config.raio_maximo,
        error: `Endereço fora do raio de entrega (${config.raio_maximo} km).`,
      })
    }

    // Encontra zona
    const zonas = zonaRes.data ?? []
    const zona  = zonas.find(
      (z: { km_min: number; km_max: number }) =>
        distanciaKm >= z.km_min && distanciaKm < z.km_max
    ) ?? null

    const taxa = zona ? zona.taxa : config.taxa_padrao

    return NextResponse.json({
      ok: true,
      endereco: enderecoData,
      distancia_km: Math.round(distanciaKm * 10) / 10,
      taxa_entrega: taxa,
      zona: zona ?? null,
      fora_do_raio: false,
      coords_cliente: coordsCliente,
    })
  }

  // ─── pedido ───────────────────────────────────────────────────────────────
  const {
    cliente_nome, cliente_telefone, cep, numero, complemento,
    bairro: bairroInput, cidade: cidadeInput,
    lat: latInput, lng: lngInput,
    distancia_km, taxa_entrega,
    itens, observacoes,
  } = body

  if (!cliente_nome || !cliente_telefone || !cep || !itens?.length) {
    return NextResponse.json({
      error: 'cliente_nome, cliente_telefone, cep e itens são obrigatórios.',
    }, { status: 422 })
  }

  // Busca dados do CEP se não vieram preenchidos
  const enderecoData = await buscarCEP(cep)

  const bairro = bairroInput || enderecoData?.bairro || ''
  const cidade = cidadeInput || enderecoData?.localidade || ''
  const uf     = enderecoData?.uf || ''

  // Calcula subtotal e total
  const subtotal: number = itens.reduce(
    (acc: number, item: { preco: number; quantidade: number }) =>
      acc + item.preco * item.quantidade,
    0,
  )
  const taxaFinal  = taxa_entrega ?? config.taxa_padrao
  const total      = subtotal + taxaFinal

  // Verifica pedido mínimo
  if (config.pedido_minimo > 0 && subtotal < config.pedido_minimo) {
    return NextResponse.json({
      error: `Pedido mínimo é R$ ${Number(config.pedido_minimo).toFixed(2).replace('.', ',')}.`,
    }, { status: 422 })
  }

  const { data: pedido, error } = await supabase
    .from('delivery_pedidos')
    .insert({
      tenant_id:        tenant.id,
      cliente_nome,
      cliente_telefone,
      endereco:         enderecoData?.logradouro ?? '',
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
      lat:              latInput  ?? null,
      lng:              lngInput  ?? null,
      distancia_km:     distancia_km ?? null,
      taxa_entrega:     taxaFinal,
      subtotal,
      total,
      itens,
      observacoes,
      status:           'pendente',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, pedido }, { status: 201 })
}
