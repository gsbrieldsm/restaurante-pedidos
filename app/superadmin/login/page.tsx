'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLogin() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await fetch('/api/superadmin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })

    setCarregando(false)

    if (!res.ok) {
      const { error } = await res.json()
      setErro(error ?? 'Senha incorreta')
      return
    }

    router.push('/superadmin')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0a1628' }}>

      {/* Glow de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #1A9B8A, transparent)' }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 mx-auto"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)', boxShadow: '0 0 40px rgba(26,155,138,0.3)' }}>
            <span className="text-2xl font-black text-white">M</span>
          </div>
          <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#1A9B8A' }}>Meu Menu+</p>
          <h1 className="text-2xl font-black text-white">Acesso Master</h1>
          <p className="text-white/40 text-sm mt-1">Painel exclusivo do sistema</p>
        </div>

        {/* Card */}
        <form onSubmit={entrar} className="rounded-2xl p-8 space-y-4 border"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

          <div>
            <label className="block text-sm font-semibold text-white/60 mb-2">Senha master</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/20 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1A9B8A'; e.target.style.boxShadow = '0 0 0 3px rgba(26,155,138,0.15)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
              autoFocus
            />
          </div>

          {erro && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando || !senha}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
