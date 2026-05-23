'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token')

  const [estado, setEstado] = useState<'carregando' | 'sucesso' | 'erro'>('carregando')
  const [mensagem, setMensagem] = useState('')
  const [redirecionando, setRedirecionando] = useState(false)

  useEffect(() => {
    if (!token) {
      setEstado('erro')
      setMensagem('Link inválido. Solicite um novo e-mail de verificação.')
      return
    }

    fetch(`/api/tenant/verificar-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setEstado('sucesso')
          setRedirecionando(true)
          // Redireciona após 2s
          setTimeout(() => {
            router.push(data.precisa_plano ? '/planos' : '/admin')
          }, 2000)
        } else {
          setEstado('erro')
          setMensagem(data.error ?? 'Link inválido ou expirado.')
        }
      })
      .catch(() => {
        setEstado('erro')
        setMensagem('Erro ao verificar. Tente novamente.')
      })
  }, [token, router])

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div
        className="rounded-2xl px-8 pt-10 pb-8 text-white mb-4 shadow-xl"
        style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
      >
        <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-4">Menuê+</p>
        <h1 className="text-3xl font-black leading-tight">
          {estado === 'carregando' && 'Verificando...'}
          {estado === 'sucesso'    && 'E-mail confirmado! ✅'}
          {estado === 'erro'      && 'Link inválido'}
        </h1>
        <p className="text-white/60 text-sm mt-2">
          {estado === 'carregando' && 'Aguarde um momento.'}
          {estado === 'sucesso'    && 'Sua conta está ativa.'}
          {estado === 'erro'      && 'Não foi possível verificar seu e-mail.'}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-10 text-center">
        {estado === 'carregando' && (
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto" />
        )}

        {estado === 'sucesso' && (
          <>
            <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-5" />
            <p className="text-slate-700 text-base font-medium mb-6">
              Seu e-mail foi confirmado com sucesso!<br />
              Você será redirecionado automaticamente.
            </p>
            {redirecionando && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecionando...
              </div>
            )}
          </>
        )}

        {estado === 'erro' && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-5" />
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{mensagem}</p>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl text-sm font-bold text-white text-center transition-all"
              style={{ background: '#1A9B8A' }}
            >
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Suspense fallback={<div className="w-full max-w-md h-64 bg-white rounded-2xl animate-pulse" />}>
        <VerificarEmailContent />
      </Suspense>
    </div>
  )
}
