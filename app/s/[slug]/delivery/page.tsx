'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2, Truck, MapPin, User, Phone, ShoppingBag,
  Plus, Minus, X, Check, ChevronRight, Clock, AlertCircle,
  Package, Search,
} from 'lucide-react'

/* ─── tipos ─────────────────────────────────────────────────── */
interface Tenant {
  id:           string
  nome:         string
  logo_url:     string | null
  cor_primaria: string
}

interface DeliveryConfig {
  ativo:          boolean
  tempo_estimado: number
  pedido_minimo:  number
  taxa_padrao:    number
  raio_maximo:    number
  observacoes?:   string
  lat?:           number
  lng?:           number
}

interface Zona {
  id:     string
  nome:   string
  km_min: number
  km_max: number
  taxa:   number
}

interface CardapioItem {
  id:          string
  nome:        string
  descricao?:  string
  preco:       number
  categoria:   string
  imagem_url?: string
}

interface ItemCarrinho {
  id:         string
  nome:       string
  preco:      number
  quantidade: number
}

interface CalculoTaxa {
  ok:           boolean
  taxa_entrega: number
  distancia_km: number | null
  zona:         Zona | null
  fora_do_raio: boolean
  aviso?:       string
  endereco?: {
    logradouro: string
    bairro:     string
    localidade: string
    uf:         string
  }
}

function fmt(n: number) { return `R$ ${n.toFixed(2).replace('.', ',')}` }

function formatarTelefone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

function formatarCEP(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n
}

const ETAPAS = ['dados', 'itens', 'resumo', 'confirmado'] as const
type Etapa = typeof ETAPAS[number]

/* ═══════════════════════════════════════════════════════════════ */
export default function DeliveryPublicoPage() {
  const { slug } = useParams() as { slug: string }

  /* dados do restaurante */
  const [tenant,     setTenant]     = useState<Tenant | null>(null)
  const [config,     setConfig]     = useState<DeliveryConfig | null>(null)
  const [zonas,      setZonas]      = useState<Zona[]>([])
  const [cardapio,   setCardapio]   = useState<CardapioItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [inativo,    setInativo]    = useState(false)
  const [notFound,   setNotFound]   = useState(false)

  /* formulário */
  const [etapa, setEtapa] = useState<Etapa>('dados')

  const [nome,        setNome]        = useState('')
  const [telefone,    setTelefone]    = useState('')
  const [cep,         setCep]         = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')

  /* cálculo de taxa */
  const [calculo,        setCalculo]        = useState<CalculoTaxa | null>(null)
  const [calculando,     setCalculando]     = useState(false)
  const [erroCalculo,    setErroCalculo]    = useState('')

  /* carrinho */
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca,    setBusca]    = useState('')

  /* pedido */
  const [enviando,      setEnviando]      = useState(false)
  const [erroPedido,    setErroPedido]    = useState('')
  const [pedidoCriado,  setPedidoCriado]  = useState<{ id: string } | null>(null)

  /* observações */
  const [observacoes, setObservacoes] = useState('')

  /* ── carga inicial ───────────────────────────────────────────── */
  useEffect(() => {
    fetch(`/api/pub/delivery?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.erro === 'delivery_inativo') { setInativo(true); return }
        if (!data.tenant)                     { setNotFound(true); return }
        setTenant(data.tenant)
        setConfig(data.config)
        setZonas(data.zonas ?? [])
        setCardapio(data.cardapio ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // Pré-preenche com dados salvos
    const nomeSalvo = localStorage.getItem('mmu_cliente_nome')
    const telSalvo  = localStorage.getItem('mmu_cliente_whatsapp')
    if (nomeSalvo) setNome(nomeSalvo)
    if (telSalvo) setTelefone(formatarTelefone(telSalvo))
  }, [slug])

  /* ── calcular taxa ao preencher CEP completo ─────────────────── */
  useEffect(() => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) { setCalculo(null); setErroCalculo(''); return }

    const timer = setTimeout(async () => {
      setCalculando(true)
      setErroCalculo('')
      try {
        const res  = await fetch(`/api/pub/delivery?slug=${slug}&action=calcular`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ cep: cepLimpo }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setErroCalculo(data.error ?? 'Erro ao calcular taxa.')
          setCalculo(null)
        } else {
          setCalculo(data)
          if (!data.ok) setErroCalculo(data.error ?? '')
        }
      } catch {
        setErroCalculo('Erro de conexão ao verificar CEP.')
      } finally {
        setCalculando(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [cep, slug])

  /* ── carrinho ────────────────────────────────────────────────── */
  function adicionarItem(item: CardapioItem) {
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.id === item.id)
      if (ex) return prev.map((i) => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { id: item.id, nome: item.nome, preco: item.preco, quantidade: 1 }]
    })
  }

  function removerItem(id: string) {
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.id === id)
      if (!ex || ex.quantidade === 1) return prev.filter((i) => i.id !== id)
      return prev.map((i) => i.id === id ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  function quantidadeItem(id: string) {
    return carrinho.find((i) => i.id === id)?.quantidade ?? 0
  }

  const subtotal    = useMemo(() => carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0), [carrinho])
  const taxaEntrega = calculo?.ok ? calculo.taxa_entrega : (config?.taxa_padrao ?? 0)
  const total       = subtotal + taxaEntrega

  const categorias = useMemo(() => {
    const cats = new Set(cardapio.map((i) => i.categoria))
    return Array.from(cats)
  }, [cardapio])

  const cardapioFiltrado = useMemo(() => {
    if (!busca.trim()) return cardapio
    const q = busca.toLowerCase()
    return cardapio.filter((i) => i.nome.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q))
  }, [cardapio, busca])

  /* ── enviar pedido ───────────────────────────────────────────── */
  async function enviarPedido() {
    if (!carrinho.length) { setErroPedido('Adicione ao menos um item.'); return }
    if (!nome.trim())     { setErroPedido('Informe seu nome.');          return }
    if (!telefone.replace(/\D/g, '')) { setErroPedido('Informe seu telefone.'); return }
    if (!cep.replace(/\D/g, ''))      { setErroPedido('Informe o CEP.'); return }

    setEnviando(true)
    setErroPedido('')

    try {
      const res = await fetch(`/api/pub/delivery?slug=${slug}&action=pedido`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cliente_nome:     nome.trim(),
          cliente_telefone: telefone.replace(/\D/g, ''),
          cep:              cep.replace(/\D/g, ''),
          numero,
          complemento,
          bairro:           calculo?.endereco?.bairro,
          cidade:           calculo?.endereco?.localidade,
          distancia_km:     calculo?.distancia_km,
          taxa_entrega:     taxaEntrega,
          itens:            carrinho,
          observacoes:      observacoes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErroPedido(data.error ?? 'Erro ao enviar pedido.'); return }

      // Salva nome/tel para próximo acesso
      localStorage.setItem('mmu_cliente_nome',      nome.trim())
      localStorage.setItem('mmu_cliente_whatsapp',  telefone.replace(/\D/g, ''))

      setPedidoCriado(data.pedido)
      setEtapa('confirmado')
    } finally {
      setEnviando(false)
    }
  }

  const cor = tenant?.cor_primaria ?? '#1A9B8A'

  /* ── estados de carregamento / erro ─────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FAFA' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <div className="text-center">
          <p className="text-5xl mb-3">🍽️</p>
          <p className="font-bold text-slate-700">Restaurante não encontrado</p>
        </div>
      </div>
    )
  }

  if (inativo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h2 className="font-bold text-slate-700 text-lg mb-2">Delivery indisponível</h2>
          <p className="text-slate-400 text-sm">
            {tenant?.nome ?? 'Este restaurante'} não está aceitando pedidos de delivery no momento.
          </p>
        </div>
      </div>
    )
  }

  /* ── CONFIRMADO ──────────────────────────────────────────────── */
  if (etapa === 'confirmado') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: cor }}
          >
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Pedido enviado!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Seu pedido foi recebido com sucesso. Em até{' '}
            <strong>{config?.tempo_estimado ?? 45} minutos</strong> o entregador estará a caminho.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-1">
            <p className="text-slate-500">Subtotal: <strong>R$ {subtotal.toFixed(2).replace('.', ',')}</strong></p>
            <p className="text-slate-500">Taxa de entrega: <strong>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</strong></p>
            <p className="text-slate-800 font-bold">Total: R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <p className="text-xs text-slate-400 mt-6">
            Em caso de dúvidas, entre em contato com o restaurante.
          </p>
        </div>
      </div>
    )
  }

  /* ── indicador de etapas ─────────────────────────────────────── */
  const etapaIdx   = ETAPAS.indexOf(etapa)
  const etapasVis  = ['dados', 'itens', 'resumo'] as const
  const etapaLabel = { dados: 'Seus dados', itens: 'Itens', resumo: 'Revisar' }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div className="text-white px-5 pt-8 pb-10"
        style={{ background: `linear-gradient(135deg, ${cor}cc, ${cor})` }}>
        {tenant?.logo_url && (
          <img src={tenant.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover mb-3 border border-white/20" />
        )}
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-white/70" />
          <span className="text-xs font-bold tracking-widest uppercase text-white/70">{tenant?.nome}</span>
        </div>
        <h1 className="text-3xl font-black">Delivery</h1>
        {config?.tempo_estimado && (
          <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Previsão: {config.tempo_estimado} min
          </p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 shadow-sm -mt-1">
        {etapasVis.map((e, i) => (
          <div key={e} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              ETAPAS.indexOf(etapa) > i
                ? 'text-teal-600'
                : etapa === e
                  ? 'text-slate-800'
                  : 'text-slate-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                ETAPAS.indexOf(etapa) > i
                  ? 'bg-teal-100 text-teal-600'
                  : etapa === e
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-400'
              }`} style={etapa === e ? { background: cor } : {}}>
                {ETAPAS.indexOf(etapa) > i ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {etapaLabel[e]}
            </div>
            {i < etapasVis.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ══ ETAPA: DADOS ══════════════════════════════════════ */}
        {etapa === 'dados' && (
          <div className="space-y-4">
            {config?.observacoes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                ℹ️ {config.observacoes}
              </div>
            )}

            {/* Info pessoal */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4" style={{ color: cor }} />
                <h3 className="font-semibold text-slate-800">Seus dados</h3>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome completo *</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="João Silva"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">WhatsApp / Telefone *</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Endereço de entrega */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" style={{ color: cor }} />
                <h3 className="font-semibold text-slate-800">Endereço de entrega</h3>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">CEP *</label>
                <div className="relative">
                  <input
                    value={formatarCEP(cep)}
                    onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                  />
                  {calculando && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Resultado do cálculo */}
                {calculo && calculo.ok && !calculo.fora_do_raio && (
                  <div className="mt-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-700 space-y-0.5">
                    <p className="font-semibold">
                      {calculo.endereco?.bairro && `${calculo.endereco.bairro} — `}
                      {calculo.endereco?.localidade}/{calculo.endereco?.uf}
                    </p>
                    <p>
                      {calculo.distancia_km
                        ? `📍 ${calculo.distancia_km} km do restaurante`
                        : '📍 Distância estimada'}
                      {' · '}
                      Taxa: <strong>R$ {calculo.taxa_entrega.toFixed(2).replace('.', ',')}</strong>
                      {calculo.zona ? ` (${calculo.zona.nome})` : ''}
                    </p>
                    {calculo.aviso && <p className="text-amber-600">⚠️ {calculo.aviso}</p>}
                  </div>
                )}

                {calculo && calculo.fora_do_raio && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                    <p className="font-semibold">Fora do raio de entrega</p>
                    <p>
                      Seu endereço fica a {calculo.distancia_km} km e entregamos em até {config?.raio_maximo} km.
                    </p>
                  </div>
                )}

                {erroCalculo && !calculo && (
                  <p className="mt-2 text-xs text-red-500">{erroCalculo}</p>
                )}
              </div>

              {calculo?.ok && !calculo.fora_do_raio && calculo.endereco && (
                <>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Logradouro</p>
                    <input
                      value={calculo.endereco.logradouro}
                      readOnly
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Número</label>
                      <input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="Ex: 42"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Complemento</label>
                      <input
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Apto, bloco…"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Zonas de entrega (info) */}
            {zonas.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Taxas de entrega</p>
                <div className="space-y-1.5">
                  {zonas.map((z) => (
                    <div key={z.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">{z.nome}</span>
                      <span className="font-semibold text-slate-800">R$ {z.taxa.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
                {config?.pedido_minimo && config.pedido_minimo > 0 && (
                  <p className="text-xs text-slate-400 mt-3">
                    Pedido mínimo: <strong>R$ {config.pedido_minimo.toFixed(2).replace('.', ',')}</strong>
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                if (!nome.trim()) return
                if (!telefone.replace(/\D/g, '')) return
                if (!cep.replace(/\D/g, '') || cep.replace(/\D/g, '').length < 8) return
                if (calculo?.fora_do_raio) return
                setEtapa('itens')
              }}
              disabled={
                !nome.trim() ||
                !telefone.replace(/\D/g, '') ||
                cep.replace(/\D/g, '').length < 8 ||
                calculando ||
                (calculo?.fora_do_raio ?? false)
              }
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
              style={{ background: cor }}
            >
              Escolher itens →
            </button>
          </div>
        )}

        {/* ══ ETAPA: ITENS ══════════════════════════════════════ */}
        {etapa === 'itens' && (
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar item…"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              />
            </div>

            {categorias.map((cat) => {
              const itensCat = cardapioFiltrado.filter((i) => i.categoria === cat)
              if (!itensCat.length) return null
              return (
                <div key={cat}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">{cat}</p>
                  <div className="space-y-2">
                    {itensCat.map((item) => {
                      const qty = quantidadeItem(item.id)
                      return (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
                          {item.imagem_url && (
                            <img
                              src={item.imagem_url}
                              alt={item.nome}
                              className="w-16 h-16 object-cover rounded-lg shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                            {item.descricao && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.descricao}</p>
                            )}
                            <p className="text-sm font-bold mt-1" style={{ color: cor }}>
                              R$ {item.preco.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {qty > 0 ? (
                              <>
                                <button
                                  onClick={() => removerItem(item.id)}
                                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold">{qty}</span>
                                <button
                                  onClick={() => adicionarItem(item)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors"
                                  style={{ background: cor }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => adicionarItem(item)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                                style={{ background: cor }}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {cardapioFiltrado.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum item encontrado</p>
              </div>
            )}

            {/* Barra flutuante */}
            {carrinho.length > 0 && (
              <div className="fixed bottom-6 left-0 right-0 px-4 z-30">
                <div className="max-w-lg mx-auto">
                  <button
                    onClick={() => setEtapa('resumo')}
                    className="w-full flex items-center justify-between text-white font-semibold py-4 px-5 rounded-2xl shadow-lg transition-all"
                    style={{ background: cor }}
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      {carrinho.reduce((a, i) => a + i.quantidade, 0)} iten(s)
                    </span>
                    <span>
                      R$ {subtotal.toFixed(2).replace('.', ',')}
                      <ChevronRight className="inline w-4 h-4 ml-1" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setEtapa('dados')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* ══ ETAPA: RESUMO ══════════════════════════════════════ */}
        {etapa === 'resumo' && (
          <div className="space-y-4">

            {/* Dados do cliente */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Entrega para</p>
                <button onClick={() => setEtapa('dados')} className="text-xs text-teal-600 hover:underline">Editar</button>
              </div>
              <p className="font-semibold text-slate-800">{nome}</p>
              <p className="text-sm text-slate-500">{telefone}</p>
              <p className="text-sm text-slate-600 mt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <span>
                  {calculo?.endereco?.logradouro
                    ? `${calculo.endereco.logradouro}${numero ? `, ${numero}` : ''}${complemento ? ` — ${complemento}` : ''}`
                    : cep}
                  {calculo?.endereco?.bairro && `, ${calculo.endereco.bairro}`}
                  {calculo?.endereco?.localidade && ` — ${calculo.endereco.localidade}/${calculo.endereco.uf}`}
                </span>
              </p>
            </div>

            {/* Itens */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Itens do pedido</p>
                <button onClick={() => setEtapa('itens')} className="text-xs text-teal-600 hover:underline">Editar</button>
              </div>
              <div className="space-y-2">
                {carrinho.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.quantidade}× {item.nome}</span>
                    <span className="text-slate-600 font-medium">
                      R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Taxa de entrega</span>
                  <span>R$ {taxaEntrega.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 pt-1 border-t border-slate-100 mt-1">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: sem cebola, troco para R$ 100…"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {erroPedido && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erroPedido}
              </div>
            )}

            <button
              onClick={enviarPedido}
              disabled={enviando}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: cor }}
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              {enviando ? 'Enviando…' : 'Confirmar pedido'}
            </button>

            <button
              onClick={() => setEtapa('itens')}
              className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              ← Voltar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
