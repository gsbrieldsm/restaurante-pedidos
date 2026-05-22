'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, LogIn, ChefHat } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro,     setErro]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEntrando(true)

    const resp = await fetch('/api/tenant/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'login', email, senha }),
    })

    const data = await resp.json()

    if (!resp.ok) {
      setErro(data.error || 'Erro ao entrar.')
      setEntrando(false)
      return
    }

    const { tenant } = data

    // Se ainda não aceitou o plano → vai para planos
    if (!tenant.plano_aceito_em) {
      router.push('/planos')
      return
    }

    // Vai para o painel admin
    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-4 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="w-5 h-5 text-teal-400" />
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Meu Menu+</p>
          </div>
          <h1 className="text-3xl font-black leading-tight">Bem-vindo de volta</h1>
          <p className="text-white/60 text-sm mt-2">Acesse o painel do seu restaurante.</p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {erro}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold text-black hover:opacity-90"
              style={{ background: '#1A9B8A' }}
              disabled={entrando}
            >
              {entrando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                : <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
              }
            </Button>

            <p className="text-center text-sm text-slate-400">
              Ainda não tem conta?{' '}
              <Link href="/registro" className="text-teal-600 font-medium hover:underline">
                Criar agora
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
