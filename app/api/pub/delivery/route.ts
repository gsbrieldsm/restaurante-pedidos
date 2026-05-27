export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buscarCEP, geocodificar, haversine } from '@/lib/geocodigo'

/**
 * GET /api/pub/delivery?slug=xxx
 * Retorna config + zonas + cardápio do tenant.
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
    supabase.from('configuracoes')
      .select('logo_url, cor_primaria, restaurante_nome, restaurante_logo_url')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ])

  const config = configRes.data
  if (!config || !config.ativo) {
    return NextResponse.json({ erro: 'delivery_inativo' })
  }

  return NextResponse.json({
    tenant: {
      id:           tenant.id,
      nome:         configVisualRes.data?.restaurante_nome ?? tenant.nome_restaurante,
      logo_url:     configVisualRes.data?.restaurante_logo_url ?? null,
      cor_primaria: configVisualRes.data?.cor_primaria ?? '#1A9B8A',
    },
    config,
    zonas:   zonaRes.data   ?? [],
    cardapio: cardapioRes.data ?? [],
  })
}

/**
 * POST /api/pub/delivery?slug=xxx&action=calcular
 * Calcula taxa de entrega para um CEP.
 * Body: { cep }
 *
 * POST /api/pub/delivery?slug=xxx&action=sessao
 * Cria sessão de delivery no sistema (sessoes_mesa).
 * Body: { nome, telefone, cep, numero, complemento, bairro, cidade, uf,
 *         taxa_entrega, distancia_km, coords, forma_pagamento }
 * Retorna: { token, sessao_id, cliente_nome }  ← mesmo formato de sessão normal
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug   = searchParams.get('slug')
  const action = searchParams.get('action') ?? 'sessao'

  if (!slug) return NextResponse.json({ error: 'slug obrigatório.' }, { status: 400 })

  const supabase = createServiceClient()

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
    return NextResponse.json({ error: 'Delivery não está ativo.' }, { status: 403 })
  }

  const body = await req.json()

  /* ─── calcular ────────────────────────────────────────────── */
  if (action === 'calcular') {
    const { cep } = body
    if (!cep) return NextResponse.json({ error: 'CEP obrigatório.' }, { status: 422 })

    const enderecoData = await buscarCEP(cep)
    if (!enderecoData) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 422 })
    }

    const coordsCliente = await geocodificar(
      enderecoData.logradouro, '', enderecoData.localidade, enderecoData.uf, cep,
    )

    if (!coordsCliente || !config.lat || !config.lng) {
      return NextResponse.json({
        ok:           true,
        endereco:     enderecoData,
        distancia_km: null,
        taxa_entrega: config.taxa_padrao,
        zona:         null,
        fora_do_raio: false,
        aviso:        'Não foi possível calcular a distância. Taxa padrão aplicada.',
      })
    }

    const distanciaKm = haversine(config.lat, config.lng, coordsCliente.lat, coordsCliente.lng)

    if (distanciaKm > (config.raio_maximo ?? 15)) {
      return NextResponse.json({
        ok:           false,
        fora_do_raio: true,
        distancia_km: Math.round(distanciaKm * 10) / 10,
        raio_maximo:  config.raio_maximo,
        error:        `Endereço fora do raio de entrega (${config.raio_maximo} km).`,
      })
    }

    const zonas = zonaRes.data ?? []
    const zona  = zonas.find(
      (z: { km_min: number; km_max: number }) =>
        distanciaKm >= z.km_min && distanciaKm < z.km_max
    ) ?? null
    const taxa  = zona ? zona.taxa : config.taxa_padrao

    return NextResponse.json({
      ok:           true,
      endereco:     enderecoData,
      distancia_km: Math.round(distanciaKm * 10) / 10,
      taxa_entrega: taxa,
      zona,
      fora_do_raio: false,
      coords:       coordsCliente,
    })
  }

  /* ─── sessao ──────────────────────────────────────────────── */
  const {
    nome, telefone, cep, numero, complemento,
    bairro, cidade, uf,
    taxa_entrega, distancia_km,
    forma_pagamento,
  } = body

  if (!nome?.trim() || !telefone || !cep) {
    return NextResponse.json({ error: 'nome, telefone e cep são obrigatórios.' }, { status: 422 })
  }
  if (!forma_pagamento) {
    return NextResponse.json({ error: 'Forma de pagamento é obrigatória.' }, { status: 422 })
  }

  // Busca ou cria a mesa de delivery do tenant
  let { data: mesaDelivery } = await supabase
    .from('mesas')
    .select('id, qr_token')
    .eq('tenant_id', tenant.id)
    .eq('tipo', 'delivery')
    .limit(1)
    .maybeSingle()

  if (!mesaDelivery) {
    // Cria a mesa delivery automaticamente
    const { data: nova, error: errMesa } = await supabase
      .from('mesas')
      .insert({
        tenant_id: tenant.id,
        numero:    0,        // número 0 = delivery
        tipo:      'delivery',
        ativa:     true,
        status:    'livre',
      })
      .select('id, qr_token')
      .single()

    if (errMesa || !nova) {
      return NextResponse.json({ error: 'Erro ao criar mesa de delivery.' }, { status: 500 })
    }
    mesaDelivery = nova
  }

  // Cria a sessão com campos de delivery
  const cepLimpo = cep.replace(/\D/g, '')
  const enderecoData = await buscarCEP(cepLimpo)

  const { data: sessao, error: errSessao } = await supabase
    .from('sessoes_mesa')
    .insert({
      mesa_id:                    mesaDelivery.id,
      tenant_id:                  tenant.id,
      cliente_nome:               nome.trim(),
      cliente_whatsapp:           telefone.replace(/\D/g, ''),
      ativa:                      true,
      // campos delivery
      is_delivery:                true,
      delivery_nome:              nome.trim(),
      delivery_telefone:          telefone.replace(/\D/g, ''),
      delivery_cep:               cepLimpo,
      delivery_endereco:          enderecoData?.logradouro ?? '',
      delivery_numero:            numero ?? null,
      delivery_complemento:       complemento ?? null,
      delivery_bairro:            bairro || enderecoData?.bairro   || null,
      delivery_cidade:            cidade || enderecoData?.localidade || null,
      delivery_uf:                uf     || enderecoData?.uf        || null,
      delivery_taxa:              taxa_entrega ?? config.taxa_padrao,
      delivery_distancia_km:      distancia_km ?? null,
      delivery_forma_pagamento:   forma_pagamento,
      delivery_status:            'aguardando',
    })
    .select()
    .single()

  if (errSessao || !sessao) {
    return NextResponse.json({ error: 'Erro ao criar sessão de delivery.' }, { status: 500 })
  }

  return NextResponse.json({
    token:        mesaDelivery.qr_token,
    sessao_id:    sessao.id,
    cliente_nome: nome.trim(),
  })
}
