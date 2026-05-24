'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ParceirosLoginPage() {
  const router  = useRouter()
  const [email,    setEmail]    = useState('')
  const [erro,     setErro]     = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const res  = await fetch('/api/parceiros/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error ?? 'Erro ao autenticar.')
        return
      }

      router.push('/parceiros/painel')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 60%, #1A9B8A 100%)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/parceiros" className="inline-flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span className="text-white font-black text-lg">M+</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Menuê+</span>
          </Link>
          <p className="text-teal-300/60 text-sm mt-2">Área do Parceiro</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
        >
          <h1 className="text-white font-black text-2xl text-center mb-2">Acessar painel</h1>
          <p className="text-teal-200/60 text-sm text-center mb-8 leading-relaxed">
            Digite o e-mail com que você se cadastrou no programa de parceiros.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-teal-200/80 text-sm font-semibold">Seu e-mail</label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-400"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>

            {erro && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-red-300 leading-relaxed"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 rounded-2xl text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#1A9B8A' }}
            >
              {loading ? '⏳ Entrando...' : 'Acessar painel →'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-teal-300/40 text-xs">
            Ainda não é parceiro?{' '}
            <Link href="/parceiros#cadastro" className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors">
              Cadastre-se aqui
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
