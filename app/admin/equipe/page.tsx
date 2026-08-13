'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus, Loader2, MailCheck, UserX, UserCheck,
  Trash2, RefreshCw, Shield, User, X, Send,
  ChefHat, Plus, Receipt, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Membro {
  id:                   string
  nome:                 string
  email:                string
  cargo:                'admin' | 'operador'
  ativo:                boolean
  convite_aceito:       boolean
  convite_expira_em:    string | null
  criado_em:            string
  desconto_funcionario: number
}

interface ComandaItem {
  id:             string
  nome_item:      string
  preco_original: number
  desconto_pct:   number
  preco_cobrado:  number
  quantidade:     number
  criado_em:      string
}

interface Comanda {
  id:             string
  mes_referencia: string
  status:         'aberta' | 'fechada'
  total_bruto:    number
  total_desconto: number
  total_liquido:  number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CARGO_CONFIG = {
  admin:    { label: 'Admin',    cor: 'bg-purple-100 text-purple-700 border-purple-200' },
  operador: { label: 'Operador', cor: 'bg-teal-50 text-teal-700 border-teal-200'        },
}

function statusMembro(m: Membro) {
  if (!m.convite_aceito) {
    const expirou = m.convite_expira_em && new Date(m.convite_expira_em) < new Date()
    return expirou ? 'expirado' : 'pendente'
  }
  return m.ativo ? 'ativo' : 'inativo'
}

const STATUS_CONFIG = {
  ativo:    { label: 'Ativo',            cor: 'bg-green-100 text-green-700'   },
  pendente: { label: 'Convite enviado',  cor: 'bg-amber-100 text-amber-700'   },
  expirado: { label: 'Convite expirado', cor: 'bg-red-100 text-red-600'       },
  inativo:  { label: 'Inativo',          cor: 'bg-slate-100 text-slate-500'   },
}

function mesLabel(ref: string) {
  const [ano, mes] = ref.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(mes) - 1]}/${ano}`
}

// ─── Modal de convite ─────────────────────────────────────────────────────────
function ModalConvite({ onClose, onConvidado }: { onClose: () => void; onConvidado: () => void }) {
  const [nome,      setNome]      = useState('')
  const [email,     setEmail]     = useState('')
  const [cargo,     setCargo]     = useState<'admin' | 'operador'>('operador')
  const [enviando,  setEnviando]  = useState(false)
  const [erro,      setErro]      = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const res  = await fetch('/api/admin/usuarios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome, email, cargo }),
    })
    const data = await res.json()
    setEnviando(false)
    if (!res.ok) { setErro(data.error ?? 'Erro ao convidar.'); return }
    onConvidado()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Convidar membro</h2>
            <p className="text-xs text-slate-400 mt-0.5">Um e-mail com link de acesso será enviado automaticamente.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" autoFocus placeholder="Ex: João Silva" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="joao@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['operador', 'admin'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCargo(c)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${cargo === c ? c === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {c === 'admin' ? '🛡️ Admin' : '👤 Operador'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {cargo === 'admin' ? 'Acesso completo: cardápio, financeiro, configurações e equipe.' : 'Acesso ao painel operacional: pedidos, estações e garçom.'}
            </p>
          </div>
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{erro}</div>}
          <Button type="submit" className="w-full h-11 font-bold text-white" style={{ background: '#1A9B8A' }} disabled={enviando || !nome || !email}>
            {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando convite...</> : <><Send className="w-4 h-4 mr-2" /> Enviar convite</>}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Drawer de comanda do funcionário ────────────────────────────────────────
function DrawerComanda({ membro, onClose }: { membro: Membro; onClose: () => void }) {
  const [comanda,    setComanda]    = useState<Comanda | null>(null)
  const [itens,      setItens]      = useState<ComandaItem[]>([])
  const [desconto,   setDesconto]   = useState(membro.desconto_funcionario)
  const [loading,    setLoading]    = useState(true)
  const [salvando,   setSalvando]   = useState(false)
  const [salvoOk,    setSalvoOk]    = useState(false)
  const [fechando,   setFechando]   = useState(false)
  const [removendo,  setRemovendo]  = useState<string | null>(null)
  const [novoItem,   setNovoItem]   = useState({ nome: '', preco: '' })
  const [adicionando, setAdicionando] = useState(false)
  const [formAberto, setFormAberto] = useState(false)

  async function carregar() {
    setLoading(true)
    const res = await fetch(`/api/admin/usuarios/${membro.id}/comanda`)
    const data = await res.json()
    setComanda(data.comanda)
    setItens(data.itens ?? [])
    setDesconto(data.desconto_funcionario ?? 0)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvarDesconto() {
    setSalvando(true)
    const res = await fetch(`/api/admin/usuarios/${membro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desconto_funcionario: desconto }),
    })
    setSalvando(false)
    if (res.ok) {
      setSalvoOk(true)
      setTimeout(() => setSalvoOk(false), 2000)
    }
  }

  async function adicionarItem() {
    if (!novoItem.nome.trim() || !novoItem.preco) return
    setAdicionando(true)
    await fetch(`/api/admin/usuarios/${membro.id}/comanda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_item: novoItem.nome, preco_original: parseFloat(novoItem.preco) }),
    })
    setNovoItem({ nome: '', preco: '' })
    setFormAberto(false)
    await carregar()
    setAdicionando(false)
  }

  async function removerItem(itemId: string) {
    setRemovendo(itemId)
    await fetch(`/api/admin/usuarios/${membro.id}/comanda`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    })
    await carregar()
    setRemovendo(null)
  }

  async function fecharMes() {
    if (!confirm(`Fechar a comanda de ${mesLabel(comanda?.mes_referencia ?? '')} para ${membro.nome}? Isso marca o valor para desconto em folha.`)) return
    setFechando(true)
    await fetch(`/api/admin/usuarios/${membro.id}/comanda`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'fechar_mes' }),
    })
    await carregar()
    setFechando(false)
  }

  const fechada = comanda?.status === 'fechada'

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40" onClick={onClose}>
      <div className="ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consumo · {comanda ? mesLabel(comanda.mes_referencia) : '...'}</p>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">{membro.nome}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Desconto */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desconto em folha</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    type="number" min={0} max={100}
                    value={desconto}
                    onChange={(e) => setDesconto(Number(e.target.value))}
                    className="pr-8 text-lg font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                </div>
                <button onClick={salvarDesconto} disabled={salvando}
                  className={`px-4 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors ${salvoOk ? 'bg-green-500' : 'bg-teal-600 hover:bg-teal-700'}`}>
                  {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : salvoOk ? '✓ Salvo' : 'Salvar'}
                </button>
              </div>
              <p className="text-xs text-slate-400">Aplicado automaticamente em cada lançamento desta comanda.</p>
            </div>

            {/* Totais */}
            {comanda && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Bruto', valor: comanda.total_bruto, cor: 'text-slate-700' },
                  { label: 'Desconto', valor: comanda.total_desconto, cor: 'text-teal-600' },
                  { label: 'A descontar', valor: comanda.total_liquido, cor: 'text-orange-600' },
                ].map(({ label, valor, cor }) => (
                  <div key={label} className="bg-white border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                    <p className={`text-base font-bold mt-0.5 ${cor}`}>R$ {Number(valor).toFixed(2).replace('.', ',')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Status fechada */}
            {fechada && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-3 rounded-xl">
                <Lock className="w-4 h-4 shrink-0" />
                Comanda fechada — valor marcado para desconto em folha.
              </div>
            )}

            {/* Lista de itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Itens lançados</p>
                {!fechada && (
                  <button onClick={() => setFormAberto(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" />Lançar item
                  </button>
                )}
              </div>

              {/* Form novo item */}
              {formAberto && !fechada && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nome do item"
                      value={novoItem.nome}
                      onChange={(e) => setNovoItem(v => ({ ...v, nome: e.target.value }))}
                      className="text-sm"
                      autoFocus
                    />
                    <Input
                      type="number" step="0.01" min="0"
                      placeholder="R$ 0,00"
                      value={novoItem.preco}
                      onChange={(e) => setNovoItem(v => ({ ...v, preco: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  {novoItem.preco && desconto > 0 && (
                    <p className="text-xs text-teal-700 font-medium">
                      Com {desconto}% de desconto: R$ {(parseFloat(novoItem.preco || '0') * (1 - desconto / 100)).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setFormAberto(false)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">Cancelar</button>
                    <button onClick={adicionarItem} disabled={adicionando || !novoItem.nome.trim() || !novoItem.preco}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 flex items-center gap-1.5">
                      {adicionando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Confirmar
                    </button>
                  </div>
                </div>
              )}

              {itens.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lançamento este mês.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                  {itens.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < itens.length - 1 ? 'border-b border-slate-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.quantidade > 1 && `${item.quantidade}× `}{item.nome_item}</p>
                        <p className="text-xs text-slate-400">
                          <span className="line-through">R$ {Number(item.preco_original * item.quantidade).toFixed(2).replace('.', ',')}</span>
                          {' → '}
                          <span className="text-teal-600 font-semibold">R$ {Number(item.preco_cobrado * item.quantidade).toFixed(2).replace('.', ',')}</span>
                          {item.desconto_pct > 0 && <span className="ml-1 text-teal-500">(-{item.desconto_pct}%)</span>}
                        </p>
                      </div>
                      {!fechada && (
                        <button onClick={() => removerItem(item.id)} disabled={removendo === item.id}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors shrink-0">
                          {removendo === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer — fechar mês */}
        {!loading && !fechada && comanda && itens.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button onClick={fecharMes} disabled={fechando}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {fechando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Fechar mês · R$ {Number(comanda.total_liquido).toFixed(2).replace('.', ',')} a descontar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card de membro ───────────────────────────────────────────────────────────
function CardMembro({ membro, onAtualizado }: { membro: Membro; onAtualizado: () => void }) {
  const [loading,       setLoading]       = useState<string | null>(null)
  const [erro,          setErro]          = useState('')
  const [drawerAberto,  setDrawerAberto]  = useState(false)

  const status  = statusMembro(membro)
  const sCfg    = STATUS_CONFIG[status]
  const cCfg    = CARGO_CONFIG[membro.cargo]

  async function acao(tipo: string) {
    setErro('')
    setLoading(tipo)
    let res: Response
    if (tipo === 'reenviar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reenviar' }) })
    } else if (tipo === 'ativar' || tipo === 'desativar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: tipo === 'ativar' }) })
    } else if (tipo === 'promover' || tipo === 'rebaixar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargo: tipo === 'promover' ? 'admin' : 'operador' }) })
    } else if (tipo === 'remover') {
      if (!confirm(`Remover ${membro.nome} da equipe?`)) { setLoading(null); return }
      res = await fetch(`/api/admin/usuarios/${membro.id}`, { method: 'DELETE' })
    } else { setLoading(null); return }

    setLoading(null)
    const data = await res.json()
    if (!res.ok) { setErro(data.error ?? 'Erro.'); return }
    onAtualizado()
  }

  return (
    <>
      {drawerAberto && <DrawerComanda membro={membro} onClose={() => setDrawerAberto(false)} />}

      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${membro.cargo === 'admin' ? 'bg-purple-100' : 'bg-teal-50'}`}>
              {membro.cargo === 'admin' ? <Shield className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 text-teal-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{membro.nome}</p>
              <p className="text-xs text-slate-400 truncate">{membro.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cCfg.cor}`}>{cCfg.label}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sCfg.cor}`}>{sCfg.label}</span>
          </div>
        </div>

        {/* Consumo do funcionário */}
        {status === 'ativo' && (
          <button
            onClick={() => setDrawerAberto(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
              <span className="text-xs font-semibold text-slate-500 group-hover:text-orange-600 transition-colors">Consumo do mês</span>
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-orange-500 transition-colors">
              {membro.desconto_funcionario > 0 ? `${membro.desconto_funcionario}% desconto` : 'Sem desconto'}
            </span>
          </button>
        )}

        {erro && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          {(status === 'pendente' || status === 'expirado') && (
            <button onClick={() => acao('reenviar')} disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40">
              {loading === 'reenviar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Reenviar convite
            </button>
          )}
          {status === 'ativo' && (
            <button onClick={() => acao('desativar')} disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
              {loading === 'desativar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}Desativar
            </button>
          )}
          {status === 'inativo' && (
            <button onClick={() => acao('ativar')} disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40">
              {loading === 'ativar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}Reativar
            </button>
          )}
          {status === 'ativo' && membro.cargo === 'operador' && (
            <button onClick={() => acao('promover')} disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-40">
              {loading === 'promover' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}Tornar Admin
            </button>
          )}
          {status === 'ativo' && membro.cargo === 'admin' && (
            <button onClick={() => acao('rebaixar')} disabled={!!loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40">
              {loading === 'rebaixar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}Tornar Operador
            </button>
          )}
          <button onClick={() => acao('remover')} disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 ml-auto">
            {loading === 'remover' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}Remover
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EquipePage() {
  const [membros,        setMembros]        = useState<Membro[]>([])
  const [carregando,     setCarregando]     = useState(true)
  const [modalAberto,    setModalAberto]    = useState(false)
  const [conviteEnviado, setConviteEnviado] = useState(false)

  async function carregar() {
    setCarregando(true)
    const res  = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setMembros(data.usuarios ?? [])
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  function handleConvidado() {
    setConviteEnviado(true)
    carregar()
    setTimeout(() => setConviteEnviado(false), 4000)
  }

  const ativos    = membros.filter((m) => statusMembro(m) === 'ativo')
  const pendentes = membros.filter((m) => ['pendente', 'expirado'].includes(statusMembro(m)))
  const inativos  = membros.filter((m) => statusMembro(m) === 'inativo')

  return (
    <>
      {modalAberto && <ModalConvite onClose={() => setModalAberto(false)} onConvidado={handleConvidado} />}

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">GESTÃO</p>
            <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
            <p className="text-sm text-slate-400 mt-0.5">{membros.length} {membros.length === 1 ? 'membro' : 'membros'} no total</p>
          </div>
          <Button onClick={() => setModalAberto(true)} className="font-bold text-white gap-2 shrink-0" style={{ background: '#1A9B8A' }}>
            <UserPlus className="w-4 h-4" />Convidar membro
          </Button>
        </div>

        {conviteEnviado && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium px-4 py-3 rounded-xl">
            <MailCheck className="w-4 h-4 shrink-0" />
            Convite enviado! O membro receberá um e-mail com o link de acesso.
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>
        ) : membros.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-slate-600 font-medium">Nenhum membro na equipe</p>
            <p className="text-slate-400 text-sm mt-1 mb-5">Convide garçons, cozinheiros e administradores.</p>
            <Button onClick={() => setModalAberto(true)} className="font-bold text-white gap-2" style={{ background: '#1A9B8A' }}>
              <UserPlus className="w-4 h-4" />Convidar primeiro membro
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {ativos.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ativos · {ativos.length}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ativos.map((m) => <CardMembro key={m.id} membro={m} onAtualizado={carregar} />)}
                </div>
              </section>
            )}
            {pendentes.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Convites pendentes · {pendentes.length}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pendentes.map((m) => <CardMembro key={m.id} membro={m} onAtualizado={carregar} />)}
                </div>
              </section>
            )}
            {inativos.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Inativos · {inativos.length}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {inativos.map((m) => <CardMembro key={m.id} membro={m} onAtualizado={carregar} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}
