'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, Users, TrendingUp, DollarSign, Store,
  ExternalLink, ShieldOff, ShieldCheck, Settings2,
  RefreshCw, Handshake, ChevronDown, CreditCard,
  Gauge, HeadphonesIcon, Menu, X, Copy, Check, Link2,
  Banknote, History, CheckCircle2, CircleDashed, Trash2, ChevronRight,
  AlertTriangle, BadgeCheck, Clock, Lightbulb, Bug, HelpCircle, MessageCircle,
  InboxIcon, PlayCircle, PlusCircle, Pencil, Eye, EyeOff,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type RestauranteIndicado = {
  id:              string
  nome_restaurante: string
  plano:           string
  plano_aceito_em: string | null
  criado_em:       string
}

type Pagamento = {
  id:          string
  parceiro_id: string
  tenant_id:   string | null
  tipo:        'implementacao' | 'recorrente'
  valor:       number
  referencia:  string
  observacao:  string | null
  pago_em:     string
}

type Parceiro = {
  id:                    string
  nome:                  string
  email:                 string
  whatsapp:              string
  cidade:                string | null
  como:                  string | null
  status:                'novo' | 'contactado' | 'aprovado' | 'recusado'
  notas:                 string | null
  criado_em:             string
  codigo_indicacao:      string | null
  chave_pix:             string | null
  restaurantes_indicados: RestauranteIndicado[]
}

type Tenant = {
  id: string
  slug: string
  nome: string
  nome_restaurante: string
  email: string
  status: 'ativo' | 'suspenso'
  plano: string
  plano_aceito_em: string | null
  trial_expira_em: string | null
  criado_em: string
  total_mesas: number
  total_pedidos: number
  faturamento_total: number
  total_sessoes: number
  impl_cobrada: boolean
}

type Chamado = {
  id:              string
  tipo:            'sugestao' | 'bug' | 'duvida' | 'outro'
  mensagem:        string
  anonimo:         boolean
  nome_autor:      string | null
  status:          'aberto' | 'em_analise' | 'resolvido' | 'fechado'
  criado_em:       string
  tenants:         { nome_restaurante: string } | null
}

type Aba = 'assinaturas' | 'performance' | 'suporte' | 'parceiros' | 'tutoriais'

// ── Types de Performance ───────────────────────────────────────────────────
type PerfData = {
  pulso: {
    pedidos_hoje: number; volume_hoje: number
    pedidos_7d: number;   volume_7d: number
    sessoes_abertas: number; sessoes_7d: number
    novos_tenants_7d: number
  }
  saude: {
    em_risco:         { id: string; nome_restaurante: string; email: string; plano: string; ultimo_pedido: string | null }[]
    trial_expirando:  { id: string; nome_restaurante: string; email: string; trial_expira_em: string; dias_restantes: number }[]
  }
  top_tenants: { id: string; nome_restaurante: string; pedidos_7d: number; volume_7d: number; sessoes_7d: number }[]
  crescimento: { label: string; tenants: number; pedidos: number }[]
  atividade_tenants: { id: string; nome_restaurante: string; plano: string; ultimo_pedido: string | null; pedidos_7d: number; sessoes_abertas: number }[]
}

// ── Constantes ──────────────────────────────────────────────────────────────
const MENSALIDADE   = 550
const IMPLEMENTACAO = 2000

const PLANOS_DISPONIVEIS = [
  { id: 'free',       nome: '🎁 Free',    preco: 0   },   // só visível no superadmin
  { id: 'starter',    nome: 'Starter',    preco: 397  },
  { id: 'pro',        nome: 'Pro',        preco: 697  },
  { id: 'business',   nome: 'Business',   preco: 1197 },
  { id: 'enterprise', nome: 'Enterprise', preco: 0   },   // negociado individualmente
]
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL   ?? 'https://menue.com.br'
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'menue.com.br'

const TIERS_COMISSAO = [
  { min: 1,  max: 4,  pct: 0.10, label: '10%' },
  { min: 5,  max: 9,  pct: 0.15, label: '15%' },
  { min: 10, max: 14, pct: 0.20, label: '20%' },
  { min: 15, max: 19, pct: 0.25, label: '25%' },
  { min: 20, max: Infinity, pct: 0.30, label: '30%' },
]

function calcComissao(qtd: number) {
  const tier = TIERS_COMISSAO.find(t => qtd >= t.min && qtd <= t.max) ?? TIERS_COMISSAO[0]
  return {
    pct:       tier.pct,
    label:     tier.label,
    mensal:    Math.round(qtd * MENSALIDADE * tier.pct),
    impl:      Math.round(qtd * IMPLEMENTACAO * 0.30),
  }
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const STATUS_PARCEIRO: Record<string, { label: string; cor: string; bg: string }> = {
  novo:       { label: 'Novo',       cor: '#0284c7', bg: '#e0f2fe' },
  contactado: { label: 'Contactado', cor: '#d97706', bg: '#fef3c7' },
  aprovado:   { label: 'Aprovado',   cor: '#16a34a', bg: '#dcfce7' },
  recusado:   { label: 'Recusado',   cor: '#dc2626', bg: '#fee2e2' },
}

const COMO_LABEL: Record<string, string> = {
  rede_pessoal:  'Rede pessoal',
  redes_sociais: 'Redes sociais',
  consultor:     'Consultor',
  agencia:       'Agência',
  outro:         'Outro',
}

const NAV: { id: Aba; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'assinaturas', label: 'Controle de assinatura', icon: CreditCard },
  { id: 'performance', label: 'Performance do sistema', icon: Gauge },
  { id: 'suporte',     label: 'Chamados & Suporte',     icon: HeadphonesIcon },
  { id: 'parceiros',   label: 'Parceiros',              icon: Handshake },
  { id: 'tutoriais',  label: 'Tutoriais de Suporte',   icon: PlayCircle },
]

// ── Componente principal ───────────────────────────────────────────────────
export default function SuperAdminPage() {
  const router = useRouter()
  const [aba,          setAba]          = useState<Aba>('assinaturas')
  const [tenants,      setTenants]      = useState<Tenant[]>([])
  const [parceiros,    setParceiros]    = useState<Parceiro[]>([])
  const [carregando,   setCarregando]   = useState(true)
  const [atualizando,  setAtualizando]  = useState<string | null>(null)
  const [inicializando,setInicializando]= useState<string | null>(null)
  const [statusEdit,   setStatusEdit]   = useState<string | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [copiado,      setCopiado]      = useState<string | null>(null)
  const [expandido,    setExpandido]    = useState<string | null>(null)
  const [pagamentos,   setPagamentos]   = useState<Record<string, Pagamento[]>>({})
  const [confirmDelete,  setConfirmDelete]  = useState<Tenant | null>(null)
  const [deletando,      setDeletando]      = useState(false)
  const [confirmDeleteParceiro, setConfirmDeleteParceiro] = useState<Parceiro | null>(null)
  const [deletandoParceiro,     setDeletandoParceiro]     = useState(false)
  const [ativando,       setAtivando]       = useState<string | null>(null)
  const [editandoPlano, setEditandoPlano] = useState<string | null>(null)
  const [trocandoPlano, setTrocandoPlano] = useState<string | null>(null)
  const [togglingImpl, setTogglingImpl]   = useState<string | null>(null)
  const [pagandoId,    setPagandoId]    = useState<string | null>(null)
  const [mesRef,       setMesRef]       = useState(() => {
    const d = new Date(); return `${d.toLocaleString('pt-BR', { month: 'long' })} ${d.getFullYear()}`
  })
  const [perfData,     setPerfData]     = useState<PerfData | null>(null)
  const [perfLoading,  setPerfLoading]  = useState(false)
  const [chamados,     setChamados]     = useState<Chamado[]>([])
  const [chamadosLoading, setChamadosLoading] = useState(false)
  const [atualizandoChamado, setAtualizandoChamado] = useState<string | null>(null)

  // ── Tutoriais ──────────────────────────────────────────────────────────────
  interface VideoTutorial { id: string; titulo: string; descricao: string | null; youtube_id: string; categoria: string; ordem: number; ativo: boolean }
  const [videos,           setVideos]           = useState<VideoTutorial[]>([])
  const [videosLoading,    setVideosLoading]     = useState(false)
  const [videoForm,        setVideoForm]         = useState({ titulo: '', descricao: '', youtube_id: '', categoria: 'geral', ordem: 0 })
  const [videoEditando,    setVideoEditando]     = useState<VideoTutorial | null>(null)
  const [videoSalvando,    setVideoSalvando]     = useState(false)
  const [videoDeletando,   setVideoDeletando]    = useState<string | null>(null)

  const CATEGORIAS_VIDEO = ['geral','cardapio','mesas','pedidos','garcom','estacoes','financeiro','equipe','configuracoes']

  useEffect(() => {
    document.title = 'Master — Menuê+'
    carregar()
  }, [])

  useEffect(() => {
    if (aba === 'performance' && !perfData && !perfLoading) {
      carregarPerformance()
    }
  }, [aba, perfData, perfLoading])

  useEffect(() => {
    if (aba === 'suporte' && chamados.length === 0 && !chamadosLoading) {
      carregarChamados()
    }
  }, [aba, chamados.length, chamadosLoading])

  useEffect(() => {
    if (aba === 'tutoriais' && videos.length === 0 && !videosLoading) {
      carregarVideos()
    }
  }, [aba, videos.length, videosLoading])

  async function carregarVideos() {
    setVideosLoading(true)
    try {
      const res  = await fetch('/api/superadmin/suporte')
      const data = await res.json()
      if (res.ok) setVideos(data.videos ?? [])
    } catch {}
    setVideosLoading(false)
  }

  async function salvarVideo() {
    setVideoSalvando(true)
    try {
      const url    = videoEditando ? '/api/superadmin/suporte' : '/api/superadmin/suporte'
      const method = videoEditando ? 'PATCH' : 'POST'
      const body   = videoEditando
        ? { id: videoEditando.id, ...videoForm }
        : videoForm
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok) {
        setVideoEditando(null)
        setVideoForm({ titulo: '', descricao: '', youtube_id: '', categoria: 'geral', ordem: 0 })
        await carregarVideos()
      } else {
        alert(data.error ?? 'Erro ao salvar.')
      }
    } catch {}
    setVideoSalvando(false)
  }

  async function toggleAtivoVideo(v: VideoTutorial) {
    await fetch('/api/superadmin/suporte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, ativo: !v.ativo }),
    })
    await carregarVideos()
  }

  async function deletarVideo(id: string) {
    setVideoDeletando(id)
    await fetch(`/api/superadmin/suporte?id=${id}`, { method: 'DELETE' })
    setVideos(v => v.filter(x => x.id !== id))
    setVideoDeletando(null)
  }

  function iniciarEdicao(v: VideoTutorial) {
    setVideoEditando(v)
    setVideoForm({ titulo: v.titulo, descricao: v.descricao ?? '', youtube_id: v.youtube_id, categoria: v.categoria, ordem: v.ordem })
  }

  async function carregarChamados() {
    setChamadosLoading(true)
    try {
      const res  = await fetch('/api/superadmin/chamados')
      const data = await res.json()
      if (res.ok) setChamados(data.chamados ?? [])
    } catch {}
    setChamadosLoading(false)
  }

  async function atualizarStatusChamado(id: string, status: string) {
    setAtualizandoChamado(id)
    await fetch('/api/superadmin/chamados', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status }),
    })
    setChamados((prev) => prev.map((c) => c.id === id ? { ...c, status: status as Chamado['status'] } : c))
    setAtualizandoChamado(null)
  }

  async function carregarPerformance() {
    setPerfLoading(true)
    try {
      const res  = await fetch('/api/superadmin/performance')
      const data = await res.json()
      if (res.ok) setPerfData(data)
    } catch {}
    setPerfLoading(false)
  }

  async function carregar() {
    setCarregando(true)
    try {
      const resTenants = await fetch('/api/superadmin/tenants')
      if (resTenants.status === 401) { router.push('/superadmin/login'); return }
      const { tenants } = await resTenants.json()
      setTenants(tenants ?? [])
    } catch (e) { console.error(e) }

    try {
      const res = await fetch('/api/superadmin/parceiros')
      if (res.ok) {
        const data = await res.json()
        setParceiros(data.parceiros ?? [])
      }
    } catch (e) { console.error(e) }

    setCarregando(false)
  }

  async function forcarSetup(tenant: Tenant) {
    setInicializando(tenant.id)
    const res = await fetch('/api/superadmin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, acao: 'setup' }),
    })
    const data = await res.json()
    if (data.ok) {
      setTenants((prev) => prev.map((t) => t.id === tenant.id
        ? { ...t, total_mesas: data.ja_configurado ? t.total_mesas : 10 } : t))
    }
    setInicializando(null)
  }

  async function toggleStatus(tenant: Tenant) {
    const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
    setAtualizando(tenant.id)
    await fetch('/api/superadmin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, status: novoStatus }),
    })
    setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, status: novoStatus } : t))
    setAtualizando(null)
  }

  async function excluirTenant(tenant: Tenant) {
    setDeletando(true)
    const res = await fetch(`/api/superadmin/tenants?id=${tenant.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id))
    }
    setDeletando(false)
    setConfirmDelete(null)
  }

  async function excluirParceiro(parceiro: Parceiro) {
    setDeletandoParceiro(true)
    const res = await fetch(`/api/superadmin/parceiros?id=${parceiro.id}`, { method: 'DELETE' })
    if (res.ok) {
      setParceiros((prev) => prev.filter((p) => p.id !== parceiro.id))
    }
    setDeletandoParceiro(false)
    setConfirmDeleteParceiro(null)
  }

  async function trocarPlano(tenant: Tenant, novoPlano: string) {
    if (novoPlano === tenant.plano) { setEditandoPlano(null); return }
    setTrocandoPlano(tenant.id)
    await fetch('/api/superadmin/tenants', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: tenant.id, acao: 'trocar_plano', plano: novoPlano }),
    })
    setTenants((prev) => prev.map((t) =>
      t.id === tenant.id ? { ...t, plano: novoPlano } : t
    ))
    setTrocandoPlano(null)
    setEditandoPlano(null)
  }

  async function ativarPlano(tenant: Tenant) {
    setAtivando(tenant.id)
    await fetch('/api/superadmin/tenants', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: tenant.id, acao: 'ativar_plano' }),
    })
    setTenants((prev) => prev.map((t) =>
      t.id === tenant.id ? { ...t, trial_expira_em: null, status: 'ativo' } : t
    ))
    setAtivando(null)
  }

  async function toggleImpl(tenant: Tenant) {
    setTogglingImpl(tenant.id)
    const novo = !tenant.impl_cobrada
    await fetch('/api/superadmin/tenants', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: tenant.id, acao: 'toggle_impl', impl_cobrada: novo }),
    })
    setTenants((prev) => prev.map((t) =>
      t.id === tenant.id ? { ...t, impl_cobrada: novo } : t
    ))
    setTogglingImpl(null)
  }

  async function atualizarStatusParceiro(id: string, status: string) {
    setStatusEdit(id)
    const res = await fetch('/api/superadmin/parceiros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    setParceiros((prev) => prev.map((p) => p.id === id ? {
      ...p,
      status: status as Parceiro['status'],
      codigo_indicacao: data.parceiro?.codigo_indicacao ?? p.codigo_indicacao,
    } : p))
    setStatusEdit(null)
  }

  function copiarLink(codigo: string) {
    const link = `${APP_URL}/registro?ref=${codigo}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopiado(codigo)
    setTimeout(() => setCopiado(null), 2000)
  }

  async function carregarPagamentos(parceiroId: string) {
    if (pagamentos[parceiroId]) return // já carregado
    const res = await fetch(`/api/superadmin/pagamentos?parceiro_id=${parceiroId}`)
    if (res.ok) {
      const data = await res.json()
      setPagamentos(prev => ({ ...prev, [parceiroId]: data.pagamentos ?? [] }))
    }
  }

  async function registrarPagamento(
    parceiroId: string,
    tipo: 'implementacao' | 'recorrente',
    valor: number,
    referencia: string,
    tenantId?: string,
  ) {
    setPagandoId(`${parceiroId}-${tipo}-${referencia}`)
    const res = await fetch('/api/superadmin/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parceiro_id: parceiroId, tenant_id: tenantId ?? null, tipo, valor, referencia }),
    })
    const data = await res.json()
    if (data.ok) {
      setPagamentos(prev => ({
        ...prev,
        [parceiroId]: [data.pagamento, ...(prev[parceiroId] ?? [])],
      }))
    }
    setPagandoId(null)
  }

  async function desfazerPagamento(parceiroId: string, pagamentoId: string) {
    await fetch(`/api/superadmin/pagamentos?id=${pagamentoId}`, { method: 'DELETE' })
    setPagamentos(prev => ({
      ...prev,
      [parceiroId]: (prev[parceiroId] ?? []).filter(p => p.id !== pagamentoId),
    }))
  }

  function implJaPaga(parceiroId: string, tenantId: string) {
    return (pagamentos[parceiroId] ?? []).some(p => p.tipo === 'implementacao' && p.tenant_id === tenantId)
  }

  function recorrenteJaPaga(parceiroId: string, ref: string) {
    return (pagamentos[parceiroId] ?? []).some(p => p.tipo === 'recorrente' && p.referencia === ref)
  }

  async function sair() {
    await fetch('/api/superadmin/auth', { method: 'DELETE' })
    router.push('/superadmin/login')
  }

  const PLANOS_PRECO_MAP: Record<string, number> = { free: 0, starter: 397, pro: 697, business: 1197, enterprise: 0 }

  const ativos       = tenants.filter((t) => t.status === 'ativo' && t.plano_aceito_em)
  // MRR: só planos pagos (não free nem trial ativo)
  const pagantes     = tenants.filter((t) => t.status === 'ativo' && t.plano !== 'free' && !t.trial_expira_em && (PLANOS_PRECO_MAP[t.plano] ?? 0) > 0)
  const mrr          = pagantes.reduce((s, t) => s + (PLANOS_PRECO_MAP[t.plano] ?? MENSALIDADE), 0)
  // Implementações: só conta as efetivamente cobradas
  const implCobradas = tenants.filter((t) => t.impl_cobrada).length
  const receitaImpl  = implCobradas * IMPLEMENTACAO
  const receitaTotal = receitaImpl + mrr

  // Sub-texto do MRR: agrupa por plano apenas pagantes reais
  const mrrSubTexto = (() => {
    const contagem: Record<string, number> = {}
    for (const t of pagantes) {
      const preco = PLANOS_PRECO_MAP[t.plano] ?? MENSALIDADE
      if (preco > 0) contagem[preco] = (contagem[preco] ?? 0) + 1
    }
    const partes = Object.entries(contagem).map(([preco, qtd]) =>
      `${qtd} × R$ ${Number(preco).toLocaleString('pt-BR')}`
    )
    return partes.length > 0 ? partes.join(' + ') + '/mês' : `${tenants.filter(t => t.plano === 'free' || t.trial_expira_em).length} em free/trial`
  })()
  const totalPedidos  = tenants.reduce((s, t) => s + t.total_pedidos, 0)
  const totalFaturado = tenants.reduce((s, t) => s + t.faturamento_total, 0)
  const totalSessoes  = tenants.reduce((s, t) => s + t.total_sessoes, 0)
  const novosPartners = parceiros.filter((p) => p.status === 'novo').length

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030d0b' }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm" style={{ color: 'rgba(94,234,212,0.5)' }}>Carregando painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dark-sa min-h-screen flex" style={{ background: '#030d0b' }}>
      <style>{`
        /* ── Dark theme para o painel superadmin ── */
        .dark-sa { color-scheme: dark; }
        .dark-sa .bg-slate-100 { background: #030d0b !important; }
        .dark-sa .bg-slate-50  { background: #0d1f1c !important; }
        .dark-sa .bg-white     { background: #0a1a17 !important; }
        .dark-sa .text-slate-800 { color: #e2faf7 !important; }
        .dark-sa .text-slate-700 { color: rgba(226,250,247,.85) !important; }
        .dark-sa .text-slate-600 { color: rgba(226,250,247,.7)  !important; }
        .dark-sa .text-slate-500 { color: rgba(226,250,247,.5)  !important; }
        .dark-sa .text-slate-400 { color: rgba(226,250,247,.4)  !important; }
        .dark-sa .text-slate-300 { color: rgba(226,250,247,.3)  !important; }
        .dark-sa .border-slate-200 { border-color: rgba(26,155,138,.18) !important; }
        .dark-sa .border-slate-100 { border-color: rgba(26,155,138,.1)  !important; }
        .dark-sa .divide-slate-100 > * + * { border-color: rgba(26,155,138,.08) !important; }
        .dark-sa .shadow-sm { box-shadow: 0 0 0 1px rgba(26,155,138,.12), 0 2px 8px rgba(0,0,0,.35) !important; }
        .dark-sa .shadow-2xl{ box-shadow: 0 0 0 1px rgba(26,155,138,.2), 0 25px 50px rgba(0,0,0,.6)  !important; }
        .dark-sa tr:hover td, .dark-sa .hover\\:bg-slate-50:hover { background: rgba(26,155,138,.06) !important; }
        .dark-sa thead tr, .dark-sa .bg-slate-50 { background: #0d1f1c !important; }
        .dark-sa input:not([type=range]):not([type=checkbox]),
        .dark-sa select,
        .dark-sa textarea {
          background: rgba(255,255,255,.05) !important;
          border-color: rgba(26,155,138,.25) !important;
          color: #e2faf7 !important;
        }
        .dark-sa input::placeholder,
        .dark-sa textarea::placeholder { color: rgba(226,250,247,.25) !important; }
        .dark-sa option { background: #0a1a17; color: #e2faf7; }
        .dark-sa .bg-teal-50  { background: rgba(26,155,138,.1) !important; }
        .dark-sa .bg-red-50   { background: rgba(239,68,68,.1) !important; }
        .dark-sa .bg-green-50 { background: rgba(22,163,74,.1) !important; }
        .dark-sa .bg-amber-50 { background: rgba(217,119,6,.1) !important; }
        .dark-sa .bg-blue-50  { background: rgba(37,99,235,.1) !important; }
        .dark-sa .bg-purple-50{ background: rgba(124,58,237,.1) !important; }
        .dark-sa .bg-F0FDF4,
        .dark-sa [style*="background: #F0FDF4"],
        .dark-sa [style*="background:#F0FDF4"]  { background: rgba(26,155,138,.08) !important; }
        .dark-sa .text-teal-600 { color: #5EEAD4 !important; }
        .dark-sa .border-teal-100 { border-color: rgba(26,155,138,.2) !important; }
        .dark-sa .border-teal-200 { border-color: rgba(26,155,138,.3) !important; }
        .dark-sa .border-red-100  { border-color: rgba(239,68,68,.2)  !important; }
        .dark-sa .hover\\:bg-white:hover { background: rgba(26,155,138,.06) !important; }
        .dark-sa .bg-slate-200 { background: rgba(26,155,138,.12) !important; }
        /* Scrollbar */
        .dark-sa ::-webkit-scrollbar { width: 6px; height: 6px; }
        .dark-sa ::-webkit-scrollbar-track { background: #030d0b; }
        .dark-sa ::-webkit-scrollbar-thumb { background: rgba(26,155,138,.3); border-radius: 3px; }
        .dark-sa ::-webkit-scrollbar-thumb:hover { background: rgba(26,155,138,.5); }
        /* Grid background no main content */
        .dark-sa main {
          background-image: linear-gradient(rgba(26,155,138,.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(26,155,138,.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
      `}</style>

      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={[
        'fixed md:sticky top-0 h-screen z-30 flex flex-col transition-transform duration-200',
        'w-56 shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
        style={{ background: 'linear-gradient(160deg, #0a2420 0%, #0f3d35 100%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 border border-white/20 shrink-0">
              <span className="text-base font-black text-white">M+</span>
            </div>
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-teal-300 leading-none">Menuê+</p>
              <p className="text-white font-bold text-sm leading-tight">Painel Master</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const ativo = aba === id
            const badge = id === 'parceiros' && novosPartners > 0 ? novosPartners : null
            return (
              <button
                key={id}
                onClick={() => { setAba(id); setSidebarOpen(false) }}
                className={[
                  'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all text-left',
                  ativo
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:bg-white/08 hover:text-white/80',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[20px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button onClick={carregar}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/08 transition-all">
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar dados</span>
          </button>
          <button onClick={sair}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Modal de confirmação de exclusão ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-black text-slate-800">Excluir conta permanentemente</p>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Você está prestes a excluir <strong className="text-slate-800">{confirmDelete.nome_restaurante}</strong> e <strong className="text-red-600">todos os dados relacionados</strong> — mesas, pedidos, cardápio, usuários e histórico.
              </p>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700 font-semibold">
                ⚠️ Isso apagará permanentemente: {confirmDelete.total_pedidos} pedidos, {confirmDelete.total_mesas} mesas e todo o cardápio.
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletando}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirTenant(confirmDelete)}
                disabled={deletando}
                className="flex-1 py-3 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deletando
                  ? <><CircleDashed className="w-4 h-4 animate-spin" /> Excluindo...</>
                  : <><Trash2 className="w-4 h-4" /> Sim, excluir tudo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar exclusão de parceiro ── */}
      {confirmDeleteParceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-black text-slate-800">Excluir parceiro</p>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Você está prestes a remover o parceiro <strong className="text-slate-800">{confirmDeleteParceiro.nome}</strong> do sistema.
              </p>
              {confirmDeleteParceiro.restaurantes_indicados.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-semibold">
                  ⚠️ Este parceiro tem {confirmDeleteParceiro.restaurantes_indicados.length} restaurante(s) indicado(s). O vínculo de indicação será desfeito, mas os restaurantes não serão excluídos.
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmDeleteParceiro(null)}
                disabled={deletandoParceiro}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirParceiro(confirmDeleteParceiro)}
                disabled={deletandoParceiro}
                className="flex-1 py-3 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deletandoParceiro
                  ? <><CircleDashed className="w-4 h-4 animate-spin" /> Excluindo...</>
                  : <><Trash2 className="w-4 h-4" /> Sim, excluir parceiro</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 sticky top-0 z-10" style={{ background: '#0a1a17', borderBottom: '1px solid rgba(26,155,138,0.15)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </button>
          <p className="font-bold text-slate-800 text-sm">{NAV.find(n => n.id === aba)?.label}</p>
          <button onClick={sair} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-4 space-y-4">

          {/* ── ABA: Controle de assinatura ── */}
          {aba === 'assinaturas' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Controle de assinatura</h2>
                <p className="text-slate-400 text-sm mt-1">Visão geral de todos os tenants e receita.</p>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Store className="w-5 h-5" />} label="Restaurantes ativos"
                  value={ativos.length.toString()} sub={`${tenants.filter(t => t.plano === 'free' || t.trial_expira_em).length} em free/trial`} accent="#1A9B8A" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="MRR"
                  value={`R$ ${mrr.toLocaleString('pt-BR')}`} sub={mrrSubTexto} accent="#16a34a" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Receita recebida"
                  value={`R$ ${receitaTotal.toLocaleString('pt-BR')}`} sub={`${implCobradas} impl. cobrada${implCobradas !== 1 ? 's' : ''} + MRR`} accent="#d97706" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Pedidos gerados"
                  value={totalPedidos.toLocaleString('pt-BR')} sub={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas`} accent="#7c3aed" />
              </div>

              {/* Tabela de restaurantes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    Restaurantes
                    <span className="ml-2 text-sm font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">{tenants.length}</span>
                  </h3>
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Restaurante', 'Email', 'Slug', '⊞', 'Ped.', 'Faturado', 'Plano / Trial', 'Impl.', 'Status', 'Cadastro', ''].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3 max-w-[140px]">
                            <p className="font-bold text-slate-800 text-xs leading-tight truncate">{t.nome_restaurante}</p>
                            <p className="text-slate-400 text-xs mt-0.5 truncate">{t.nome}</p>
                          </td>
                          <td className="px-3 py-3 max-w-[160px]">
                            <span className="text-slate-500 text-xs truncate block">{t.email}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <a
                              href={`https://${t.slug}.${ROOT_DOMAIN}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 hover:border-teal-300 transition-colors whitespace-nowrap group"
                              title={`Abrir cardápio de ${t.nome_restaurante}`}
                            >
                              {t.slug}
                              <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">{t.total_mesas}</td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">{t.total_pedidos}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            R$ {t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {(() => {
                              const agora = new Date()
                              const trialAtivo = t.trial_expira_em && new Date(t.trial_expira_em) > agora
                              const trialExpirou = t.trial_expira_em && new Date(t.trial_expira_em) <= agora
                              const planoPago = t.plano_aceito_em && !t.trial_expira_em

                              // ── Seletor de plano inline ──
                              const planoSelect = (
                                <div className="space-y-1">
                                  {editandoPlano === t.id ? (
                                    <select
                                      autoFocus
                                      defaultValue={t.plano}
                                      disabled={trocandoPlano === t.id}
                                      onChange={(e) => trocarPlano(t, e.target.value)}
                                      onBlur={() => setEditandoPlano(null)}
                                      className="text-xs rounded-lg border border-teal-300 bg-white px-2 py-1 font-semibold text-slate-700 focus:outline-none cursor-pointer disabled:opacity-50"
                                    >
                                      {PLANOS_DISPONIVEIS.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.nome} — R$ {p.preco}/mês
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => setEditandoPlano(t.id)}
                                      title="Clique para trocar o plano"
                                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border transition-colors hover:opacity-80 ${
                                        t.plano === 'free'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : planoPago
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                      }`}
                                    >
                                      {trocandoPlano === t.id
                                        ? <CircleDashed className="w-3 h-3 animate-spin" />
                                        : t.plano === 'free' ? '🎁' : <BadgeCheck className="w-3 h-3" />
                                      }
                                      {t.plano || 'definir'} ✎
                                    </button>
                                  )}
                                </div>
                              )

                              if (planoPago) return planoSelect
                              if (trialAtivo) {
                                const dias = Math.ceil((new Date(t.trial_expira_em!).getTime() - agora.getTime()) / 86400000)
                                return (
                                  <div className="space-y-1">
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                      <Clock className="w-3 h-3" /> Trial · {dias}d
                                    </span>
                                    {planoSelect}
                                    <button onClick={() => ativarPlano(t)} disabled={ativando === t.id}
                                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-40">
                                      {ativando === t.id ? <CircleDashed className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                                      Ativar plano
                                    </button>
                                  </div>
                                )
                              }
                              if (trialExpirou) return (
                                <div className="space-y-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-600 border border-red-100 block">Expirado</span>
                                  {planoSelect}
                                  <button onClick={() => ativarPlano(t)} disabled={ativando === t.id}
                                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-40">
                                    {ativando === t.id ? <CircleDashed className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                                    Ativar plano
                                  </button>
                                </div>
                              )
                              return (
                                <div className="space-y-1">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-100 block">pendente</span>
                                  {planoSelect}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <button
                              onClick={() => toggleImpl(t)}
                              disabled={togglingImpl === t.id}
                              title={t.impl_cobrada ? 'Impl. cobrada — clique para desmarcar' : 'Impl. não cobrada — clique para marcar'}
                              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-semibold border transition-all disabled:opacity-40 ${
                                t.impl_cobrada
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                              }`}
                            >
                              {togglingImpl === t.id
                                ? <CircleDashed className="w-3 h-3 animate-spin" />
                                : t.impl_cobrada
                                  ? <><CheckCircle2 className="w-3 h-3" /> cobrada</>
                                  : <>⏳ pendente</>
                              }
                            </button>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              t.status === 'ativo'
                                ? 'bg-teal-50 text-teal-700 border border-teal-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>{t.status}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {t.total_mesas === 0 && (
                                <button onClick={() => forcarSetup(t)} disabled={inicializando === t.id}
                                  title="Inicializar mesas" className="p-1 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40">
                                  <Settings2 className={`w-3.5 h-3.5 ${inicializando === t.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <a href={`${APP_URL}/login`} target="_blank" rel="noopener noreferrer"
                                className="p-1 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => toggleStatus(t)} disabled={atualizando === t.id}
                                title={t.status === 'ativo' ? 'Suspender' : 'Reativar'}
                                className={`p-1 rounded-lg transition-colors disabled:opacity-40 ${
                                  t.status === 'ativo'
                                    ? 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                                    : 'text-slate-300 hover:text-green-600 hover:bg-green-50'
                                }`}>
                                {t.status === 'ativo' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => setConfirmDelete(t)}
                                title="Excluir conta"
                                className="p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tenants.length === 0 && (
                        <tr><td colSpan={11} className="px-5 py-16 text-center text-slate-300">Nenhum restaurante cadastrado ainda.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-slate-100">
                  {tenants.map((t) => (
                    <div key={t.id} className="px-5 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{t.nome_restaurante}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{t.email}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                          t.status === 'ativo' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>{t.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { val: t.total_mesas, lbl: 'mesas' },
                          { val: t.total_pedidos, lbl: 'pedidos' },
                          { val: `R$${t.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, lbl: 'faturado' },
                        ].map(({ val, lbl }) => (
                          <div key={lbl} className="bg-slate-50 rounded-xl py-2.5 border border-slate-100">
                            <p className="font-bold text-slate-800 text-sm">{val}</p>
                            <p className="text-slate-400 text-xs">{lbl}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Breakdown de receita & uso</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <RevenueItem label="Implementações cobradas" value={`R$ ${receitaImpl.toLocaleString('pt-BR')}`}
                    sub={`${implCobradas} cobrada${implCobradas !== 1 ? 's' : ''} · ${tenants.length - implCobradas} pendente${tenants.length - implCobradas !== 1 ? 's' : ''}`} color="#d97706" />
                  <RevenueItem label="Mensalidades (MRR)" value={`R$ ${mrr.toLocaleString('pt-BR')}`}
                    sub={mrrSubTexto} color="#1A9B8A" />
                  <RevenueItem label="Volume dos clientes" value={`R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    sub="soma de todos os pedidos" color="#7c3aed" />
                  <RevenueItem label="Acessos ao cardápio" value={totalSessoes.toLocaleString('pt-BR')}
                    sub="sessões de mesa abertas" color="#0284c7" />
                </div>
              </div>
            </>
          )}

          {/* ── ABA: Performance do sistema ── */}
          {aba === 'performance' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Performance do sistema</h2>
                  <p className="text-slate-400 text-sm mt-1">Métricas de uso e saúde da plataforma.</p>
                </div>
                <button onClick={() => { setPerfData(null); carregarPerformance() }}
                  disabled={perfLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-200 hover:bg-teal-50 transition-all disabled:opacity-40">
                  <RefreshCw className={`w-3.5 h-3.5 ${perfLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {perfLoading && !perfData && (
                <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando métricas...</span>
                </div>
              )}

              {!perfLoading && !perfData && (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                  <Gauge className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-400">Dados não carregados ainda.</p>
                  <button onClick={carregarPerformance}
                    className="flex items-center gap-2 text-sm font-bold text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-all">
                    <RefreshCw className="w-4 h-4" />
                    Carregar agora
                  </button>
                </div>
              )}

              {perfData && (() => {
                const { pulso, saude, top_tenants, crescimento, atividade_tenants } = perfData
                const maxPedidos = Math.max(...crescimento.map(s => s.pedidos), 1)
                const maxTenants = Math.max(...crescimento.map(s => s.tenants), 1)

                return (
                  <>
                    {/* ── Pulso ── */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pulso — últimas 24h e 7 dias</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: 'Pedidos hoje',      value: pulso.pedidos_hoje.toString(),                                                  sub: `R$ ${pulso.volume_hoje.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} em volume`,     accent: '#1A9B8A', dot: pulso.pedidos_hoje > 0 },
                          { label: 'Pedidos (7 dias)',  value: pulso.pedidos_7d.toString(),                                                    sub: `R$ ${pulso.volume_7d.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} em volume`,        accent: '#7c3aed', dot: false },
                          { label: 'Sessões abertas',  value: pulso.sessoes_abertas.toString(),                                               sub: `${pulso.sessoes_7d} abertas nos últimos 7d`,                                                   accent: '#0284c7', dot: pulso.sessoes_abertas > 0 },
                          { label: 'Novos tenants 7d', value: pulso.novos_tenants_7d.toString(),                                              sub: `${ativos.length} ativos no total`,                                                             accent: '#d97706', dot: pulso.novos_tenants_7d > 0 },
                        ].map(({ label, value, sub, accent, dot }) => (
                          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-slate-500">{label}</p>
                              {dot && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />}
                            </div>
                            <p className="text-2xl font-black text-slate-800">{value}</p>
                            <p className="text-xs text-slate-400 mt-1">{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Saúde ── */}
                    <div className="grid lg:grid-cols-2 gap-4">

                      {/* Em risco */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <p className="font-bold text-slate-700 text-sm">Risco de churn</p>
                          <span className="ml-auto text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                            {saude.em_risco.length} tenant{saude.em_risco.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {saude.em_risco.length === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <p className="text-2xl mb-1">✅</p>
                            <p className="text-slate-400 text-sm">Todos os tenants ativos usaram o sistema nos últimos 14 dias.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {saude.em_risco.map(t => (
                              <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                  <span className="text-red-600 font-bold text-xs">{t.nome_restaurante.charAt(0)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{t.nome_restaurante}</p>
                                  <p className="text-xs text-slate-400">
                                    {t.ultimo_pedido
                                      ? `Último pedido: ${new Date(t.ultimo_pedido).toLocaleDateString('pt-BR')}`
                                      : 'Sem pedidos registrados'}
                                  </p>
                                </div>
                                <a href={`https://wa.me/55?text=${encodeURIComponent(`Oi! Tudo bem com o ${t.nome_restaurante}?`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 text-xs font-semibold text-green-600 hover:underline">
                                  WhatsApp
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Trial expirando */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <p className="font-bold text-slate-700 text-sm">Trial expirando (7 dias)</p>
                          <span className="ml-auto text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                            {saude.trial_expirando.length} tenant{saude.trial_expirando.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {saude.trial_expirando.length === 0 ? (
                          <div className="px-5 py-8 text-center">
                            <p className="text-2xl mb-1">🎉</p>
                            <p className="text-slate-400 text-sm">Nenhum trial expirando nos próximos 7 dias.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {saude.trial_expirando.map(t => (
                              <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${
                                  t.dias_restantes <= 2 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {t.dias_restantes}d
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{t.nome_restaurante}</p>
                                  <p className="text-xs text-slate-400">{t.email}</p>
                                </div>
                                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  t.dias_restantes <= 2 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {t.dias_restantes <= 0 ? 'Expira hoje' : `${t.dias_restantes}d restantes`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Top tenants + Gráfico ── */}
                    <div className="grid lg:grid-cols-2 gap-4">

                      {/* Top tenants 7 dias */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                          <p className="font-bold text-slate-700 text-sm">🏆 Top atividade — últimos 7 dias</p>
                        </div>
                        {top_tenants.length === 0 ? (
                          <div className="px-5 py-8 text-center text-slate-400 text-sm">Nenhum pedido nos últimos 7 dias.</div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {top_tenants.map((t, i) => (
                              <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                                <span className={`w-6 text-center text-xs font-black ${
                                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'
                                }`}>
                                  #{i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{t.nome_restaurante}</p>
                                  <p className="text-xs text-slate-400">{t.sessoes_7d} sessões · R$ {t.volume_7d.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-black text-slate-800">{t.pedidos_7d}</p>
                                  <p className="text-xs text-slate-400">pedidos</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Gráfico de crescimento */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <p className="font-bold text-slate-700 text-sm mb-4">📈 Crescimento — últimas 8 semanas</p>
                        <div className="space-y-3">
                          {/* Barras de pedidos */}
                          <div>
                            <p className="text-xs text-slate-400 mb-2 font-semibold">Pedidos por semana</p>
                            <div className="flex items-end gap-1 h-16">
                              {crescimento.map((s, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <div className="w-full rounded-t"
                                    style={{
                                      height: `${Math.max(4, Math.round((s.pedidos / maxPedidos) * 56))}px`,
                                      background: i === crescimento.length - 1 ? '#1A9B8A' : '#e2e8f0',
                                    }} />
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {crescimento.map((s, i) => (
                                <div key={i} className="flex-1 text-center">
                                  <p className="text-[9px] text-slate-300 leading-none truncate">{s.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Barras de tenants */}
                          <div>
                            <p className="text-xs text-slate-400 mb-2 font-semibold">Novos tenants por semana</p>
                            <div className="flex items-end gap-1 h-10">
                              {crescimento.map((s, i) => (
                                <div key={i} className="flex-1">
                                  <div className="w-full rounded-t"
                                    style={{
                                      height: `${Math.max(4, Math.round((s.tenants / maxTenants) * 36))}px`,
                                      background: i === crescimento.length - 1 ? '#d97706' : '#fef3c7',
                                    }} />
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-300">* Barra mais escura = semana atual</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Atividade por tenant ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <p className="font-bold text-slate-700 text-sm">Atividade por tenant</p>
                        <span className="text-xs text-slate-400 ml-1">(apenas planos ativos, ordenado por último uso)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Restaurante</th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Plano</th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Último pedido</th>
                              <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Pedidos 7d</th>
                              <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Mesas abertas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {atividade_tenants.map(t => {
                              const diasSemAtividade = t.ultimo_pedido
                                ? Math.floor((Date.now() - new Date(t.ultimo_pedido).getTime()) / 86400000)
                                : null
                              const cor = !t.ultimo_pedido ? '#ef4444'
                                : diasSemAtividade! > 14 ? '#ef4444'
                                : diasSemAtividade! > 7  ? '#f59e0b'
                                : '#16a34a'
                              return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800">{t.nome_restaurante}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold capitalize">{t.plano}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs" style={{ color: cor }}>
                                    <span className="font-semibold">
                                      {t.ultimo_pedido
                                        ? diasSemAtividade === 0 ? '✅ Hoje'
                                          : diasSemAtividade === 1 ? '✅ Ontem'
                                          : `⚠️ Há ${diasSemAtividade} dias`
                                        : '❌ Nunca'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`font-black text-sm ${t.pedidos_7d > 0 ? 'text-teal-600' : 'text-slate-300'}`}>
                                      {t.pedidos_7d}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {t.sessoes_abertas > 0
                                      ? <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{t.sessoes_abertas} abertas</span>
                                      : <span className="text-slate-300 text-xs">—</span>}
                                  </td>
                                </tr>
                              )
                            })}
                            {atividade_tenants.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                                  Nenhum tenant com plano ativo ainda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ── Ferramentas externas recomendadas ── */}
                    <div className="bg-slate-800 rounded-2xl p-5">
                      <p className="text-white font-bold text-sm mb-1">🔧 Monitoramento de infraestrutura</p>
                      <p className="text-slate-400 text-xs mb-4">Para erros de API, latência e uptime, use ferramentas dedicadas:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { nome: 'Vercel Analytics', desc: 'Latência e Core Web Vitals — já incluso no Vercel', url: 'https://vercel.com/analytics', cor: '#000' },
                          { nome: 'Sentry',            desc: 'Erros de API e frontend — plano gratuito disponível', url: 'https://sentry.io',              cor: '#362d59' },
                          { nome: 'Supabase Dashboard',desc: 'Queries lentas, uso de banco e logs',                url: 'https://supabase.com/dashboard',  cor: '#3ecf8e' },
                        ].map(f => (
                          <a key={f.nome} href={f.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-3 bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 transition-colors group">
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: f.cor === '#000' ? '#fff' : f.cor }} />
                            <div>
                              <p className="text-white font-semibold text-sm group-hover:underline">{f.nome}</p>
                              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          )}

          {/* ── ABA: Chamados & Suporte ── */}
          {aba === 'suporte' && (() => {
            const TIPO_META: Record<string, { label: string; cor: string; bg: string }> = {
              sugestao: { label: 'Sugestão',  cor: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100' },
              bug:      { label: 'Bug',        cor: 'text-red-600',    bg: 'bg-red-50 border-red-100'     },
              duvida:   { label: 'Dúvida',     cor: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'   },
              outro:    { label: 'Outro',      cor: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200' },
            }
            const STATUS_META: Record<string, { label: string; cor: string }> = {
              aberto:     { label: 'Aberto',      cor: 'text-teal-600 bg-teal-50 border-teal-100'    },
              em_analise: { label: 'Em análise',  cor: 'text-amber-600 bg-amber-50 border-amber-100' },
              resolvido:  { label: 'Resolvido',   cor: 'text-green-600 bg-green-50 border-green-100' },
              fechado:    { label: 'Fechado',     cor: 'text-slate-500 bg-slate-50 border-slate-200' },
            }
            const counts = chamados.reduce((acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc }, {} as Record<string, number>)
            return (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Chamados & Suporte</h2>
                    <p className="text-slate-400 text-sm mt-1">Sugestões e mensagens enviadas pelos restaurantes.</p>
                  </div>
                  <button onClick={carregarChamados} disabled={chamadosLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-40">
                    <RefreshCw className={`w-3.5 h-3.5 ${chamadosLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                {/* Cards de status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['aberto','em_analise','resolvido','fechado'] as const).map((s) => (
                    <div key={s} className="bg-white rounded-2xl border border-slate-200 px-4 py-4 text-center">
                      <p className="text-2xl font-black text-slate-800">{counts[s] ?? 0}</p>
                      <p className={`text-xs font-bold mt-0.5 ${STATUS_META[s].cor.split(' ')[0]}`}>{STATUS_META[s].label}</p>
                    </div>
                  ))}
                </div>

                {chamadosLoading && chamados.length === 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <CircleDashed className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Carregando chamados...</p>
                  </div>
                )}

                {!chamadosLoading && chamados.length === 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <InboxIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Nenhum chamado ainda</p>
                    <p className="text-slate-300 text-sm mt-1">As sugestões dos restaurantes aparecerão aqui.</p>
                  </div>
                )}

                {chamados.length > 0 && (
                  <div className="space-y-3">
                    {chamados.map((c) => {
                      const tm = TIPO_META[c.tipo] ?? TIPO_META.outro
                      const sm = STATUS_META[c.status] ?? STATUS_META.aberto
                      const restaurant = c.tenants?.nome_restaurante ?? '—'
                      const autor = c.anonimo ? 'Anônimo' : (c.nome_autor || 'Não identificado')
                      const data = new Date(c.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      return (
                        <div key={c.id} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tm.bg} ${tm.cor}`}>{tm.label}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sm.cor}`}>{sm.label}</span>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">{c.mensagem}</p>
                              <p className="text-xs text-slate-400 mt-1.5">
                                <span className="font-semibold text-slate-500">{restaurant}</span>
                                {' · '}{autor}{' · '}{data}
                              </p>
                            </div>
                            {/* Seletor de status */}
                            <div className="relative shrink-0">
                              <select
                                value={c.status}
                                disabled={atualizandoChamado === c.id}
                                onChange={(e) => atualizarStatusChamado(c.id, e.target.value)}
                                className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-teal-300 focus:outline-none disabled:opacity-40"
                              >
                                <option value="aberto">Aberto</option>
                                <option value="em_analise">Em análise</option>
                                <option value="resolvido">Resolvido</option>
                                <option value="fechado">Fechado</option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )
          })()}

          {/* ── ABA: Parceiros ── */}
          {aba === 'parceiros' && (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800">Parceiros</h2>
                <p className="text-slate-400 text-sm mt-1">Gerencie os leads do programa de indicação e acompanhe as comissões.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={<Handshake className="w-5 h-5" />} label="Total de leads" value={parceiros.length.toString()} sub="desde o início" accent="#1A9B8A" />
                <MetricCard icon={<Users className="w-5 h-5" />} label="Novos" value={parceiros.filter(p => p.status === 'novo').length.toString()} sub="aguardando contato" accent="#0284c7" />
                <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Aprovados" value={parceiros.filter(p => p.status === 'aprovado').length.toString()} sub="parceiros ativos" accent="#16a34a" />
                <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Indicações confirmadas"
                  value={parceiros.reduce((s, p) => s + (p.restaurantes_indicados?.filter(r => r.plano_aceito_em).length ?? 0), 0).toString()}
                  sub="restaurantes convertidos" accent="#d97706" />
              </div>

              {/* Lista de parceiros */}
              <div className="space-y-3">
                {parceiros.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 px-6 py-16 text-center">
                    <Handshake className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Nenhum cadastro ainda</p>
                    <p className="text-slate-300 text-sm mt-1">Os leads virão da página <strong className="text-slate-400">/parceiros</strong>.</p>
                  </div>
                ) : parceiros.map((p) => {
                  const s        = STATUS_PARCEIRO[p.status] ?? STATUS_PARCEIRO.novo
                  const ativos   = p.restaurantes_indicados?.filter(r => r.plano_aceito_em).length ?? 0
                  const total    = p.restaurantes_indicados?.length ?? 0
                  const com      = calcComissao(ativos)
                  const aberto   = expandido === p.id
                  const linkRef  = p.codigo_indicacao ? `${APP_URL}/registro?ref=${p.codigo_indicacao}` : null

                  return (
                    <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {/* Cabeçalho do card */}
                      <div className="px-5 py-4 flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
                          style={{ background: s.cor }}>
                          {p.nome.charAt(0).toUpperCase()}
                        </div>

                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800">{p.nome}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.cor }}>{s.label}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                            <span>{p.email}</span>
                            <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noopener noreferrer"
                              className="text-green-600 hover:underline font-mono">{p.whatsapp}</a>
                            {p.cidade && <span>{p.cidade}</span>}
                            <span>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>

                          {/* Link de indicação */}
                          {linkRef && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-100">
                                <Link2 className="w-3 h-3 text-teal-500 shrink-0" />
                                <span className="text-xs font-mono text-teal-700 truncate">{linkRef}</span>
                              </div>
                              <button onClick={() => copiarLink(p.codigo_indicacao!)}
                                title="Copiar link" className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors shrink-0">
                                {copiado === p.codigo_indicacao
                                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                                  : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {/* Chave PIX — destaque para pagamento */}
                          {p.status === 'aprovado' && (
                            <div className={`mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                              p.chave_pix
                                ? 'bg-teal-50 border-teal-100'
                                : 'bg-amber-50 border-amber-200'
                            }`}>
                              {p.chave_pix ? (
                                <>
                                  <span className="text-teal-600 font-semibold shrink-0">PIX:</span>
                                  <span className="font-mono text-slate-700 truncate">
                                    {p.chave_pix}
                                  </span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(p.chave_pix!)}
                                    title="Copiar chave PIX"
                                    className="ml-auto shrink-0 text-teal-500 hover:text-teal-700 transition-colors"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-amber-700 font-semibold">⚠️ PIX não cadastrado — cobrar do parceiro</span>
                              )}
                            </div>
                          )}

                          {/* Comissão estimada (apenas se aprovado e tem indicações ativas) */}
                          {p.status === 'aprovado' && ativos > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-semibold">
                                {ativos} ativo{ativos > 1 ? 's' : ''} · comissão {com.label}
                              </span>
                              <span className="text-slate-500">
                                ~{fmt(com.mensal)}/mês + {fmt(com.impl)} impl.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações direita */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Alterar status */}
                          <div className="relative">
                            <select value={p.status} disabled={statusEdit === p.id}
                              onChange={(e) => atualizarStatusParceiro(p.id, e.target.value)}
                              className="appearance-none text-xs px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:border-teal-300 focus:outline-none disabled:opacity-40">
                              <option value="novo">Novo</option>
                              <option value="contactado">Contactado</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="recusado">Recusado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Expandir restaurantes */}
                          {(p.status === 'aprovado' || total > 0) && (
                            <button onClick={() => {
                              const novoAberto = aberto ? null : p.id
                              setExpandido(novoAberto)
                              if (novoAberto) carregarPagamentos(p.id)
                            }}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                              {p.status === 'aprovado' ? <Banknote className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                              {total > 0 && <span>{total}</span>}
                              <ChevronDown className={`w-3 h-3 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                            </button>
                          )}

                          {/* Excluir parceiro */}
                          <button
                            onClick={() => setConfirmDeleteParceiro(p)}
                            title="Excluir parceiro"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Painel expandido: pagamentos */}
                      {aberto && (
                        <div className="border-t border-slate-100 bg-slate-50">
                          <div className="px-5 py-4 space-y-5">

                            {/* ── Implementações ── */}
                            {total > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <Store className="w-3.5 h-3.5" /> Implementações (30% = {fmt(IMPLEMENTACAO * 0.30)}/restaurante)
                                </p>
                                <div className="space-y-2">
                                  {p.restaurantes_indicados.map((r) => {
                                    const pago    = implJaPaga(p.id, r.id)
                                    const valor   = Math.round(IMPLEMENTACAO * 0.30)
                                    const chave   = `${p.id}-implementacao-${r.id}`
                                    const loading = pagandoId === chave
                                    return (
                                      <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-slate-800 text-sm">{r.nome_restaurante}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">
                                            {r.plano_aceito_em
                                              ? `Ativo desde ${new Date(r.plano_aceito_em).toLocaleDateString('pt-BR')}`
                                              : 'Ainda pendente de plano'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-sm font-black text-slate-700">{fmt(valor)}</span>
                                          {pago ? (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                            </span>
                                          ) : (
                                            <button
                                              disabled={!r.plano_aceito_em || loading}
                                              onClick={() => registrarPagamento(p.id, 'implementacao', valor, r.nome_restaurante, r.id)}
                                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              {loading ? <CircleDashed className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                                              Marcar pago
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* ── Recorrente mensal ── */}
                            {p.status === 'aprovado' && ativos > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-3.5 h-3.5" /> Recorrente mensal ({com.label} = {fmt(com.mensal)}/mês)
                                </p>
                                <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-700">{ativos} restaurante{ativos > 1 ? 's' : ''} ativo{ativos > 1 ? 's' : ''}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">Referência do mês:</p>
                                    </div>
                                    <input
                                      value={mesRef}
                                      onChange={e => setMesRef(e.target.value)}
                                      placeholder="Ex: Maio 2026"
                                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 w-32 text-slate-700 focus:outline-none focus:border-teal-300"
                                    />
                                    <span className="text-sm font-black text-slate-700">{fmt(com.mensal)}</span>
                                    {recorrenteJaPaga(p.id, mesRef) ? (
                                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                      </span>
                                    ) : (
                                      <button
                                        disabled={!mesRef || pagandoId === `${p.id}-recorrente-${mesRef}`}
                                        onClick={() => registrarPagamento(p.id, 'recorrente', com.mensal, mesRef)}
                                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40"
                                      >
                                        {pagandoId === `${p.id}-recorrente-${mesRef}`
                                          ? <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                                          : <Banknote className="w-3.5 h-3.5" />}
                                        Marcar pago
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ── Histórico de pagamentos ── */}
                            {(pagamentos[p.id] ?? []).length > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <History className="w-3.5 h-3.5" /> Histórico de pagamentos
                                </p>
                                <div className="space-y-1.5">
                                  {(pagamentos[p.id] ?? []).map(pg => (
                                    <div key={pg.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5">
                                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pg.tipo === 'implementacao' ? 'bg-blue-400' : 'bg-green-400'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700">
                                          {pg.tipo === 'implementacao' ? '🏗️ Impl.' : '📅 Recorrente'} — {pg.referencia}
                                        </p>
                                        <p className="text-xs text-slate-400">{new Date(pg.pago_em).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                      <span className="text-sm font-black text-green-600">{fmt(pg.valor)}</span>
                                      <button
                                        onClick={() => desfazerPagamento(p.id, pg.id)}
                                        title="Desfazer pagamento"
                                        className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2 text-right">
                                  Total pago: <span className="font-black text-slate-600">
                                    {fmt((pagamentos[p.id] ?? []).reduce((s, pg) => s + Number(pg.valor), 0))}
                                  </span>
                                </p>
                              </div>
                            )}

                            {total === 0 && ativos === 0 && (pagamentos[p.id] ?? []).length === 0 && (
                              <p className="text-sm text-slate-400 text-center py-4">
                                Nenhuma indicação ainda. Compartilhe o link com o parceiro.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── ABA: TUTORIAIS ── */}
          {aba === 'tutoriais' && (
            <div className="space-y-6">

              {/* Formulário adicionar/editar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-black text-slate-700 mb-4">
                  {videoEditando ? '✏️ Editar vídeo' : '➕ Adicionar vídeo'}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Título *</label>
                    <input
                      value={videoForm.titulo}
                      onChange={e => setVideoForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ex: Como cadastrar itens no cardápio"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">YouTube URL ou ID *</label>
                    <input
                      value={videoForm.youtube_id}
                      onChange={e => setVideoForm(f => ({ ...f, youtube_id: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=... ou dQw4w9WgXcQ"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Categoria</label>
                    <select
                      value={videoForm.categoria}
                      onChange={e => setVideoForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400"
                    >
                      {CATEGORIAS_VIDEO.map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ordem</label>
                    <input
                      type="number"
                      value={videoForm.ordem}
                      onChange={e => setVideoForm(f => ({ ...f, ordem: Number(e.target.value) }))}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Descrição (opcional)</label>
                    <textarea
                      value={videoForm.descricao}
                      onChange={e => setVideoForm(f => ({ ...f, descricao: e.target.value }))}
                      placeholder="Breve descrição do que é ensinado no vídeo"
                      rows={2}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={salvarVideo}
                    disabled={!videoForm.titulo.trim() || !videoForm.youtube_id.trim() || videoSalvando}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-colors"
                    style={{ background: '#1A9B8A' }}
                  >
                    {videoSalvando
                      ? <><CircleDashed className="w-4 h-4 animate-spin" /> Salvando...</>
                      : <><CheckCircle2 className="w-4 h-4" /> {videoEditando ? 'Salvar alterações' : 'Adicionar vídeo'}</>
                    }
                  </button>
                  {videoEditando && (
                    <button
                      onClick={() => { setVideoEditando(null); setVideoForm({ titulo: '', descricao: '', youtube_id: '', categoria: 'geral', ordem: 0 }) }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <a
                    href="/suporte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ver página pública
                  </a>
                </div>
              </div>

              {/* Lista de vídeos */}
              {videosLoading ? (
                <div className="flex justify-center py-10">
                  <CircleDashed className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <PlayCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Nenhum vídeo cadastrado ainda.</p>
                  <p className="text-sm mt-1">Adicione o primeiro tutorial acima.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map(v => (
                    <div key={v.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-opacity ${!v.ativo ? 'opacity-50' : ''} border-slate-200`}>
                      {/* Thumb */}
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/default.jpg`}
                        alt={v.titulo}
                        className="w-20 h-14 object-cover rounded-xl shrink-0"
                      />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{v.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">{v.categoria}</span>
                          <span className="text-xs text-slate-400">ordem: {v.ordem}</span>
                          {!v.ativo && <span className="text-xs text-amber-500 font-semibold">oculto</span>}
                        </div>
                        {v.descricao && <p className="text-xs text-slate-400 mt-1 truncate">{v.descricao}</p>}
                      </div>
                      {/* Ações */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleAtivoVideo(v)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                          title={v.ativo ? 'Ocultar' : 'Mostrar'}
                        >
                          {v.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => iniciarEdicao(v)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletarVideo(v.id)}
                          disabled={videoDeletando === v.id}
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          {videoDeletando === v.id
                            ? <CircleDashed className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div className="rounded-2xl p-5" style={{
      background: 'rgba(10,26,23,0.9)',
      border: `1px solid ${accent}25`,
      boxShadow: `0 0 0 1px ${accent}12, 0 4px 16px rgba(0,0,0,.3)`,
    }}>
      <div className="inline-flex p-2 rounded-xl mb-3" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
      <p className="text-2xl font-black" style={{ color: '#e2faf7' }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: 'rgba(226,250,247,0.5)' }}>{label}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: accent }}>{sub}</p>
    </div>
  )
}

function RevenueItem({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-sm mb-1 font-medium" style={{ color: 'rgba(226,250,247,0.5)' }}>{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(226,250,247,0.4)' }}>{sub}</p>
    </div>
  )
}
