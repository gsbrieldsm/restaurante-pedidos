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
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-black tracking-widest uppercase text-teal-400 mb-1">Meu Menu+</p>
          <h1 className="text-2xl font-bold text-white">Acesso Master</h1>
          <p className="text-slate-400 text-sm mt-1">Painel exclusivo do sistema</p>
        </div>

        <form onSubmit={entrar} className="bg-slate-900 rounded-2xl p-8 space-y-4 border border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha master</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>

          {erro && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando || !senha}
            className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
