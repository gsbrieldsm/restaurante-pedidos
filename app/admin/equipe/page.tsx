'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus, Loader2, MailCheck, UserX, UserCheck,
  Trash2, RefreshCw, Shield, User, X, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Membro {
  id:               string
  nome:             string
  email:            string
  cargo:            'admin' | 'operador'
  ativo:            boolean
  convite_aceito:   boolean
  convite_expira_em: string | null
  criado_em:        string
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
            <p className="text-xs text-slate-400 mt-0.5">
              Um e-mail com link de acesso será enviado automaticamente.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              autoFocus
              placeholder="Ex: João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['operador', 'admin'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCargo(c)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    cargo === c
                      ? c === 'admin'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {c === 'admin' ? '🛡️ Admin' : '👤 Operador'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {cargo === 'admin'
                ? 'Acesso completo: cardápio, financeiro, configurações e equipe.'
                : 'Acesso ao painel operacional: pedidos, estações e garçom.'}
            </p>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {erro}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-bold text-white"
            style={{ background: '#1A9B8A' }}
            disabled={enviando || !nome || !email}
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando convite...</>
              : <><Send className="w-4 h-4 mr-2" /> Enviar convite</>}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Card de membro ───────────────────────────────────────────────────────────
function CardMembro({ membro, onAtualizado }: { membro: Membro; onAtualizado: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [erro,    setErro]    = useState('')

  const status  = statusMembro(membro)
  const sCfg    = STATUS_CONFIG[status]
  const cCfg    = CARGO_CONFIG[membro.cargo]

  async function acao(tipo: string) {
    setErro('')
    setLoading(tipo)

    let res: Response

    if (tipo === 'reenviar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'reenviar' }),
      })
    } else if (tipo === 'ativar' || tipo === 'desativar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ativo: tipo === 'ativar' }),
      })
    } else if (tipo === 'promover' || tipo === 'rebaixar') {
      res = await fetch(`/api/admin/usuarios/${membro.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cargo: tipo === 'promover' ? 'admin' : 'operador' }),
      })
    } else if (tipo === 'remover') {
      if (!confirm(`Remover ${membro.nome} da equipe?`)) { setLoading(null); return }
      res = await fetch(`/api/admin/usuarios/${membro.id}`, { method: 'DELETE' })
    } else {
      setLoading(null); return
    }

    setLoading(null)
    const data = await res.json()
    if (!res.ok) { setErro(data.error ?? 'Erro.'); return }
    onAtualizado()
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            membro.cargo === 'admin' ? 'bg-purple-100' : 'bg-teal-50'
          }`}>
            {membro.cargo === 'admin'
              ? <Shield className="w-5 h-5 text-purple-600" />
              : <User  className="w-5 h-5 text-teal-600"   />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{membro.nome}</p>
            <p className="text-xs text-slate-400 truncate">{membro.email}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cCfg.cor}`}>
            {cCfg.label}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sCfg.cor}`}>
            {sCfg.label}
          </span>
        </div>
      </div>

      {/* Erro inline */}
      {erro && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2 pt-1">

        {/* Convite pendente ou expirado → reenviar */}
        {(status === 'pendente' || status === 'expirado') && (
          <button
            onClick={() => acao('reenviar')}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
          >
            {loading === 'reenviar'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />}
            Reenviar convite
          </button>
        )}

        {/* Ativo → desativar */}
        {status === 'ativo' && (
          <button
            onClick={() => acao('desativar')}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            {loading === 'desativar'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <UserX className="w-3 h-3" />}
            Desativar
          </button>
        )}

        {/* Inativo → reativar */}
        {status === 'inativo' && (
          <button
            onClick={() => acao('ativar')}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            {loading === 'ativar'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <UserCheck className="w-3 h-3" />}
            Reativar
          </button>
        )}

        {/* Promover / Rebaixar cargo (só para ativos) */}
        {status === 'ativo' && membro.cargo === 'operador' && (
          <button
            onClick={() => acao('promover')}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-40"
          >
            {loading === 'promover'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Shield className="w-3 h-3" />}
            Tornar Admin
          </button>
        )}

        {status === 'ativo' && membro.cargo === 'admin' && (
          <button
            onClick={() => acao('rebaixar')}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            {loading === 'rebaixar'
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <User className="w-3 h-3" />}
            Tornar Operador
          </button>
        )}

        {/* Remover (sempre disponível) */}
        <button
          onClick={() => acao('remover')}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 ml-auto"
        >
          {loading === 'remover'
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Trash2 className="w-3 h-3" />}
          Remover
        </button>
      </div>
    </div>
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

  // Agrupa por status
  const ativos   = membros.filter((m) => statusMembro(m) === 'ativo')
  const pendentes = membros.filter((m) => ['pendente', 'expirado'].includes(statusMembro(m)))
  const inativos  = membros.filter((m) => statusMembro(m) === 'inativo')

  return (
    <>
      {modalAberto && (
        <ModalConvite
          onClose={() => setModalAberto(false)}
          onConvidado={handleConvidado}
        />
      )}

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">GESTÃO</p>
            <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {membros.length} {membros.length === 1 ? 'membro' : 'membros'} no total
            </p>
          </div>
          <Button
            onClick={() => setModalAberto(true)}
            className="font-bold text-white gap-2 shrink-0"
            style={{ background: '#1A9B8A' }}
          >
            <UserPlus className="w-4 h-4" />
            Convidar membro
          </Button>
        </div>

        {/* Toast convite enviado */}
        {conviteEnviado && (
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium px-4 py-3 rounded-xl">
            <MailCheck className="w-4 h-4 shrink-0" />
            Convite enviado! O membro receberá um e-mail com o link de acesso.
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : membros.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-slate-600 font-medium">Nenhum membro na equipe</p>
            <p className="text-slate-400 text-sm mt-1 mb-5">
              Convide garçons, cozinheiros e administradores.
            </p>
            <Button
              onClick={() => setModalAberto(true)}
              className="font-bold text-white gap-2"
              style={{ background: '#1A9B8A' }}
            >
              <UserPlus className="w-4 h-4" />
              Convidar primeiro membro
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {ativos.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Ativos · {ativos.length}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ativos.map((m) => (
                    <CardMembro key={m.id} membro={m} onAtualizado={carregar} />
                  ))}
                </div>
              </section>
            )}

            {pendentes.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Convites pendentes · {pendentes.length}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pendentes.map((m) => (
                    <CardMembro key={m.id} membro={m} onAtualizado={carregar} />
                  ))}
                </div>
              </section>
            )}

            {inativos.length > 0 && (
              <section>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Inativos · {inativos.length}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {inativos.map((m) => (
                    <CardMembro key={m.id} membro={m} onAtualizado={carregar} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}
