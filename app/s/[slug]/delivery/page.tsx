'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, Truck, MapPin, User, Phone, Clock,
  ChevronRight, Check, AlertCircle, QrCode, Banknote, CreditCard,
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

type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

const FORMAS: { key: FormaPagamento; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote,    desc: 'Pague na entrega' },
  { key: 'pix',      label: 'Pix',      icon: QrCode,      desc: 'Pague na entrega' },
  { key: 'debito',   label: 'Débito',   icon: CreditCard,  desc: 'Pague na entrega' },
  { key: 'credito',  label: 'Crédito',  icon: CreditCard,  desc: 'Pague na entrega' },
]

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

/* ═══════════════════════════════════════════════════════════════ */
export default function DeliveryPublicoPage() {
  const { slug }  = useParams() as { slug: string }
  const router    = useRouter()

  /* config restaurante */
  const [tenant,   setTenant]   = useState<Tenant | null>(null)
  const [config,   setConfig]   = useState<DeliveryConfig | null>(null)
  const [zonas,    setZonas]    = useState<Zona[]>([])
  const [loading,  setLoading]  = useState(true)
  const [inativo,  setInativo]  = useState(false)
  const [notFound, setNotFound] = useState(false)

  /* formulário */
  const [nome,        setNome]        = useState('')
  const [telefone,    setTelefone]    = useState('')
  const [cep,         setCep]         = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')

  /* cálculo de taxa */
  const [calculo,    setCalculo]    = useState<CalculoTaxa | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [erroCalculo, setErroCalculo] = useState('')

  /* forma de pagamento */
  const [forma, setForma] = useState<FormaPagamento | null>(null)

  /* criação de sessão */
  const [criando,    setCriando]    = useState(false)
  const [erroCriacao, setErroCriacao] = useState('')

  /* ── carga inicial ───────────────────────────────────────────── */
  useEffect(() => {
    fetch(`/api/pub/delivery?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.erro === 'delivery_inativo') { setInativo(true);  return }
        if (!data.tenant)                     { setNotFound(true); return }
        setTenant(data.tenant)
        setConfig(data.config)
        setZonas(data.zonas ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    const nomeSalvo = localStorage.getItem('mmu_cliente_nome')
    const telSalvo  = localStorage.getItem('mmu_cliente_whatsapp')
    if (nomeSalvo) setNome(nomeSalvo)
    if (telSalvo)  setTelefone(formatarTelefone(telSalvo))
  }, [slug])

  /* ── calcular taxa ao completar CEP ─────────────────────────── */
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
        }
      } catch {
        setErroCalculo('Erro de conexão.')
      } finally {
        setCalculando(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [cep, slug])

  /* ── criar sessão e ir pro cardápio ──────────────────────────── */
  async function confirmar() {
    if (!nome.trim() || !telefone.replace(/\D/g, '') || cep.replace(/\D/g, '').length < 8 || !forma) return
    if (calculo?.fora_do_raio) return

    setCriando(true)
    setErroCriacao('')

    try {
      const res = await fetch(`/api/pub/delivery?slug=${slug}&action=sessao`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:            nome.trim(),
          telefone:        telefone.replace(/\D/g, ''),
          cep:             cep.replace(/\D/g, ''),
          numero,
          complemento,
          bairro:          calculo?.endereco?.bairro      ?? null,
          cidade:          calculo?.endereco?.localidade  ?? null,
          uf:              calculo?.endereco?.uf          ?? null,
          taxa_entrega:    calculo?.taxa_entrega ?? config?.taxa_padrao ?? 0,
          distancia_km:    calculo?.distancia_km ?? null,
          forma_pagamento: forma,
        }),
      })
      const data = await res.json()

      if (!res.ok) { setErroCriacao(data.error ?? 'Erro ao criar pedido.'); return }

      // Salva dados para próximos acessos
      localStorage.setItem('mmu_cliente_nome',     nome.trim())
      localStorage.setItem('mmu_cliente_whatsapp', telefone.replace(/\D/g, ''))

      // Marca sessão como delivery no sessionStorage
      sessionStorage.setItem('sessao_id',    data.sessao_id)
      sessionStorage.setItem('cliente_nome', data.cliente_nome)
      sessionStorage.setItem('is_delivery',  '1')

      // Redireciona para o cardápio (exatamente igual ao fluxo normal)
      router.push(`/mesa/${data.token}/cardapio`)
    } finally {
      setCriando(false)
    }
  }

  const cor = tenant?.cor_primaria ?? '#1A9B8A'
  const taxaExibida = calculo?.ok && !calculo.fora_do_raio
    ? calculo.taxa_entrega
    : config?.taxa_padrao ?? 0

  const formValida =
    nome.trim().length > 0 &&
    telefone.replace(/\D/g, '').length >= 10 &&
    cep.replace(/\D/g, '').length === 8 &&
    !calculando &&
    !(calculo?.fora_do_raio ?? false) &&
    forma !== null

  /* ── estados especiais ───────────────────────────────────────── */
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

  /* ── formulário principal ────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-10" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div className="text-white px-5 pt-10 pb-12"
        style={{ background: `linear-gradient(135deg, ${cor}dd, ${cor})` }}>
        {tenant?.logo_url && (
          <img
            src={tenant.logo_url}
            alt="Logo"
            className="w-12 h-12 rounded-xl object-cover mb-4 border-2 border-white/30"
          />
        )}
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-white/70" />
          <span className="text-xs font-bold tracking-widest uppercase text-white/70">{tenant?.nome}</span>
        </div>
        <h1 className="text-3xl font-black">Pedir delivery</h1>
        {config?.tempo_estimado && (
          <p className="text-white/80 text-sm mt-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Previsão de entrega: ~{config.tempo_estimado} minutos
          </p>
        )}
        {config?.observacoes && (
          <p className="text-white/70 text-xs mt-1.5">ℹ️ {config.observacoes}</p>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 space-y-4">

        {/* Seus dados */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4" style={{ color: cor }} />
            <h3 className="font-semibold text-slate-800">Seus dados</h3>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Nome completo *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="João Silva"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': cor } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">WhatsApp / Telefone *</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': cor } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Endereço de entrega */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4" style={{ color: cor }} />
            <h3 className="font-semibold text-slate-800">Endereço de entrega</h3>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">CEP *</label>
            <div className="relative">
              <input
                value={formatarCEP(cep)}
                onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                placeholder="00000-000"
                inputMode="numeric"
                maxLength={9}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 pr-10"
                style={{ '--tw-ring-color': cor } as React.CSSProperties}
              />
              {calculando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Resultado do cálculo */}
            {calculo?.ok && !calculo.fora_do_raio && (
              <div className="mt-2 rounded-xl px-3 py-2.5 text-xs space-y-0.5"
                style={{ background: `${cor}15`, border: `1px solid ${cor}30` }}>
                <p className="font-semibold" style={{ color: cor }}>
                  {calculo.endereco?.bairro && `${calculo.endereco.bairro} — `}
                  {calculo.endereco?.localidade}/{calculo.endereco?.uf}
                </p>
                <p className="text-slate-600">
                  {calculo.distancia_km ? `📍 ${calculo.distancia_km} km · ` : ''}
                  Taxa de entrega:{' '}
                  <strong>R$ {calculo.taxa_entrega.toFixed(2).replace('.', ',')}</strong>
                  {calculo.zona ? ` (${calculo.zona.nome})` : ''}
                </p>
                {calculo.aviso && <p className="text-amber-600">⚠️ {calculo.aviso}</p>}
              </div>
            )}

            {calculo?.fora_do_raio && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-600">
                <p className="font-semibold">Fora do raio de entrega</p>
                <p>Seu endereço fica a {calculo.distancia_km} km — entregamos até {config?.raio_maximo} km.</p>
              </div>
            )}

            {erroCalculo && !calculo && (
              <p className="mt-2 text-xs text-red-500">{erroCalculo}</p>
            )}
          </div>

          {/* Endereço complementar — aparece quando CEP válido */}
          {calculo?.ok && !calculo.fora_do_raio && calculo.endereco && (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Logradouro</label>
                <input
                  value={calculo.endereco.logradouro}
                  readOnly
                  className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Número</label>
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="42"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': cor } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Complemento</label>
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, bloco…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': cor } as React.CSSProperties}
                  />
                </div>
              </div>
            </>
          )}

          {/* Zonas de preço */}
          {zonas.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Taxas de entrega</p>
              {zonas.map((z) => (
                <div key={z.id} className="flex justify-between text-xs text-slate-600">
                  <span>{z.nome}</span>
                  <span className="font-semibold">R$ {z.taxa.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              {config?.pedido_minimo != null && config.pedido_minimo > 0 && (
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                  Pedido mínimo: R$ {config.pedido_minimo.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Forma de pagamento */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Forma de pagamento na entrega</h3>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => setForma(key)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                  forma === key
                    ? 'border-current bg-current/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={forma === key ? { color: cor, borderColor: cor } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <span className="text-[10px] text-slate-400">{desc}</span>
                {forma === key && <Check className="w-3 h-3 ml-auto mt-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo */}
        {forma && calculo?.ok && !calculo.fora_do_raio && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Resumo da entrega</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Taxa de entrega</span>
                <span>R$ {taxaExibida.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pagamento</span>
                <span className="capitalize">{forma}</span>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                O valor dos itens será somado após você escolher no cardápio.
              </p>
            </div>
          </div>
        )}

        {erroCriacao && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erroCriacao}
          </div>
        )}

        {/* Botão confirmar → vai pro cardápio */}
        <button
          onClick={confirmar}
          disabled={!formValida || criando}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg"
          style={{ background: cor }}
        >
          {criando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Escolher itens no cardápio
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Você será redirecionado para o cardápio para escolher os itens do pedido.
        </p>

      </div>
    </div>
  )
}
