'use client'

import { useState } from 'react'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function RecuperarSenhaPage() {
  const [email,    setEmail]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado,  setEnviado]  = useState(false)
  const [erro,     setErro]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      await fetch('/api/tenant/recuperar-senha', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      // Sempre mostra sucesso (evita enumerar e-mails)
      setEnviado(true)
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
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
            <Mail className="w-5 h-5 text-teal-400" />
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+</p>
          </div>
          <h1 className="text-3xl font-black leading-tight">Esqueceu a senha?</h1>
          <p className="text-white/60 text-sm mt-2">Enviaremos um link para redefinir sua senha.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8">
          {enviado ? (
            <div className="text-center py-4">
              <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-5" />
              <p className="text-slate-700 text-base font-medium mb-2">E-mail enviado!</p>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Se existe uma conta com <strong>{email}</strong>, você receberá um link para redefinir sua senha em breve.
                Verifique também a pasta de spam.
              </p>
              <Link href="/login" className="text-sm text-teal-600 font-medium hover:underline">
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail da sua conta</Label>
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

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {erro}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold text-white hover:opacity-90"
                style={{ background: '#1A9B8A' }}
                disabled={enviando || !email}
              >
                {enviando
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  : 'Enviar link de redefinição'}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Lembrou a senha?{' '}
                <Link href="/login" className="text-teal-600 font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
