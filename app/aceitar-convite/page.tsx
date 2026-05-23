'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const CARGO_LABEL: Record<string, string> = {
  admin:    'Administrador',
  operador: 'Operador',
}

interface DadosConvite {
  nome:            string
  email:           string
  cargo:           string
  nomeRestaurante: string
}

function AceitarConviteForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [estado,  setEstado]  = useState<'carregando' | 'form' | 'sucesso' | 'erro'>('carregando')
  const [dados,   setDados]   = useState<DadosConvite | null>(null)
  const [erroMsg, setErroMsg] = useState('')

  const [senha,     setSenha]    = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar,   setMostrar]   = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [erroForm,  setErroForm]  = useState('')

  // Valida o token ao carregar
  useEffect(() => {
    if (!token) {
      setEstado('erro')
      setErroMsg('Link inválido. Solicite um novo convite ao administrador.')
      return
    }

    fetch(`/api/tenant/aceitar-convite?token=${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setDados(data.usuario)
          setEstado('form')
        } else {
          setEstado('erro')
          setErroMsg(data.error ?? 'Convite inválido.')
        }
      })
      .catch(() => {
        setEstado('erro')
        setErroMsg('Erro ao verificar convite. Tente novamente.')
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroForm('')

    if (senha.length < 6) {
      setErroForm('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErroForm('As senhas não coincidem.')
      return
    }

    setSalvando(true)

    try {
      const res  = await fetch('/api/tenant/aceitar-convite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, senha }),
      })
      const data = await res.json()

      if (res.ok) {
        setEstado('sucesso')
        setTimeout(() => router.push('/operador/login'), 3000)
      } else {
        setErroForm(data.error ?? 'Erro ao ativar conta.')
      }
    } catch {
      setErroForm('Erro ao ativar conta. Tente novamente.')
    } finally {
      setSalvando(false)
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
          <ChefHat className="w-5 h-5 text-teal-400" />
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+</p>
        </div>
        <h1 className="text-3xl font-black leading-tight">
          {estado === 'carregando' && 'Verificando convite...'}
          {estado === 'form'       && 'Criar sua senha'}
          {estado === 'sucesso'    && 'Conta ativada! ✅'}
          {estado === 'erro'       && 'Convite inválido'}
        </h1>
        {dados && estado === 'form' && (
          <p className="text-white/60 text-sm mt-2">
            {dados.nomeRestaurante} · {CARGO_LABEL[dados.cargo] ?? dados.cargo}
          </p>
        )}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8">

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
          </div>
        )}

        {/* Sucesso */}
        {estado === 'sucesso' && (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-5" />
            <p className="text-slate-700 text-base font-medium mb-2">Sua senha foi criada!</p>
            <p className="text-slate-500 text-sm mb-4">
              Você será redirecionado para o login automaticamente.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecionando...
            </div>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="text-center py-4">
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-5" />
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{erroMsg}</p>
            <Link
              href="/operador/login"
              className="text-teal-600 font-medium text-sm hover:underline"
            >
              Ir para o login
            </Link>
          </div>
        )}

        {/* Formulário */}
        {estado === 'form' && dados && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados do convidado */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sua conta</p>
              <p className="text-sm font-semibold text-slate-700">{dados.nome}</p>
              <p className="text-xs text-slate-500">{dados.email}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Criar senha</Label>
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
              <Label htmlFor="confirmar">Confirmar senha</Label>
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

            {erroForm && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {erroForm}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold text-white hover:opacity-90"
              style={{ background: '#1A9B8A' }}
              disabled={salvando || !senha || !confirmar}
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ativando conta...</>
                : 'Ativar minha conta →'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AceitarConvitePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Suspense fallback={<div className="w-full max-w-md h-64 bg-white rounded-2xl animate-pulse" />}>
        <AceitarConviteForm />
      </Suspense>
    </div>
  )
}
