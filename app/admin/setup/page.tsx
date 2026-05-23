'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/admin/setup')
      .then((r) => r.json())
      .then(({ semUsuarios }) => {
        if (!semUsuarios) {
          // Já tem usuários — vai pro login normal
          router.replace('/admin/login')
        } else {
          setVerificando(false)
        }
      })
  }, [router])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const resp = await fetch('/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    })

    const data = await resp.json()
    setSalvando(false)

    if (!resp.ok) { setErro(data.error ?? 'Erro ao criar usuário'); return }

    // Criou — vai pro login para entrar com as credenciais novas
    router.push('/admin/login')
  }

  if (verificando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center px-6">

      {/* Glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,155,138,0.3) 0%, rgba(26,155,138,0.06) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-black text-2xl">Primeiro Acesso</h1>
            <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">
              Crie o usuário administrador
            </p>
          </div>
        </div>

        <div className="w-full bg-teal-900/30 border border-teal-700/40 rounded-xl px-4 py-3 text-teal-300 text-xs text-center">
          Este formulário só aparece uma vez, enquanto não há usuários cadastrados.
        </div>

        <form onSubmit={criar} className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-white/50 text-xs font-bold uppercase tracking-widest">Seu nome</label>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Gabriel Moraes"
              required
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-teal-500/60 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/50 text-xs font-bold uppercase tracking-widest">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-teal-500/60 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/50 text-xs font-bold uppercase tracking-widest">Senha</label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 pr-12 text-sm outline-none focus:border-teal-500/60 transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={!nome || !email || !senha || salvando}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
              : 'Criar administrador →'}
          </button>
        </form>

        <p className="text-white/15 text-xs">Menuê+ · Configuração inicial</p>
      </div>
    </div>
  )
}
