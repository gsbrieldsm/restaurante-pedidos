'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowRight, ChefHat } from 'lucide-react'
import Link from 'next/link'

function RegistroForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [nome,            setNome]            = useState('')
  const [nomeRestaurante, setNomeRestaurante] = useState('')
  const [email,           setEmail]           = useState('')
  const [senha,           setSenha]           = useState('')
  const [salvando,        setSalvando]        = useState(false)
  const [erro,            setErro]            = useState('')
  const [refCodigo,       setRefCodigo]       = useState<string | null>(null)

  useEffect(() => {
    // Captura ?ref= da URL e persiste em sessionStorage
    const ref = searchParams.get('ref')
    if (ref) {
      sessionStorage.setItem('ref_indicacao', ref)
      setRefCodigo(ref)
    } else {
      const salvo = sessionStorage.getItem('ref_indicacao')
      if (salvo) setRefCodigo(salvo)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const resp = await fetch('/api/tenant/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'registrar',
        nome,
        nome_restaurante: nomeRestaurante,
        email,
        senha,
        ref_codigo: refCodigo ?? undefined,
      }),
    })

    const data = await resp.json()

    if (!resp.ok) {
      setErro(data.error || 'Erro ao criar conta.')
      setSalvando(false)
      return
    }

    // Redireciona para confirmar e-mail
    router.push(`/aguardando-verificacao?email=${encodeURIComponent(email)}`)
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
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400">Menuê+</p>
          </div>
          <h1 className="text-3xl font-black leading-tight">Crie sua conta</h1>
          <p className="text-white/60 text-sm mt-2">
            Configure seu restaurante em minutos e comece a receber pedidos pelo QR Code.
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="restaurante">Nome do restaurante</Label>
              <Input
                id="restaurante"
                placeholder="Ex: Boteco do João"
                value={nomeRestaurante}
                onChange={(e) => setNomeRestaurante(e.target.value)}
                required
                className="h-11"
              />
              {nomeRestaurante && (
                <p className="text-xs text-slate-400">
                  Seu painel ficará em:{' '}
                  <span className="font-mono text-teal-600">
                    {nomeRestaurante
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[̀-ͯ]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 30)}
                    .menue.com.br
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
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
              disabled={salvando}
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...</>
                : <><ArrowRight className="w-4 h-4 mr-2" /> Criar minha conta</>
              }
            </Button>

            <p className="text-center text-sm text-slate-400">
              Já tem conta?{' '}
              <Link href="/login" className="text-teal-600 font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0FAFA' }}>
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    }>
      <RegistroForm />
    </Suspense>
  )
}
