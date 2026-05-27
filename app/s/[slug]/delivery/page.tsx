'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Truck, Clock, ChevronRight, AlertCircle } from 'lucide-react'

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
}

function formatarTelefone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

export default function DeliveryPublicoPage() {
  const { slug } = useParams() as { slug: string }
  const router   = useRouter()

  const [tenant,   setTenant]   = useState<Tenant | null>(null)
  const [config,   setConfig]   = useState<DeliveryConfig | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [inativo,  setInativo]  = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [nome,      setNome]      = useState('')
  const [telefone,  setTelefone]  = useState('')
  const [criando,   setCriando]   = useState(false)
  const [erro,      setErro]      = useState('')

  useEffect(() => {
    fetch(`/api/pub/delivery?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.erro === 'delivery_inativo') { setInativo(true);  return }
        if (!data.tenant)                     { setNotFound(true); return }
        setTenant(data.tenant)
        setConfig(data.config)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    const nomeSalvo = localStorage.getItem('mmu_cliente_nome')
    const telSalvo  = localStorage.getItem('mmu_cliente_whatsapp')
    if (nomeSalvo) setNome(nomeSalvo)
    if (telSalvo)  setTelefone(formatarTelefone(telSalvo))
  }, [slug])

  async function comecarPedir() {
    if (!nome.trim() || telefone.replace(/\D/g, '').length < 10) return
    setCriando(true)
    setErro('')
    try {
      const res = await fetch(`/api/pub/delivery?slug=${slug}&action=sessao`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:     nome.trim(),
          telefone: telefone.replace(/\D/g, ''),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao iniciar pedido.'); return }

      localStorage.setItem('mmu_cliente_nome',     nome.trim())
      localStorage.setItem('mmu_cliente_whatsapp', telefone.replace(/\D/g, ''))

      sessionStorage.setItem('sessao_id',    data.sessao_id)
      sessionStorage.setItem('cliente_nome', data.cliente_nome)
      sessionStorage.setItem('is_delivery',  '1')

      router.push(`/mesa/${data.token}/cardapio`)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCriando(false)
    }
  }

  const cor     = tenant?.cor_primaria ?? '#1A9B8A'
  const valido  = nome.trim().length > 0 && telefone.replace(/\D/g, '').length >= 10

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

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F0FAFA' }}>

      {/* Header */}
      <div
        className="text-white px-5 pt-10 pb-14"
        style={{ background: `linear-gradient(135deg, ${cor}dd, ${cor})` }}
      >
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
        <h1 className="text-3xl font-black">Delivery</h1>
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

        {/* Card de identificação */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Como devemos te chamar?</p>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') comecarPedir() }}
              placeholder="Seu nome"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': cor } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">WhatsApp / Telefone *</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') comecarPedir() }}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': cor } as React.CSSProperties}
            />
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erro}
          </div>
        )}

        <button
          onClick={comecarPedir}
          disabled={!valido || criando}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg"
          style={{ background: cor }}
        >
          {criando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Ver cardápio
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Você escolhe os itens e informa o endereço na hora de finalizar.
        </p>

      </div>
    </div>
  )
}
