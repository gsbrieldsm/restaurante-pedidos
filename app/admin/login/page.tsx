'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'

  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const resp = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })

    setLoading(false)

    if (resp.ok) {
      router.push(next)
      router.refresh()
    } else {
      setErro('Senha incorreta. Tente novamente.')
      setSenha('')
    }
  }

  return (
    <form onSubmit={entrar} className="w-full space-y-4">
      <div className="space-y-2">
        <label className="text-white/50 text-xs font-bold uppercase tracking-widest">
          Senha de acesso
        </label>
        <div className="relative">
          <input
            autoFocus
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

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center px-6">

      {/* Glow teal */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,155,138,0.3) 0%, rgba(26,155,138,0.06) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            <span className="text-2xl font-black text-white">M+</span>
          </div>
          <div className="text-center">
            <h1 className="text-white font-black text-2xl">Meu Menu+</h1>
            <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">Acesso restrito</p>
          </div>
        </div>

        {/* useSearchParams precisa de Suspense */}
        <Suspense fallback={<div className="w-full h-24" />}>
          <LoginForm />
        </Suspense>

        <p className="text-white/15 text-xs">Meu Menu+ · Painel de Gestão</p>
      </div>
    </div>
  )
}
