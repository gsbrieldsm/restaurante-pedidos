'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy, Check, LogOut, TrendingUp, Users, DollarSign,
  Clock, CheckCircle2, ExternalLink, Plus, X,
  Phone, StickyNote, Trash2, LayoutGrid,
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
const PLANO_PRECO: Record<string, number> = {
  starter: 397, pro: 597, business: 799, enterprise: 0,
}
const PLANO_LABEL: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}
const PLANO_COR: Record<string, string> = {
  starter: '#64748b', pro: '#1A9B8A', business: '#0f7a6b', enterprise: '#8b5cf6',
}

const ETAPAS = [
  { id: 'prospeccao',    label: 'Prospecção',    emoji: '🔍', cor: '#64748b' },
  { id: 'contato_ativo', label: 'Contato ativo', emoji: '📞', cor: '#3b82f6' },
  { id: 'agendar_demo',  label: 'Agendar demo',  emoji: '📅', cor: '#f59e0b' },
  { id: 'fechado',       label: 'Fechado',       emoji: '🏆', cor: '#10b981' },
  { id: 'perdido',       label: 'Perdido',       emoji: '❌', cor: '#ef4444' },
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
function LeadModal({
  lead, onSave, onDelete, onClose,
}: {
  lead: Partial<CrmLead> & { etapa: string }
  onSave: (data: Partial<CrmLead>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const [nome,    setNome]    = useState(lead.nome    ?? '')
  const [celular, setCelular] = useState(lead.celular ?? '')
  const [plano,   setPlano]   = useState(lead.plano   ?? '')
  const [etapa,   setEtapa]   = useState(lead.etapa)
  const [notas,   setNotas]   = useState(lead.notas   ?? '')
  const [saving,  setSaving]  = useState(false)
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
    if (!onDelete) return
    if (!confirm('Remover este lead?')) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 space-y-5 shadow-2xl">

        <div className="flex items-center justify-between">
          <h3 className="text-slate-800 font-black text-lg">{isNew ? 'Novo lead' : 'Editar lead'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Nome *</label>
            <input
              required value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do restaurante / responsável"
              className="w-full h-11 px-4 rounded-xl text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-slate-50"
            />
          </div>

          {/* Celular */}
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Celular</label>
            <input
              value={celular} onChange={(e) => setCelular(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full h-11 px-4 rounded-xl text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-slate-50"
            />
          </div>

          {/* Plano + Etapa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Plano negociado</label>
              <select
                value={plano} onChange={(e) => setPlano(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-slate-50"
              >
                <option value="">— sem plano —</option>
                {Object.entries(PLANO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}{PLANO_PRECO[k] ? ` · R$${PLANO_PRECO[k]}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Etapa</label>
              <select
                value={etapa} onChange={(e) => setEtapa(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-slate-50"
              >
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-slate-600 text-xs font-semibold mb-1.5 block">Notas</label>
            <textarea
              value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações, próximo passo, contexto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-teal-400 border border-slate-200 bg-slate-50 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit" disabled={saving || !nome.trim()}
              className="flex-1 h-11 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#1A9B8A' }}
            >
              {saving ? 'Salvando...' : isNew ? 'Adicionar lead' : 'Salvar alterações'}
            </button>
            {!isNew && onDelete && (
              <button
                type="button" onClick={handleDelete} disabled={deleting}
                className="h-11 w-11 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
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
function KanbanColuna({
  etapa, leads, onAdd, onEdit,
}: {
  etapa: typeof ETAPAS[0]
  leads: CrmLead[]
  onAdd: (etapaId: string) => void
  onEdit: (lead: CrmLead) => void
}) {
  const total = leads.reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)

  return (
    <div className="flex-shrink-0 w-64 flex flex-col rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
      {/* header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{etapa.emoji}</span>
            <span className="text-slate-700 font-bold text-sm">{etapa.label}</span>
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${etapa.cor}18`, color: etapa.cor }}
          >
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-xs font-black mt-1" style={{ color: etapa.cor }}>
            {fmt(total)}<span className="font-normal text-slate-400">/mês</span>
          </p>
        )}
      </div>

      {/* cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
        {leads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => onEdit(lead)}
            className="w-full text-left rounded-xl p-3 bg-white border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all active:scale-[0.99]"
          >
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
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: `${PLANO_COR[lead.plano]}12`, color: PLANO_COR[lead.plano] }}
                >
                  {PLANO_LABEL[lead.plano]} · {fmt(PLANO_PRECO[lead.plano] ?? 0)}/mês
                </span>
              </div>
            )}
          </button>
        ))}

        <button
          onClick={() => onAdd(etapa.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-slate-400 hover:text-teal-600 hover:bg-teal-50 border border-dashed border-slate-200 hover:border-teal-300 transition-colors"
        >
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
    const res  = await fetch('/api/parceiros/crm')
    const data = await res.json()
    setLeads(data.leads ?? [])
    setLoading(false)
  }

  async function salvar(dados: Partial<CrmLead>) {
    if (modal?.lead.id) {
      const res = await fetch('/api/parceiros/crm', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modal.lead.id, ...dados }),
      })
      if (res.ok) {
        const { lead } = await res.json()
        setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l))
      }
    } else {
      const res = await fetch('/api/parceiros/crm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      if (res.ok) {
        const { lead } = await res.json()
        setLeads((prev) => [lead, ...prev])
      }
    }
    setModal(null)
  }

  async function deletar() {
    if (!modal?.lead.id) return
    const res = await fetch('/api/parceiros/crm', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modal.lead.id }),
    })
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== modal.lead.id))
      setModal(null)
    }
  }

  const totalPipeline = leads.filter((l) => l.etapa !== 'perdido')
    .reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)
  const totalFechado  = leads.filter((l) => l.etapa === 'fechado')
    .reduce((s, l) => s + (l.plano ? (PLANO_PRECO[l.plano] ?? 0) : 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-teal-600">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Carregando CRM...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline total',    value: fmt(totalPipeline), sub: '/mês em negociação',  cor: '#1A9B8A', bg: '#f0fafa', border: '#b2dfdb' },
          { label: 'Fechados',          value: fmt(totalFechado),  sub: '/mês ganho',          cor: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Leads ativos',      value: String(leads.filter((l) => l.etapa !== 'perdido').length), sub: 'no funil', cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
          {
            label: 'Taxa fechamento',
            value: `${leads.length > 0 ? Math.round((leads.filter((l) => l.etapa === 'fechado').length / leads.length) * 100) : 0}%`,
            sub: 'do total', cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0',
          },
        ].map(({ label, value, sub, cor, bg, border }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: cor }}>{label}</p>
            <p className="text-slate-800 font-black text-xl">{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${ETAPAS.length * 272}px` }}>
          {ETAPAS.map((etapa) => (
            <KanbanColuna
              key={etapa.id}
              etapa={etapa}
              leads={leads.filter((l) => l.etapa === etapa.id)}
              onAdd={(id) => setModal({ lead: { etapa: id } })}
              onEdit={(lead) => setModal({ lead })}
            />
          ))}
        </div>
      </div>

      {modal && (
        <LeadModal
          lead={modal.lead}
          onSave={salvar}
          onDelete={modal.lead.id ? deletar : undefined}
          onClose={() => setModal(null)}
        />
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
    <div className="space-y-8">
      {/* Link */}
      <div className="rounded-2xl p-6 bg-teal-50 border border-teal-100">
        <p className="text-teal-700 text-xs font-bold uppercase tracking-widest mb-3">🔗 Seu link de indicação</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-mono text-slate-700 truncate bg-white border border-teal-200">
            {linkRef}
          </div>
          <button
            onClick={copiarLink}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shrink-0"
            style={{ background: copied ? '#16a34a' : '#1A9B8A' }}
          >
            {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
          </button>
        </div>
        <p className="text-teal-600 text-xs mt-3">
          Código: <span className="font-bold text-teal-700">{parceiro.codigo_indicacao}</span>
          {' '} · Parceiro desde {fmtData(parceiro.criado_em)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: 'Indicados',      value: String(stats.total_indicados), sub: 'total cadastrado', cor: '#64748b' },
          { icon: CheckCircle2, label: 'Ativos',         value: String(stats.total_ativos),    sub: 'com plano pago',   cor: '#1A9B8A' },
          { icon: TrendingUp,   label: 'Seu tier',       value: tierPct, sub: stats.tier?.label ?? (stats.total_ativos === 0 ? 'nenhum ativo' : ''), cor: '#f59e0b' },
          { icon: DollarSign,   label: 'Recorrente/mês', value: fmt(stats.recorrente_mensal), sub: 'estimativa atual',  cor: '#10b981' },
        ].map(({ icon: Icon, label, value, sub, cor }) => (
          <div key={label} className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4" style={{ color: cor }} />
              <p className="text-slate-500 text-xs font-semibold">{label}</p>
            </div>
            <p className="text-slate-800 font-black text-2xl leading-none">{value}</p>
            <p className="text-slate-400 text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Comissões */}
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">💰 Comissões</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Por implementação</p>
            <p className="text-slate-800 font-black text-2xl">{fmt(stats.comissao_impl)}</p>
            <p className="text-slate-400 text-xs mt-1">{stats.total_ativos} × R$600 (30% de R$2.000)</p>
          </div>
          <div className="rounded-2xl p-6 bg-teal-50 border border-teal-100">
            <p className="text-teal-700 text-xs font-bold uppercase tracking-wider mb-3">Recorrente / mês</p>
            <p className="font-black text-2xl" style={{ color: '#1A9B8A' }}>{fmt(stats.recorrente_mensal)}</p>
            <p className="text-slate-400 text-xs mt-1">{stats.total_ativos} × R$597 × {tierPct}</p>
          </div>
          <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}>
            <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-3">Projeção 1º ano</p>
            <p className="text-white font-black text-2xl">{fmt(stats.projecao_anual)}</p>
            <p className="text-teal-200/70 text-xs mt-1">impl. + recorrente × 12 meses</p>
          </div>
        </div>
        {stats.total_ativos === 0 && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm text-amber-700 leading-relaxed bg-amber-50 border border-amber-200">
            💡 As comissões serão calculadas assim que seus primeiros indicados ativarem um plano pago.
          </div>
        )}
      </div>

      {/* Restaurantes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">🏪 Restaurantes indicados</p>
          <p className="text-slate-400 text-xs">{restaurantes.length} total</p>
        </div>
        {restaurantes.length === 0 ? (
          <div className="rounded-2xl p-10 text-center bg-slate-50 border border-dashed border-slate-200">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-slate-600 font-semibold text-sm">Nenhum restaurante indicado ainda</p>
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
              Compartilhe seu link de indicação para começar a ganhar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurantes.map((r) => (
              <div key={r.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-white border border-slate-200 shadow-sm">
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
                <div className="shrink-0">
                  {r.ativo
                    ? <div className="flex items-center gap-1 text-teal-600 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Ativo</div>
                    : <div className="flex items-center gap-1 text-slate-400 text-xs"><Clock className="w-3.5 h-3.5" /> Pendente</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-2 pb-6 space-y-2">
        <p className="text-slate-400 text-xs">
          Dúvidas?{' '}
          <a href={`https://wa.me/5547988194822?text=${encodeURIComponent(`Olá! Sou parceiro Menuê+ (${parceiro.codigo_indicacao}) e tenho uma dúvida sobre minhas comissões.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 underline underline-offset-2 transition-colors inline-flex items-center gap-1">
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
      .then((r) => {
        if (r.status === 401) { router.push('/parceiros/login'); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [router])

  async function sair() {
    await fetch('/api/parceiros/auth', { method: 'DELETE' })
    router.push('/parceiros/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-teal-600">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Carregando painel...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-slate-50">

      {/* TOP BAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

          {/* Logo + nome */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1A9B8A' }}>
              <span className="text-white font-black text-sm">M+</span>
            </div>
            <div>
              <p className="text-slate-800 font-bold text-sm leading-none">Olá, {data.parceiro.nome.split(' ')[0]}!</p>
              <p className="text-teal-600 text-xs mt-0.5 font-medium">Painel do Parceiro</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
            <button
              onClick={() => setAba('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                aba === 'dashboard'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAba('crm')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                aba === 'crm'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> CRM
            </button>
          </div>

          {/* Sair */}
          <button
            onClick={sair}
            className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {aba === 'dashboard'
          ? <DashboardParceiro data={data} />
          : <CrmBoard />
        }
      </main>
    </div>
  )
}
