'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

function AguardandoContent() {
  const searchParams  = useSearchParams()
  const email         = searchParams.get('email') ?? ''
  const [enviando, setEnviando] = useState(false)
  const [enviado,  setEnviado]  = useState(false)
  const [erro,     setErro]     = useState('')

  async function reenviar() {
    if (!email || enviando) return
    setEnviando(true)
    setErro('')
    try {
      await fetch('/api/tenant/reenviar-verificacao', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      setEnviado(true)
    } catch {
      setErro('Erro ao reenviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
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
        <h1 className="text-3xl font-black leading-tight">Confirme seu e-mail</h1>
        <p className="text-white/60 text-sm mt-2">Sua conta está quase pronta!</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-teal-500" />
        </div>

        <p className="text-slate-700 text-base font-medium mb-2">
          Enviamos um e-mail de confirmação para:
        </p>
        <p className="text-teal-700 font-bold text-base mb-6 break-all">{email || 'seu endereço'}</p>

        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Abra o e-mail e clique em <strong>Confirmar e-mail</strong> para ativar sua conta.
          Verifique também a pasta de spam.
        </p>

        {enviado ? (
          <div className="flex items-center justify-center gap-2 text-teal-600 text-sm font-medium bg-teal-50 rounded-xl px-4 py-3 mb-4">
            <CheckCircle className="w-4 h-4" />
            E-mail reenviado com sucesso!
          </div>
        ) : (
          <button
            onClick={reenviar}
            disabled={enviando || !email}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 mb-4"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Reenviando...</>
              : 'Não recebi o e-mail — reenviar'}
          </button>
        )}

        {erro && (
          <p className="text-red-500 text-sm mb-4">{erro}</p>
        )}

        <Link href="/login" className="text-sm text-slate-400 hover:text-teal-600 transition-colors">
          ← Voltar para o login
        </Link>
      </div>
    </div>
  )
}

export default function AguardandoVerificacaoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Suspense fallback={<div className="w-full max-w-md h-64 bg-white rounded-2xl animate-pulse" />}>
        <AguardandoContent />
      </Suspense>
    </div>
  )
}
