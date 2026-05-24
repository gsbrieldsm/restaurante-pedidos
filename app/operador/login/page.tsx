'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff, ChevronRight, Building2 } from 'lucide-react'

interface Opcao {
  usuario_id:       string
  nome:             string
  cargo:            string
  tenant_id:        string
  nome_restaurante: string
}

// ─── Seletor de restaurante ──────────────────────────────────────────────────
function SeletorRestaurante({
  opcoes,
  next,
  onVoltar,
}: {
  opcoes:   Opcao[]
  next:     string
  onVoltar: () => void
}) {
  const router    = useRouter()
  const [selecionando, setSelecionando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  async function selecionar(op: Opcao) {
    setSelecionando(op.usuario_id)
    setErro('')

    const res = await fetch('/api/admin/auth/selecionar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ usuario_id: op.usuario_id }),
    })

    if (res.ok) {
      router.push(next)
      router.refresh()
    } else {
      const data = await res.json()
      setErro(data.error ?? 'Erro ao selecionar.')
      setSelecionando(null)
    }
  }

  const CARGO_LABEL: Record<string, string> = {
    admin:    'Administrador',
    operador: 'Operador',
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-2">
        <p className="text-white/70 text-sm">
          Você tem acesso a <strong className="text-white">{opcoes.length} restaurantes</strong>.
          Qual deseja acessar?
        </p>
      </div>

      <div className="space-y-2">
        {opcoes.map((op) => (
          <button
            key={op.usuario_id}
            onClick={() => selecionar(op)}
            disabled={!!selecionando}
            className="w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-teal-500/40 transition-all text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-teal-900/60 border border-teal-700/40 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold leading-tight truncate">
                  {op.nome_restaurante}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {CARGO_LABEL[op.cargo] ?? op.cargo}
                </p>
              </div>
            </div>

            {selecionando === op.usuario_id
              ? <Loader2 className="w-4 h-4 text-teal-400 animate-spin shrink-0" />
              : <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />}
          </button>
        ))}
      </div>

      {erro && (
        <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <button
        onClick={onVoltar}
        className="w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors pt-2"
      >
        ← Voltar para o login
      </button>
    </div>
  )
}

// ─── Formulário de login ─────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'

  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro,    setErro]    = useState('')
  const [loading, setLoading] = useState(false)
  const [opcoes,  setOpcoes]  = useState<Opcao[] | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const body: Record<string, string> = { senha }
    if (email.trim()) body.email = email.trim()

    const resp = await fetch('/api/admin/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    setLoading(false)

    const data = await resp.json()

    if (!resp.ok) {
      setErro(data.error ?? 'Erro ao entrar. Tente novamente.')
      setSenha('')
      return
    }

    // Múltiplos restaurantes → mostra seletor
    if (data.multiplos_tenants) {
      setOpcoes(data.opcoes)
      return
    }

    router.push(next)
    router.refresh()
  }

  // Mostra seletor de restaurante
  if (opcoes) {
    return (
      <SeletorRestaurante
        opcoes={opcoes}
        next={next}
        onVoltar={() => { setOpcoes(null); setSenha('') }}
      />
    )
  }

  return (
    <form onSubmit={entrar} className="w-full space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <label className="text-white/50 text-xs font-bold uppercase tracking-widest">Email</label>
        <input
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-teal-500/60 focus:bg-white/8 transition-all"
        />
      </div>

      {/* Senha */}
      <div className="space-y-2">
        <label className="text-white/50 text-xs font-bold uppercase tracking-widest">Senha</label>
        <div className="relative">
          <input
            type={mostrar ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 pr-12 text-sm outline-none focus:border-teal-500/60 focus:bg-white/8 transition-all"
          />
          <button
            type="button"
            onClick={() => setMostrar(!mostrar)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {erro && (
        <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!senha || loading}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
          : 'Entrar →'}
      </button>
    </form>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0a2420 0%, #0f3d35 45%, #155f50 100%)' }}
    >
      {/* Glow sutil */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(26,155,138,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Detalhe geométrico decorativo */}
      <div
        className="pointer-events-none absolute bottom-0 right-0"
        style={{
          width: '400px', height: '400px',
          background: 'radial-gradient(circle at bottom right, rgba(26,155,138,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo + saudação */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #1A9B8A, #0f6b5e)' }}
          >
            <span className="text-2xl font-black text-white">M+</span>
          </div>

          <div>
            <h1 className="text-white font-black text-2xl tracking-tight">Menuê+</h1>
            <p
              className="mt-3 text-lg font-semibold leading-snug"
              style={{ color: 'rgba(94,234,212,0.9)' }}
            >
              Que hoje seja um grande dia,
            </p>
            <p className="text-white/80 text-base font-medium">
              vamos começar? 🚀
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="w-full h-32" />}>
          <LoginForm />
        </Suspense>

        <p className="text-white/15 text-xs">Menuê+ · Acesso da Equipe</p>
      </div>
    </div>
  )
}
