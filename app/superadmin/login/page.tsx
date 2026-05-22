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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4 mx-auto"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}>
            <span className="text-xl font-black text-white">M</span>
          </div>
          <p className="text-xs font-black tracking-widest uppercase mb-1 text-teal-600">Meu Menu+</p>
          <h1 className="text-2xl font-black text-slate-800">Acesso Master</h1>
          <p className="text-slate-400 text-sm mt-1">Painel exclusivo do sistema</p>
        </div>

        {/* Card */}
        <form onSubmit={entrar} className="bg-white rounded-2xl p-8 space-y-4 shadow-sm border border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Senha master</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-teal-400 transition-all"
              style={{ '--tw-ring-color': '#1A9B8A' } as React.CSSProperties}
              autoFocus
            />
          </div>

          {erro && (
            <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-600">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando || !senha}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            {carregando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
