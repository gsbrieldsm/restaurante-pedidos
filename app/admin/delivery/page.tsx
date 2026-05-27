'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Truck, Settings2, Package, Plus, Trash2, Loader2, MapPin,
  Clock, DollarSign, Lock, ChevronRight, Check, X, RefreshCw,
  Phone, ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

/* ─── tipos ─────────────────────────────────────────────────── */
interface DeliveryConfig {
  id?:             string
  ativo:           boolean
  endereco?:       string
  numero?:         string
  bairro?:         string
  cidade?:         string
  uf?:             string
  cep?:            string
  lat?:            number
  lng?:            number
  tempo_estimado:  number
  pedido_minimo:   number
  taxa_padrao:     number
  raio_maximo:     number
  observacoes?:    string
}

interface Zona {
  id:       string
  nome:     string
  km_min:   number
  km_max:   number
  taxa:     number
  ordem:    number
}

interface DeliveryPedido {
  id:               string
  cliente_nome:     string
  cliente_telefone: string
  endereco:         string
  numero?:          string
  complemento?:     string
  bairro?:          string
  cidade?:          string
  cep?:             string
  distancia_km?:    number
  taxa_entrega:     number
  subtotal:         number
  total:            number
  itens:            { nome: string; quantidade: number; preco: number }[]
  status:           string
  observacoes?:     string
  criado_em:        string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente:     { label: 'Pendente',      color: 'bg-amber-100 text-amber-700' },
  em_preparo:   { label: 'Em preparo',    color: 'bg-blue-100 text-blue-700'   },
  saiu_entrega: { label: 'Saiu p/ entrega', color: 'bg-purple-100 text-purple-700' },
  entregue:     { label: 'Entregue',      color: 'bg-green-100 text-green-700' },
  cancelado:    { label: 'Cancelado',     color: 'bg-red-100 text-red-700'     },
}

const STATUS_FLOW: Record<string, string> = {
  pendente:     'em_preparo',
  em_preparo:   'saiu_entrega',
  saiu_entrega: 'entregue',
}

function fmt(n: number) { return n.toFixed(2).replace('.', ',') }
function fmtData(s: string) {
  const d = new Date(s)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/* ─── formatação de CEP ──────────────────────────────────────── */
function formatarCEP(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 8)
  if (n.length > 5) return `${n.slice(0, 5)}-${n.slice(5)}`
  return n
}

/* ═══════════════════════════════════════════════════════════════ */
export default function DeliveryPage() {
  const [aba,       setAba]       = useState<'config' | 'pedidos'>('config')
  const [plano,     setPlano]     = useState<string>('starter')
  const [habilitado, setHabilitado] = useState(false)
  const [loading,   setLoading]   = useState(true)

  /* config */
  const [config, setConfig] = useState<DeliveryConfig>({
    ativo:          false,
    tempo_estimado: 45,
    pedido_minimo:  0,
    taxa_padrao:    5,
    raio_maximo:    15,
  })
  const [zonas,       setZonas]       = useState<Zona[]>([])
  const [salvando,    setSalvando]    = useState(false)
  const [salvoOk,     setSalvoOk]     = useState(false)
  const [erroSalvar,  setErroSalvar]  = useState('')

  /* nova zona */
  const [novaZona,     setNovaZona]     = useState({ nome: '', km_min: '', km_max: '', taxa: '' })
  const [adicionandoZ, setAdicionandoZ] = useState(false)

  /* pedidos */
  const [pedidos,       setPedidos]       = useState<DeliveryPedido[]>([])
  const [pedidoAberto,  setPedidoAberto]  = useState<DeliveryPedido | null>(null)
  const [carregandoP,   setCarregandoP]   = useState(false)
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [slugTenant,    setSlugTenant]    = useState('')

  /* ── carga inicial ───────────────────────────────────────────── */
  useEffect(() => {
    async function init() {
      try {
        const configRes  = await fetch('/api/admin/delivery/config')
        const configData = await configRes.json()
        setPlano(configData.plano ?? 'starter')
        setHabilitado(configData.habilitado ?? false)
        if (configData.config) setConfig(configData.config)
        setZonas(configData.zonas ?? [])

        // Lê slug do cookie (não-httpOnly — lido diretamente pelo JS)
        const slug = document.cookie.match(/tenant_slug=([^;]+)/)?.[1] ?? ''
        setSlugTenant(decodeURIComponent(slug))
      } catch { /* ignora */ } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  /* ── carregar pedidos ────────────────────────────────────────── */
  const carregarPedidos = useCallback(async () => {
    setCarregandoP(true)
    try {
      const res  = await fetch('/api/admin/delivery/pedidos')
      const data = await res.json()
      setPedidos(data.pedidos ?? [])
    } catch { /* ignora */ } finally {
      setCarregandoP(false)
    }
  }, [])

  useEffect(() => {
    if (aba === 'pedidos') carregarPedidos()
  }, [aba, carregarPedidos])

  /* ── salvar config ───────────────────────────────────────────── */
  async function salvarConfig() {
    setSalvando(true)
    setErroSalvar('')
    try {
      const res = await fetch('/api/admin/delivery/config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) { setErroSalvar(data.error ?? 'Erro ao salvar.'); return }
      setConfig(data.config)
      setSalvoOk(true)
      setTimeout(() => setSalvoOk(false), 2500)
    } finally {
      setSalvando(false)
    }
  }

  /* ── adicionar zona ──────────────────────────────────────────── */
  async function adicionarZona() {
    if (!novaZona.nome || !novaZona.km_max || !novaZona.taxa) return
    setAdicionandoZ(true)
    try {
      const res = await fetch('/api/admin/delivery/zonas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:   novaZona.nome,
          km_min: parseFloat(novaZona.km_min) || 0,
          km_max: parseFloat(novaZona.km_max),
          taxa:   parseFloat(novaZona.taxa),
          ordem:  zonas.length,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setZonas((z) => [...z, data.zona])
        setNovaZona({ nome: '', km_min: '', km_max: '', taxa: '' })
      }
    } finally {
      setAdicionandoZ(false)
    }
  }

  /* ── remover zona ────────────────────────────────────────────── */
  async function removerZona(id: string) {
    await fetch(`/api/admin/delivery/zonas?id=${id}`, { method: 'DELETE' })
    setZonas((z) => z.filter((zona) => zona.id !== id))
  }

  /* ── avançar status do pedido ────────────────────────────────── */
  async function avancarStatus(pedido: DeliveryPedido) {
    const proximo = STATUS_FLOW[pedido.status]
    if (!proximo) return
    setAtualizandoId(pedido.id)
    try {
      const res = await fetch('/api/admin/delivery/pedidos', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: pedido.id, status: proximo }),
      })
      if (res.ok) {
        setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, status: proximo } : p))
        if (pedidoAberto?.id === pedido.id) setPedidoAberto((p) => p ? { ...p, status: proximo } : p)
      }
    } finally {
      setAtualizandoId(null)
    }
  }

  async function cancelarPedido(pedido: DeliveryPedido) {
    if (!confirm('Cancelar este pedido?')) return
    setAtualizandoId(pedido.id)
    try {
      const res = await fetch('/api/admin/delivery/pedidos', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: pedido.id, status: 'cancelado' }),
      })
      if (res.ok) {
        setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, status: 'cancelado' } : p))
        if (pedidoAberto?.id === pedido.id) setPedidoAberto((p) => p ? { ...p, status: 'cancelado' } : p)
      }
    } finally {
      setAtualizandoId(null)
    }
  }

  /* ── render ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  /* Plano não suporta delivery */
  if (!habilitado) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center mt-20">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Módulo Delivery</h2>
        <p className="text-slate-500 mb-6">
          O módulo de delivery está disponível a partir do plano{' '}
          <strong className="text-teal-600">Business</strong>. Você está no plano{' '}
          <strong>{plano}</strong>.
        </p>
        <a
          href="/admin/faturamento"
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
        >
          Ver planos <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    )
  }

  const pedidosAtivos = pedidos.filter((p) => p.status !== 'entregue' && p.status !== 'cancelado')

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Delivery</h1>
            <p className="text-xs text-slate-400">Configure zonas de entrega e acompanhe pedidos</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Abas */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          {[
            { id: 'config',  label: 'Configurações', icon: Settings2 },
            {
              id: 'pedidos', label: 'Pedidos',
              icon: Package,
              badge: pedidosAtivos.length || undefined,
            },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setAba(id as typeof aba)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                aba === id
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge ? (
                <span className="bg-white text-teal-700 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ══ ABA CONFIG ══════════════════════════════════════════ */}
        {aba === 'config' && (
          <div className="space-y-5">

            {/* Toggle ativo */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Delivery ativo</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Quando ativado, clientes podem fazer pedidos de entrega em{' '}
                    {slugTenant
                      ? <a href={`/s/${slugTenant}/delivery`} target="_blank" className="text-teal-600 hover:underline">
                          /s/{slugTenant}/delivery <ExternalLink className="inline w-3 h-3" />
                        </a>
                      : 'seu link de delivery'}.
                  </p>
                </div>
                <button
                  onClick={() => setConfig((c) => ({ ...c, ativo: !c.ativo }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${config.ativo ? 'bg-teal-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${config.ativo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Endereço do restaurante */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-teal-500" />
                <h3 className="font-semibold text-slate-800">Endereço do restaurante</h3>
              </div>
              <p className="text-xs text-slate-400 -mt-2">
                Ponto de origem para o cálculo de distância. Informe o CEP para geocodificação automática.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">CEP</label>
                  <Input
                    value={formatarCEP(config.cep ?? '')}
                    onChange={(e) => setConfig((c) => ({ ...c, cep: e.target.value.replace(/\D/g, '') }))}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">UF</label>
                  <Input
                    value={config.uf ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Logradouro</label>
                  <Input
                    value={config.endereco ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, endereco: e.target.value }))}
                    placeholder="Rua das Flores"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Número</label>
                  <Input
                    value={config.numero ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, numero: e.target.value }))}
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bairro</label>
                  <Input
                    value={config.bairro ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, bairro: e.target.value }))}
                    placeholder="Centro"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Cidade</label>
                  <Input
                    value={config.cidade ?? ''}
                    onChange={(e) => setConfig((c) => ({ ...c, cidade: e.target.value }))}
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              {config.lat && config.lng && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Geocodificado — lat {config.lat?.toFixed(4)}, lng {config.lng?.toFixed(4)}
                </p>
              )}
            </div>

            {/* Operacionais */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-teal-500" />
                <h3 className="font-semibold text-slate-800">Parâmetros operacionais</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tempo estimado (min)</label>
                  <Input
                    type="number"
                    min={5}
                    value={config.tempo_estimado}
                    onChange={(e) => setConfig((c) => ({ ...c, tempo_estimado: parseInt(e.target.value) || 45 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Pedido mínimo (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={config.pedido_minimo}
                    onChange={(e) => setConfig((c) => ({ ...c, pedido_minimo: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Taxa padrão (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={config.taxa_padrao}
                    onChange={(e) => setConfig((c) => ({ ...c, taxa_padrao: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Usado quando nenhuma zona cobre a distância</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Raio máximo (km)</label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={config.raio_maximo}
                    onChange={(e) => setConfig((c) => ({ ...c, raio_maximo: parseFloat(e.target.value) || 15 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Observações para o cliente</label>
                <textarea
                  value={config.observacoes ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, observacoes: e.target.value }))}
                  placeholder="Ex: Entregamos de segunda a sábado, das 18h às 23h."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Zonas */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-teal-500" />
                <h3 className="font-semibold text-slate-800">Zonas de entrega</h3>
              </div>
              <p className="text-xs text-slate-400 -mt-2">
                Defina faixas de distância e o valor da taxa. Ordem: mais próximas primeiro.
              </p>

              {zonas.length === 0 && (
                <p className="text-sm text-slate-400 italic">Nenhuma zona cadastrada — usando taxa padrão para todas as distâncias.</p>
              )}

              <div className="space-y-2">
                {zonas.map((zona) => (
                  <div key={zona.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{zona.nome}</p>
                      <p className="text-xs text-slate-500">
                        {zona.km_min} – {zona.km_max} km
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-teal-700">R$ {fmt(zona.taxa)}</span>
                    <button
                      onClick={() => removerZona(zona.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar zona */}
              <div className="border border-dashed border-teal-300 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Nova zona</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Input
                      placeholder="Nome (ex: Até 3km)"
                      value={novaZona.nome}
                      onChange={(e) => setNovaZona((z) => ({ ...z, nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Km mínimo"
                      value={novaZona.km_min}
                      onChange={(e) => setNovaZona((z) => ({ ...z, km_min: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Km máximo"
                      value={novaZona.km_max}
                      onChange={(e) => setNovaZona((z) => ({ ...z, km_max: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Taxa (R$)"
                      value={novaZona.taxa}
                      onChange={(e) => setNovaZona((z) => ({ ...z, taxa: e.target.value }))}
                    />
                  </div>
                </div>
                <button
                  onClick={adicionarZona}
                  disabled={adicionandoZ || !novaZona.nome || !novaZona.km_max || !novaZona.taxa}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {adicionandoZ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar zona
                </button>
              </div>
            </div>

            {/* Salvar */}
            {erroSalvar && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{erroSalvar}</p>
            )}
            <button
              onClick={salvarConfig}
              disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {salvando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : salvoOk ? (
                <><Check className="w-4 h-4" /> Salvo!</>
              ) : (
                'Salvar configurações'
              )}
            </button>
          </div>
        )}

        {/* ══ ABA PEDIDOS ═════════════════════════════════════════ */}
        {aba === 'pedidos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {pedidosAtivos.length > 0
                  ? `${pedidosAtivos.length} pedido(s) ativo(s)`
                  : 'Nenhum pedido ativo no momento'}
              </p>
              <button
                onClick={carregarPedidos}
                disabled={carregandoP}
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregandoP ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {carregandoP && pedidos.length === 0 && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
              </div>
            )}

            {!carregandoP && pedidos.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum pedido de delivery ainda</p>
                <p className="text-sm mt-1">Compartilhe o link de delivery com seus clientes</p>
              </div>
            )}

            <div className="space-y-3">
              {pedidos.map((pedido) => {
                const st = STATUS_LABELS[pedido.status] ?? { label: pedido.status, color: 'bg-slate-100 text-slate-600' }
                const proximo = STATUS_FLOW[pedido.status]
                const atualizando = atualizandoId === pedido.id
                return (
                  <div
                    key={pedido.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setPedidoAberto(pedidoAberto?.id === pedido.id ? null : pedido)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">{pedido.cliente_nome}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{fmtData(pedido.criado_em)}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            📍 {pedido.endereco}{pedido.numero ? `, ${pedido.numero}` : ''}{pedido.bairro ? ` — ${pedido.bairro}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-teal-700">R$ {fmt(pedido.total)}</p>
                          {pedido.distancia_km && (
                            <p className="text-xs text-slate-400">{pedido.distancia_km} km</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {pedidoAberto?.id === pedido.id && (
                      <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50">
                        {/* Contato */}
                        <div className="flex gap-4 flex-wrap">
                          <a
                            href={`tel:${pedido.cliente_telefone}`}
                            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {pedido.cliente_telefone}
                          </a>
                          <a
                            href={`https://wa.me/55${pedido.cliente_telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800"
                          >
                            WhatsApp <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Itens */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Itens</p>
                          <div className="space-y-1">
                            {pedido.itens.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">{item.quantidade}× {item.nome}</span>
                                <span className="text-slate-500">R$ {fmt(item.preco * item.quantidade)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
                            <span className="text-slate-500">Subtotal</span>
                            <span>R$ {fmt(pedido.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Entrega</span>
                            <span>R$ {fmt(pedido.taxa_entrega)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200 mt-1">
                            <span>Total</span>
                            <span>R$ {fmt(pedido.total)}</span>
                          </div>
                        </div>

                        {pedido.observacoes && (
                          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            💬 {pedido.observacoes}
                          </p>
                        )}

                        {/* Ações */}
                        {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                          <div className="flex gap-2 pt-1">
                            {proximo && (
                              <button
                                onClick={() => avancarStatus(pedido)}
                                disabled={atualizando}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                              >
                                {atualizando
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Check className="w-4 h-4" />}
                                {STATUS_LABELS[proximo]?.label ?? proximo}
                              </button>
                            )}
                            <button
                              onClick={() => cancelarPedido(pedido)}
                              disabled={atualizando}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
