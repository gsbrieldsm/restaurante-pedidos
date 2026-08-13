'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone, Plus, Loader2, X, Pencil, Trash2,
  Clock, Tag, Ticket, Star, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Promocao {
  id: string
  nome: string
  descricao: string | null
  tipo: 'happy_hour' | 'cupom' | 'desconto' | 'destaque'
  status: 'ativa' | 'pausada' | 'encerrada'
  desconto_tipo: 'percentual' | 'valor_fixo' | null
  desconto_valor: number | null
  aplica_em: 'total' | 'item' | 'categoria'
  item_id: string | null
  categoria: string | null
  hora_inicio: string | null
  hora_fim: string | null
  dias_semana: string[] | null
  data_inicio: string | null
  data_fim: string | null
  codigo_cupom: string | null
  uso_maximo: number | null
  uso_atual: number
  criado_em: string
  cardapio_itens?: { nome: string } | null
}

interface ItemCardapio { id: string; nome: string; categoria: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  happy_hour: { label: 'Happy Hour',        icon: Clock,    cor: 'bg-amber-100 text-amber-700 border-amber-200'   },
  cupom:      { label: 'Cupom',             icon: Ticket,   cor: 'bg-purple-100 text-purple-700 border-purple-200' },
  desconto:   { label: 'Promoção',          icon: Tag,      cor: 'bg-teal-100 text-teal-700 border-teal-200'       },
  destaque:   { label: 'Destaque Visual',   icon: Star,     cor: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const DIAS = [
  { v: 'seg', l: 'Seg' }, { v: 'ter', l: 'Ter' }, { v: 'qua', l: 'Qua' },
  { v: 'qui', l: 'Qui' }, { v: 'sex', l: 'Sex' }, { v: 'sab', l: 'Sáb' }, { v: 'dom', l: 'Dom' },
]

function descricaoResumida(p: Promocao) {
  const partes: string[] = []
  if (p.desconto_valor) {
    partes.push(p.desconto_tipo === 'percentual' ? `${p.desconto_valor}% off` : `R$ ${Number(p.desconto_valor).toFixed(2)} off`)
  }
  if (p.aplica_em === 'item' && p.cardapio_itens) partes.push(`em "${p.cardapio_itens.nome}"`)
  if (p.aplica_em === 'categoria' && p.categoria) partes.push(`em "${p.categoria}"`)
  if (p.hora_inicio && p.hora_fim) partes.push(`${p.hora_inicio.slice(0,5)}–${p.hora_fim.slice(0,5)}`)
  if (p.dias_semana?.length) partes.push(p.dias_semana.map(d => DIAS.find(x => x.v === d)?.l).join(', '))
  if (p.codigo_cupom) partes.push(`código: ${p.codigo_cupom}`)
  if (p.uso_maximo) partes.push(`${p.uso_atual}/${p.uso_maximo} usos`)
  return partes.join(' · ') || 'Sem restrições'
}

// ─── Form vazio ───────────────────────────────────────────────────────────────
const FORM_VAZIO = {
  nome: '', descricao: '', tipo: 'desconto' as Promocao['tipo'],
  desconto_tipo: 'percentual' as 'percentual' | 'valor_fixo',
  desconto_valor: '',
  aplica_em: 'total' as 'total' | 'item' | 'categoria',
  item_id: '', categoria: '',
  hora_inicio: '', hora_fim: '',
  dias_semana: [] as string[],
  data_inicio: '', data_fim: '',
  codigo_cupom: '', uso_maximo: '',
}

// ─── Modal de criação/edição ──────────────────────────────────────────────────
function ModalPromocao({
  inicial, itens, onSalvar, onClose,
}: {
  inicial?: Promocao | null
  itens: ItemCardapio[]
  onSalvar: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState(() => inicial ? {
    nome: inicial.nome,
    descricao: inicial.descricao ?? '',
    tipo: inicial.tipo,
    desconto_tipo: inicial.desconto_tipo ?? 'percentual',
    desconto_valor: inicial.desconto_valor ? String(inicial.desconto_valor) : '',
    aplica_em: inicial.aplica_em,
    item_id: inicial.item_id ?? '',
    categoria: inicial.categoria ?? '',
    hora_inicio: inicial.hora_inicio?.slice(0,5) ?? '',
    hora_fim: inicial.hora_fim?.slice(0,5) ?? '',
    dias_semana: inicial.dias_semana ?? [],
    data_inicio: inicial.data_inicio ?? '',
    data_fim: inicial.data_fim ?? '',
    codigo_cupom: inicial.codigo_cupom ?? '',
    uso_maximo: inicial.uso_maximo ? String(inicial.uso_maximo) : '',
  } : FORM_VAZIO)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function toggleDia(d: string) {
    setForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter(x => x !== d) : [...f.dias_semana, d],
    }))
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome obrigatório'); return }
    setSalvando(true)
    setErro('')

    const payload = {
      ...(inicial ? { id: inicial.id } : {}),
      nome: form.nome,
      descricao: form.descricao || null,
      tipo: form.tipo,
      desconto_tipo: form.tipo !== 'destaque' ? form.desconto_tipo : null,
      desconto_valor: form.tipo !== 'destaque' && form.desconto_valor ? parseFloat(form.desconto_valor) : null,
      aplica_em: form.aplica_em,
      item_id: form.aplica_em === 'item' ? form.item_id || null : null,
      categoria: form.aplica_em === 'categoria' ? form.categoria || null : null,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      dias_semana: form.dias_semana.length ? form.dias_semana : null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      codigo_cupom: form.tipo === 'cupom' ? form.codigo_cupom || null : null,
      uso_maximo: form.tipo === 'cupom' && form.uso_maximo ? parseInt(form.uso_maximo) : null,
    }

    const res = await fetch('/api/admin/promocoes', {
      method: inicial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSalvando(false)
    if (!res.ok) { setErro(data.error ?? 'Erro ao salvar'); return }
    onSalvar()
    onClose()
  }

  const categorias = [...new Set(itens.map(i => i.categoria))].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" onClick={onClose}>
      <div className="ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100 z-10">
          <h2 className="font-bold text-slate-800 text-lg">{inicial ? 'Editar promoção' : 'Nova promoção'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de promoção</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TIPO_CONFIG) as [Promocao['tipo'], typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(([k, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={k} type="button" onClick={() => setForm(f => ({ ...f, tipo: k }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-left ${form.tipo === k ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Icon className="w-4 h-4 shrink-0" />{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome da promoção *</Label>
            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Happy Hour das Caipirinhas" autoFocus />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-slate-400 font-normal">(aparece no cardápio)</span></Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Todo dia das 17h às 19h, caipirinhas com 30% off!" />
          </div>

          {/* Desconto — oculto se destaque */}
          {form.tipo !== 'destaque' && (
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desconto</p>
              <div className="flex gap-2">
                {(['percentual', 'valor_fixo'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, desconto_tipo: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.desconto_tipo === t ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                    {t === 'percentual' ? '% Percentual' : 'R$ Valor fixo'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input type="number" min="0" step={form.desconto_tipo === 'percentual' ? '1' : '0.01'}
                  value={form.desconto_valor}
                  onChange={e => setForm(f => ({ ...f, desconto_valor: e.target.value }))}
                  placeholder={form.desconto_tipo === 'percentual' ? 'Ex: 30' : 'Ex: 10.00'}
                  className="pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                  {form.desconto_tipo === 'percentual' ? '%' : 'R$'}
                </span>
              </div>
            </div>
          )}

          {/* Aplica em */}
          {form.tipo !== 'cupom' && (
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aplica em</p>
              <div className="grid grid-cols-3 gap-2">
                {([['total','Total do pedido'],['item','Item específico'],['categoria','Categoria']] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, aplica_em: v }))}
                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.aplica_em === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.aplica_em === 'item' && (
                <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="">Selecione o item...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              )}
              {form.aplica_em === 'categoria' && (
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="">Selecione a categoria...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Cupom */}
          {form.tipo === 'cupom' && (
            <div className="space-y-3 bg-purple-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Configuração do cupom</p>
              <div className="space-y-1.5">
                <Label>Código do cupom</Label>
                <Input value={form.codigo_cupom}
                  onChange={e => setForm(f => ({ ...f, codigo_cupom: e.target.value.toUpperCase() }))}
                  placeholder="Ex: BDAY20" className="font-mono font-bold tracking-widest" />
                <p className="text-xs text-slate-400">O cliente digita este código no cardápio.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Limite de usos <span className="text-slate-400 font-normal">(vazio = ilimitado)</span></Label>
                <Input type="number" min="1" value={form.uso_maximo}
                  onChange={e => setForm(f => ({ ...f, uso_maximo: e.target.value }))}
                  placeholder="Ex: 100" />
              </div>
            </div>
          )}

          {/* Período de tempo */}
          {(form.tipo === 'happy_hour' || form.tipo === 'desconto') && (
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Período de validade</p>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data início</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data fim</Label>
                  <Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} className="text-sm" />
                </div>
              </div>

              {/* Horário */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Horário início</Label>
                  <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horário fim</Label>
                  <Input type="time" value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} className="text-sm" />
                </div>
              </div>

              {/* Dias da semana */}
              <div className="space-y-1.5">
                <Label className="text-xs">Dias da semana <span className="text-slate-400 font-normal">(vazio = todos)</span></Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS.map(d => (
                    <button key={d.v} type="button" onClick={() => toggleDia(d.v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.dias_semana.includes(d.v) ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erro}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {inicial ? 'Salvar alterações' : 'Criar promoção'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de promoção ─────────────────────────────────────────────────────────
function CardPromocao({ promo, onAtualizado }: { promo: Promocao; onAtualizado: () => void }) {
  const [expandido, setExpandido] = useState(false)
  const [loading, setLoading] = useState(false)

  const cfg = TIPO_CONFIG[promo.tipo]
  const Icon = cfg.icon
  const ativa = promo.status === 'ativa'

  async function toggleStatus() {
    setLoading(true)
    await fetch('/api/admin/promocoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: promo.id, status: ativa ? 'pausada' : 'ativa' }),
    })
    onAtualizado()
    setLoading(false)
  }

  async function deletar() {
    if (!confirm(`Excluir a promoção "${promo.nome}"?`)) return
    setLoading(true)
    await fetch('/api/admin/promocoes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: promo.id }),
    })
    onAtualizado()
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${ativa ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ativa ? 'bg-teal-50' : 'bg-slate-100'}`}>
            <Icon className={`w-4 h-4 ${ativa ? 'text-teal-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800 text-sm">{promo.nome}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cor}`}>{cfg.label}</span>
              {!ativa && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Pausada</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{descricaoResumida(promo)}</p>
            {promo.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{promo.descricao}</p>}
          </div>
        </div>

        {/* Progresso cupom */}
        {promo.tipo === 'cupom' && promo.uso_maximo && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Usos do cupom</span>
              <span>{promo.uso_atual} / {promo.uso_maximo}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (promo.uso_atual / promo.uso_maximo) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-50 bg-slate-50/50">
        <button onClick={toggleStatus} disabled={loading}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${ativa ? 'text-slate-500 hover:text-slate-700' : 'text-teal-600 hover:text-teal-700'}`}>
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : ativa
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
          {ativa ? 'Pausar' : 'Ativar'}
        </button>
        <div className="flex gap-2">
          <button onClick={() => setExpandido(v => !v)} className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-400">
            {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={deletar} disabled={loading} className="p-1.5 rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-50 space-y-1.5 text-xs text-slate-500">
          {promo.desconto_valor && (
            <p>💰 Desconto: <strong>{promo.desconto_tipo === 'percentual' ? `${promo.desconto_valor}%` : `R$ ${Number(promo.desconto_valor).toFixed(2)}`}</strong></p>
          )}
          {promo.aplica_em === 'item' && promo.cardapio_itens && <p>🍽️ Item: <strong>{promo.cardapio_itens.nome}</strong></p>}
          {promo.aplica_em === 'categoria' && promo.categoria && <p>📂 Categoria: <strong>{promo.categoria}</strong></p>}
          {promo.hora_inicio && promo.hora_fim && <p>🕐 Horário: <strong>{promo.hora_inicio.slice(0,5)} às {promo.hora_fim.slice(0,5)}</strong></p>}
          {promo.dias_semana?.length && <p>📅 Dias: <strong>{promo.dias_semana.map(d => DIAS.find(x => x.v === d)?.l).join(', ')}</strong></p>}
          {promo.data_inicio && <p>📆 Período: <strong>{new Date(promo.data_inicio).toLocaleDateString('pt-BR')}{promo.data_fim ? ` até ${new Date(promo.data_fim).toLocaleDateString('pt-BR')}` : ''}</strong></p>}
          {promo.codigo_cupom && <p>🎫 Código: <strong className="font-mono">{promo.codigo_cupom}</strong> · {promo.uso_atual} usos{promo.uso_maximo ? ` de ${promo.uso_maximo}` : ''}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [itens, setItens] = useState<ItemCardapio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'ativa' | 'pausada'>('todas')

  async function carregar() {
    setLoading(true)
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/promocoes'),
      fetch('/api/admin/cardapio'),
    ])
    const d1 = await r1.json()
    const d2 = await r2.json()
    setPromocoes(d1.promocoes ?? [])
    setItens(d2.itens ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const filtradas = promocoes.filter(p => filtro === 'todas' || p.status === filtro)
  const ativas  = promocoes.filter(p => p.status === 'ativa').length
  const pausadas = promocoes.filter(p => p.status === 'pausada').length

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">CRESCIMENTO</p>
          <h1 className="text-2xl font-bold text-slate-800">Marketing</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {ativas} ativa{ativas !== 1 ? 's' : ''} · {pausadas} pausada{pausadas !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="bg-teal-600 hover:bg-teal-700 gap-2 shrink-0">
          <Plus className="w-4 h-4" />Nova promoção
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['todas', 'Todas'], ['ativa', 'Ativas'], ['pausada', 'Pausadas']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filtro === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tipos em cards de instrução (quando vazio) */}
      {!loading && promocoes.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.entries(TIPO_CONFIG) as [Promocao['tipo'], typeof TIPO_CONFIG[keyof typeof TIPO_CONFIG]][]).map(([k, cfg]) => {
            const Icon = cfg.icon
            const exemplos: Record<string, string> = {
              happy_hour: 'Caipirinha -30% das 17h às 19h nas sextas',
              cupom: 'Código BDAY20 = 20% off para aniversariantes',
              desconto: 'Burguer com 15% off este fim de semana',
              destaque: '"🔥 Mais pedido" no item sem desconto real',
            }
            return (
              <div key={k} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">{cfg.label}</p>
                </div>
                <p className="text-xs text-slate-400">{exemplos[k]}</p>
              </div>
            )
          })}
          <div className="sm:col-span-2 text-center py-4">
            <button onClick={() => setModalAberto(true)} className="text-teal-600 text-sm font-semibold hover:underline">
              + Criar sua primeira promoção
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : filtradas.length === 0 && promocoes.length > 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhuma promoção neste filtro.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(p => (
            <CardPromocao key={p.id} promo={p} onAtualizado={carregar} />
          ))}
        </div>
      )}

      {modalAberto && (
        <ModalPromocao itens={itens} onSalvar={carregar} onClose={() => setModalAberto(false)} />
      )}
    </div>
  )
}
