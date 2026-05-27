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

  /* ─── sessao — cria sessão mínima (sem endereço ainda) ───── */
  if (action === 'sessao') {
    const { nome, telefone } = body

    if (!nome?.trim() || !telefone) {
      return NextResponse.json({ error: 'nome e telefone são obrigatórios.' }, { status: 422 })
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
      const { data: nova, error: errMesa } = await supabase
        .from('mesas')
        .insert({ tenant_id: tenant.id, numero: 0, tipo: 'delivery', ativa: true, status: 'livre' })
        .select('id, qr_token')
        .single()
      if (errMesa || !nova) {
        return NextResponse.json({ error: 'Erro ao criar mesa de delivery.' }, { status: 500 })
      }
      mesaDelivery = nova
    }

    const { data: sessao, error: errSessao } = await supabase
      .from('sessoes_mesa')
      .insert({
        mesa_id:          mesaDelivery.id,
        tenant_id:        tenant.id,
        cliente_nome:     nome.trim(),
        cliente_whatsapp: telefone.replace(/\D/g, ''),
        ativa:            true,
        is_delivery:      true,
        delivery_nome:    nome.trim(),
        delivery_telefone: telefone.replace(/\D/g, ''),
        delivery_status:  'aguardando',
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

  /* ─── checkout — atualiza sessão com endereço + pagamento ── */
  if (action === 'checkout') {
    const { sessao_id, cep, numero, complemento, forma_pagamento } = body

    if (!sessao_id || !cep || !forma_pagamento) {
      return NextResponse.json({ error: 'sessao_id, cep e forma_pagamento são obrigatórios.' }, { status: 422 })
    }

    const cepLimpo = cep.replace(/\D/g, '')
    const enderecoData = await buscarCEP(cepLimpo)
    if (!enderecoData) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 422 })
    }

    // Calcula distância e taxa
    const coordsCliente = await geocodificar(
      enderecoData.logradouro, '', enderecoData.localidade, enderecoData.uf, cepLimpo,
    )

    let distanciaKm: number | null = null
    let taxaFinal = config.taxa_padrao
    let foraDoRaio = false

    if (coordsCliente && config.lat && config.lng) {
      distanciaKm = Math.round(haversine(config.lat, config.lng, coordsCliente.lat, coordsCliente.lng) * 10) / 10
      if (distanciaKm > (config.raio_maximo ?? 15)) {
        foraDoRaio = true
        return NextResponse.json({
          error: `Endereço fora do raio de entrega (${config.raio_maximo} km). Seu endereço fica a ${distanciaKm} km.`,
          fora_do_raio: true,
          distancia_km: distanciaKm,
        }, { status: 422 })
      }
      const zonas = zonaRes.data ?? []
      const zona  = zonas.find(
        (z: { km_min: number; km_max: number }) => distanciaKm! >= z.km_min && distanciaKm! < z.km_max
      ) ?? null
      if (zona) taxaFinal = zona.taxa
    }

    const { error: errUpdate } = await supabase
      .from('sessoes_mesa')
      .update({
        delivery_cep:               cepLimpo,
        delivery_endereco:          enderecoData.logradouro ?? '',
        delivery_numero:            numero ?? null,
        delivery_complemento:       complemento ?? null,
        delivery_bairro:            enderecoData.bairro ?? null,
        delivery_cidade:            enderecoData.localidade ?? null,
        delivery_uf:                enderecoData.uf ?? null,
        delivery_taxa:              taxaFinal,
        delivery_distancia_km:      distanciaKm,
        delivery_forma_pagamento:   forma_pagamento,
      })
      .eq('id', sessao_id)
      .eq('tenant_id', tenant.id)

    if (errUpdate) {
      return NextResponse.json({ error: 'Erro ao salvar endereço de entrega.' }, { status: 500 })
    }

    return NextResponse.json({
      ok:           true,
      taxa_entrega: taxaFinal,
      distancia_km: distanciaKm,
      endereco:     enderecoData,
      fora_do_raio: foraDoRaio,
    })
  }

  return NextResponse.json({ error: 'Action inválida.' }, { status: 400 })
}
