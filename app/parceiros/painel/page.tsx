'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy, Check, LogOut, TrendingUp, Users, DollarSign,
  Clock, CheckCircle2, ExternalLink, Plus, X,
  Phone, StickyNote, Trash2, LayoutGrid, BarChart3,
  Link2, Sparkles, ArrowUpRight,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtCel(s: string | null) {
  if (!s) return ''
  const d = s.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return s
}

// ── constantes ────────────────────────────────────────────────────────────────
const PLANO_PRECO: Record<string, number> = { starter: 397, pro: 597, business: 799, enterprise: 0 }
const PLANO_LABEL: Record<string, string> = { starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' }
const PLANO_COR:   Record<string, string> = { starter: '#64748b', pro: '#1A9B8A', business: '#0f7a6b', enterprise: '#8b5cf6' }

const ETAPAS = [
  { id: 'prospeccao',    label: 'Prospecção',    emoji: '🔍', cor: '#64748b', bg: '#f8fafc' },
  { id: 'contato_ativo', label: 'Contato ativo', emoji: '📞', cor: '#3b82f6', bg: '#eff6ff' },
  { id: 'agendar_demo',  label: 'Agendar demo',  emoji: '📅', cor: '#f59e0b', bg: '#fffbeb' },
  { id: 'fechado',       label: 'Fechado',       emoji: '🏆', cor: '#10b981', bg: '#f0fdf4' },
  { id: 'perdido',       label: 'Perdido',       emoji: '❌', cor: '#ef4444', bg: '#fef2f2' },
]

// ── types ─────────────────────────────────────────────────────────────────────
interface Restaurante {
  id: string; nome_restaurante: string; plano: string
  ativo: boolean; plano_aceito_em: string | null; criado_em: string; status: string
}
interface PainelData {
  parceiro: { nome: string; email: string; codigo_indicacao: string; criado_em: string }
  stats: {
    total_indicados: number; total_ativos: number
    tier: { label: string; recorrente: number } | null
    comissao_impl: number; recorrente_mensal: number; projecao_anual: number
  }
  restaurantes: Restaurante[]
}
interface CrmLead {
  id: string; parceiro_id: string; nome: string; celular: string | null
  plano: string | null; etapa: string; notas: string | null
  criado_em: string; atualizado_em: string
}

// ── modal de lead ─────────────────────────────────────────────────────────────
function LeadModal({ lead, onSave, onDelete, onClose }: {
  lead: Partial<CrmLead> & { etapa: string }
  onSave: (data: Partial<CrmLead>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const [nome,     setNome]    = useState(lead.nome    ?? '')
  const [celular,  setCelular] = useState(lead.celular ?? '')
  const [plano,    setPlano]   = useState(lead.plano   ?? '')
  const [etapa,    setEtapa]   = useState(lead.etapa)
  const [notas,    setNotas]   = useState(lead.notas   ?? '')
  const [saving,   setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isNew = !lead.id

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    await onSave({ nome, celular, plano: plano || null, etapa, notas })
    setSaving(false)
  }
  async function handleDelete() {
    if (!onDelete || !confirm('Remover este lead?')) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const inputCls = 'w-full h-11 px-4 rounded-xl text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 space-y-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-slate-800 font-black text-lg">{isNew ? 'Novo lead' : 'Editar lead'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Nome *</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do restaurante / responsável" className={inputCls} />
          </div>
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Celular</label>
            <input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(00) 00000-0000" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Plano negociado</label>
              <select value={plano} onChange={(e) => setPlano(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-white">
                <option value="">— sem plano —</option>
                {Object.entries(PLANO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}{PLANO_PRECO[k] ? ` · R$${PLANO_PRECO[k]}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Etapa</label>
              <select value={etapa} onChange={(e) => setEtapa(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-white">
                {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações, próximo passo, contexto..." rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-white resize-none" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving || !nome.trim()}
              className="flex-1 h-11 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#1A9B8A' }}>
              {saving ? 'Salvando...' : isNew ? 'Adicionar lead' : 'Salvar alterações'}
            </button>
            {!isNew && onDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="h-11 w-11 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── coluna kanban ─────────────────────────────────────────────────────────────
function KanbanColuna({ etapa, leads, onAdd, onEdit }: {
  etapa: typeof ETAPAS[0]
  leads: CrmLead[]
  onAdd: (id: string) => void
  onEdit: (lead: CrmLead) => void
}) {
  const total = leads.reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)

  return (
    <div className="flex-shrink-0 w-64 flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `2px solid ${etapa.cor}25`, background: etapa.bg }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{etapa.emoji}</span>
            <span className="font-bold text-sm" style={{ color: etapa.cor === '#64748b' ? '#475569' : etapa.cor }}>{etapa.label}</span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${etapa.cor}18`, color: etapa.cor }}>{leads.length}</span>
        </div>
        {total > 0 && (
          <p className="text-xs font-black mt-1" style={{ color: etapa.cor }}>
            {fmt(total)}<span className="font-normal text-slate-400">/mês</span>
          </p>
        )}
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
        {leads.map((lead) => (
          <button key={lead.id} onClick={() => onEdit(lead)}
            className="w-full text-left rounded-xl p-3 bg-white border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.99] group">
            <p className="text-slate-800 font-semibold text-sm leading-tight truncate">{lead.nome}</p>
            {lead.celular && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 text-xs">{fmtCel(lead.celular)}</span>
              </div>
            )}
            {lead.notas && (
              <div className="flex items-start gap-1.5 mt-1.5">
                <StickyNote className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{lead.notas}</span>
              </div>
            )}
            {lead.plano && (
              <div className="mt-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: `${PLANO_COR[lead.plano]}15`, color: PLANO_COR[lead.plano] }}>
                  {PLANO_LABEL[lead.plano]} · {fmt(PLANO_PRECO[lead.plano] ?? 0)}/mês
                </span>
              </div>
            )}
          </button>
        ))}
        <button onClick={() => onAdd(etapa.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-slate-400 hover:text-teal-600 hover:bg-teal-50 border border-dashed border-slate-200 hover:border-teal-300 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>
    </div>
  )
}

// ── CRM Board ─────────────────────────────────────────────────────────────────
function CrmBoard() {
  const [leads,   setLeads]   = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<{ lead: Partial<CrmLead> & { etapa: string } } | null>(null)

  useEffect(() => { carregarLeads() }, [])

  async function carregarLeads() {
    setLoading(true)
    const res = await fetch('/api/parceiros/crm')
    const data = await res.json()
    setLeads(data.leads ?? [])
    setLoading(false)
  }

  async function salvar(dados: Partial<CrmLead>) {
    if (modal?.lead.id) {
      const res = await fetch('/api/parceiros/crm', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modal.lead.id, ...dados }) })
      if (res.ok) { const { lead } = await res.json(); setLeads((p) => p.map((l) => l.id === lead.id ? lead : l)) }
    } else {
      const res = await fetch('/api/parceiros/crm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      if (res.ok) { const { lead } = await res.json(); setLeads((p) => [lead, ...p]) }
    }
    setModal(null)
  }

  async function deletar() {
    if (!modal?.lead.id) return
    const res = await fetch('/api/parceiros/crm', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modal.lead.id }) })
    if (res.ok) { setLeads((p) => p.filter((l) => l.id !== modal.lead.id)); setModal(null) }
  }

  const totalPipeline = leads.filter((l) => l.etapa !== 'perdido').reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)
  const totalFechado  = leads.filter((l) => l.etapa === 'fechado').reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)
  const taxaFechamento = leads.length > 0 ? Math.round((leads.filter((l) => l.etapa === 'fechado').length / leads.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Carregando CRM...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline total',   value: fmt(totalPipeline), sub: '/mês em negociação', icon: BarChart3,    from: '#1A9B8A', to: '#0f7a6b' },
          { label: 'Fechados',         value: fmt(totalFechado),  sub: '/mês ganho',         icon: CheckCircle2, from: '#10b981', to: '#059669' },
          { label: 'Leads ativos',     value: String(leads.filter((l) => l.etapa !== 'perdido').length), sub: 'no funil', icon: Users, from: '#3b82f6', to: '#2563eb' },
          { label: 'Taxa fechamento',  value: `${taxaFechamento}%`, sub: 'do total',          icon: TrendingUp,   from: '#f59e0b', to: '#d97706' },
        ].map(({ label, value, sub, icon: Icon, from, to }) => (
          <div key={label} className="rounded-2xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70 text-xs font-semibold">{label}</p>
              <Icon className="w-4 h-4 text-white/60" />
            </div>
            <p className="text-white font-black text-2xl leading-none">{value}</p>
            <p className="text-white/60 text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6">
        <div className="flex gap-4" style={{ minWidth: `${ETAPAS.length * 272}px` }}>
          {ETAPAS.map((etapa) => (
            <KanbanColuna key={etapa.id} etapa={etapa}
              leads={leads.filter((l) => l.etapa === etapa.id)}
              onAdd={(id) => setModal({ lead: { etapa: id } })}
              onEdit={(lead) => setModal({ lead })} />
          ))}
        </div>
      </div>

      {modal && (
        <LeadModal lead={modal.lead} onSave={salvar}
          onDelete={modal.lead.id ? deletar : undefined}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardParceiro({ data }: { data: PainelData }) {
  const { parceiro, stats, restaurantes } = data
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menue.com.br'
  const [copied, setCopied] = useState(false)
  const linkRef = `${APP_URL}/registro?ref=${parceiro.codigo_indicacao}`
  const tierPct = stats.tier ? (stats.tier.recorrente * 100).toFixed(0) + '%' : '—'

  function copiarLink() {
    navigator.clipboard.writeText(linkRef)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">

      {/* Banner do link — gradiente teal */}
      <div className="rounded-2xl p-6 text-white shadow-sm overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f3d35 0%, #1A9B8A 100%)' }}>
        {/* glow decorativo */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-teal-300" />
            <p className="text-teal-200 text-xs font-bold uppercase tracking-widest">Seu link de indicação</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-mono text-teal-100 truncate"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {linkRef}
            </div>
            <button onClick={copiarLink}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black shrink-0 transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: copied ? '#16a34a' : 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
            </button>
          </div>
          <p className="text-teal-300/70 text-xs mt-3">
            Código: <span className="font-bold text-teal-200">{parceiro.codigo_indicacao}</span>
            {' '} · Parceiro desde {fmtData(parceiro.criado_em)}
          </p>
        </div>
      </div>

      {/* Stats — cards coloridos com gradiente */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: 'Indicados',      value: String(stats.total_indicados), sub: 'total cadastrado', from: '#1A9B8A', to: '#0f7a6b' },
          { icon: CheckCircle2, label: 'Ativos',         value: String(stats.total_ativos),    sub: 'com plano pago',   from: '#10b981', to: '#059669' },
          { icon: TrendingUp,   label: 'Seu tier',       value: tierPct, sub: stats.tier?.label ?? 'nenhum ativo',      from: '#f59e0b', to: '#d97706' },
          { icon: DollarSign,   label: 'Recorrente/mês', value: fmt(stats.recorrente_mensal), sub: 'estimativa atual',  from: '#8b5cf6', to: '#7c3aed' },
        ].map(({ icon: Icon, label, value, sub, from, to }) => (
          <div key={label} className="rounded-2xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70 text-xs font-semibold">{label}</p>
              <Icon className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-white font-black text-2xl leading-none">{value}</p>
            <p className="text-white/60 text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Comissões */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <p className="text-slate-700 font-bold text-sm">Comissões</p>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Implementação */}
          <div className="p-6">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Por implementação</p>
            <p className="text-slate-800 font-black text-3xl">{fmt(stats.comissao_impl)}</p>
            <p className="text-slate-400 text-xs mt-2">{stats.total_ativos} cliente{stats.total_ativos !== 1 ? 's' : ''} × R$600</p>
            <p className="text-slate-300 text-xs mt-0.5">30% de R$2.000 por restaurante</p>
          </div>
          {/* Recorrente */}
          <div className="p-6">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-wider mb-3">Recorrente / mês</p>
            <p className="font-black text-3xl" style={{ color: '#1A9B8A' }}>{fmt(stats.recorrente_mensal)}</p>
            <p className="text-slate-400 text-xs mt-2">{stats.total_ativos} × R$597 × {tierPct}</p>
            <p className="text-slate-300 text-xs mt-0.5">Tier: {stats.tier?.label ?? '—'}</p>
          </div>
          {/* Projeção */}
          <div className="p-6" style={{ background: 'linear-gradient(135deg, #f0fafa, #e6f7f5)' }}>
            <p className="text-teal-700 text-xs font-bold uppercase tracking-wider mb-3">Projeção 1º ano</p>
            <p className="font-black text-3xl" style={{ color: '#0f7a6b' }}>{fmt(stats.projecao_anual)}</p>
            <p className="text-teal-600/60 text-xs mt-2">Implementação + recorrente × 12</p>
            <div className="flex items-center gap-1 mt-1.5">
              <ArrowUpRight className="w-3 h-3 text-teal-500" />
              <p className="text-teal-600 text-xs font-semibold">Sem limite de clientes</p>
            </div>
          </div>
        </div>
        {stats.total_ativos === 0 && (
          <div className="mx-6 mb-5 rounded-xl px-4 py-3 text-sm text-amber-700 bg-amber-50 border border-amber-200">
            💡 As comissões serão calculadas assim que seus primeiros indicados ativarem um plano pago.
          </div>
        )}
      </div>

      {/* Restaurantes indicados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <p className="text-slate-700 font-bold text-sm">Restaurantes indicados</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{restaurantes.length}</span>
        </div>

        {restaurantes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-slate-600 font-semibold text-sm">Nenhum restaurante indicado ainda</p>
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
              Compartilhe seu link de indicação para começar a ganhar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {restaurantes.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.ativo ? 'bg-teal-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-semibold text-sm truncate">{r.nome_restaurante}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Indicado em {fmtData(r.criado_em)}
                    {r.plano_aceito_em && ` · Ativo desde ${fmtData(r.plano_aceito_em)}`}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg capitalize shrink-0"
                  style={{ background: r.ativo ? 'rgba(26,155,138,0.1)' : '#f1f5f9', color: r.ativo ? '#1A9B8A' : '#64748b' }}>
                  {r.ativo ? r.plano : 'Trial / Pendente'}
                </span>
                {r.ativo
                  ? <div className="flex items-center gap-1 text-teal-600 text-xs font-semibold shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> Ativo</div>
                  : <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0"><Clock className="w-3.5 h-3.5" /> Pendente</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-4 space-y-1.5">
        <p className="text-slate-400 text-xs">
          Dúvidas?{' '}
          <a href={`https://wa.me/5547988194822?text=${encodeURIComponent(`Olá! Sou parceiro Menuê+ (${parceiro.codigo_indicacao}) e tenho uma dúvida sobre minhas comissões.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 underline underline-offset-2 inline-flex items-center gap-1 transition-colors">
            Fale com a gente no WhatsApp <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <p className="text-slate-300 text-xs">
          * Estimativas com base na mensalidade média de R$597. Valores reais dependem do plano de cada cliente.
        </p>
      </div>
    </div>
  )
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function ParceiroPainelPage() {
  const router = useRouter()
  const [data,    setData]    = useState<PainelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba,     setAba]     = useState<'dashboard' | 'crm'>('dashboard')

  useEffect(() => {
    fetch('/api/parceiros/painel')
      .then((r) => { if (r.status === 401) { router.push('/parceiros/login'); return null } return r.json() })
      .then((d) => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [router])

  async function sair() {
    await fetch('/api/parceiros/auth', { method: 'DELETE' })
    router.push('/parceiros/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Carregando painel...</span>
        </div>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER — igual ao painel de gestão */}
      <header className="bg-teal-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

          {/* Logo + nome */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-black tracking-widest text-xs uppercase text-teal-400 leading-none">Menuê+</span>
              <span className="text-white text-xs font-semibold mt-0.5 truncate max-w-[160px]">
                Olá, {data.parceiro.nome.split(' ')[0]}!
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setAba('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                aba === 'dashboard' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-teal-800 hover:text-white'
              }`}>
              Dashboard
            </button>
            <button onClick={() => setAba('crm')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                aba === 'crm' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-teal-800 hover:text-white'
              }`}>
              <LayoutGrid className="w-3.5 h-3.5" /> CRM
            </button>
          </div>

          {/* Sair */}
          <button onClick={sair}
            className="flex items-center gap-2 text-teal-600 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {aba === 'dashboard' ? <DashboardParceiro data={data} /> : <CrmBoard />}
      </main>
    </div>
  )
}
