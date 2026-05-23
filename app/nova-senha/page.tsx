'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function NovaSenhaForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [senha,      setSenha]    = useState('')
  const [confirmar,  setConfirmar] = useState('')
  const [mostrar,    setMostrar]   = useState(false)
  const [salvando,   setSalvando]  = useState(false)
  const [sucesso,    setSucesso]   = useState(false)
  const [erro,       setErro]      = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    try {
      const res  = await fetch('/api/tenant/nova-senha', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, senha }),
      })
      const data = await res.json()

      if (res.ok) {
        setSucesso(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setErro(data.error ?? 'Erro ao redefinir senha.')
      }
    } catch {
      setErro('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-10 text-center">
        <XCircle className="w-14 h-14 text-red-400 mx-auto mb-5" />
        <p className="text-slate-600 text-sm mb-6">Link inválido. Solicite um novo e-mail de redefinição.</p>
        <Link href="/recuperar-senha" className="text-teal-600 font-medium text-sm hover:underline">
          Recuperar senha
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8">
      {sucesso ? (
        <div className="text-center py-4">
          <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-5" />
          <p className="text-slate-700 text-base font-medium mb-2">Senha redefinida!</p>
          <p className="text-slate-500 text-sm mb-4">Você será redirecionado para o login.</p>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecionando...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="senha">Nova senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={mostrar ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoFocus
                className="h-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar nova senha</Label>
            <Input
              id="confirmar"
              type={mostrar ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
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
            className="w-full h-12 text-base font-bold text-white hover:opacity-90"
            style={{ background: '#1A9B8A' }}
            disabled={salvando || !senha || !confirmar}
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              : 'Salvar nova senha'}
          </Button>

          <p className="text-center text-sm text-slate-400">
            <Link href="/login" className="text-teal-600 font-medium hover:underline">
              ← Cancelar
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}

export default function NovaSenhaPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-4 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-4">Menuê+</p>
          <h1 className="text-3xl font-black leading-tight">Nova senha</h1>
          <p className="text-white/60 text-sm mt-2">Crie uma senha forte para proteger sua conta.</p>
        </div>

        <Suspense fallback={<div className="w-full h-64 bg-white rounded-2xl animate-pulse" />}>
          <NovaSenhaForm />
        </Suspense>
      </div>
    </div>
  )
}
