'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowRight, BookUser, ChefHat, Eye, EyeOff } from 'lucide-react'
import { darkenHex, hexToRgbParts } from '@/lib/cor'

export default function IdentificacaoPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [mesa, setMesa] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [transferindo, setTransferindo] = useState(false)
  const [modoFuncionario, setModoFuncionario] = useState(false)
  const [funcEmail, setFuncEmail] = useState('')
  const [funcSenha, setFuncSenha] = useState('')
  const [funcSenhaVisivel, setFuncSenhaVisivel] = useState(false)
  const [funcErro, setFuncErro] = useState('')
  const [funcSalvando, setFuncSalvando] = useState(false)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [branding, setBranding] = useState<{
    restaurante_nome:     string
    restaurante_logo_url: string | null
    cor_primaria:         string
  }>({ restaurante_nome: '', restaurante_logo_url: null, cor_primaria: '#1A9B8A' })

  const cor         = branding.cor_primaria
  const rgb         = hexToRgbParts(cor)
  const heroGradient = `linear-gradient(135deg, ${darkenHex(cor, 0.10)} 0%, ${darkenHex(cor, 0.28)} 50%, ${cor} 100%)`

  useEffect(() => {
    // Pré-preenche com dados salvos do último acesso
    const nomeSalvo = localStorage.getItem('mmu_cliente_nome')
    const whatsappSalvo = localStorage.getItem('mmu_cliente_whatsapp')
    if (nomeSalvo) setNome(nomeSalvo)
    if (whatsappSalvo) setWhatsapp(whatsappSalvo)

    // Carrega branding do restaurante (passa token para resolver o tenant via mesa)
    fetch(`/api/configuracoes/banner?mesa_token=${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.branding) setBranding(d.branding) })
      .catch(() => {})

    // Verifica sessão: sessionStorage (mesma aba) tem prioridade
    const sessaoIdSession = sessionStorage.getItem('sessao_id')
    const sessaoIdLocal   = localStorage.getItem(`menue_sess_${token}`)
    const nomeSession     = sessionStorage.getItem('cliente_nome')
    const nomeLocal       = localStorage.getItem(`menue_sess_nome_${token}`)

    if (sessaoIdLocal) {
      // Sessão salva para ESTA MESA no localStorage → mesmo cliente, mesma mesa.
      // Nunca mostra "Transferindo" — vai direto para o cardápio.
      // (isso cobre tanto o retorno após fechar o browser quanto o redirect da confirmação)
      sessionStorage.setItem('sessao_id', sessaoIdLocal)
      if (nomeLocal) sessionStorage.setItem('cliente_nome', nomeLocal)
      router.push(`/mesa/${token}/cardapio`)
      return
    }

    // Sem localStorage para este token: só tem sessão no sessionStorage.
    // Pode ser: (a) cliente vindo de outra mesa, ou (b) sessão expirada no servidor.
    // Valida a sessão antes de decidir mostrar "Transferindo".
    const sessaoId    = sessaoIdSession
    const nomeGuardado = nomeSession

    if (sessaoId) {
      // Bloco async em IIFE para poder usar await dentro do useEffect
      ;(async () => {
        // Valida se a sessão ainda está ativa no servidor antes de decidir mostrar "Transferindo"
        try {
          const check = await fetch(`/api/sessao?id=${sessaoId}`)
          const checkData = await check.json()
          if (checkData.ativa === false) {
            // Sessão expirada — limpa storages e mostra formulário
            sessionStorage.removeItem('sessao_id')
            sessionStorage.removeItem('cliente_nome')
            sessionStorage.removeItem('is_delivery')
            localStorage.removeItem(`menue_sess_${token}`)
            localStorage.removeItem(`menue_sess_nome_${token}`)
            localStorage.removeItem(`menue_delivery_${token}`)
            carregarMesa()
            return
          }
        } catch { /* em caso de erro de rede, segue o fluxo normal */ }

        // Sessão ativa — pode ser mudança de mesa → mostrar "Transferindo".
        setTransferindo(true)
        setClienteNome(nomeGuardado)

        try {
          const r1 = await fetch(`/api/mesas/${token}`)
          const { mesa } = await r1.json()
          setMesa(mesa)

          const r2 = await fetch(`/api/mesas/${token}/sessao`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessao_id: sessaoId }),
          })
          const data = await r2.json()

          if (data.sessao) {
            router.push(`/mesa/${token}/cardapio`)
          } else {
            // Comanda expirada — limpa e pede novo cadastro
            sessionStorage.removeItem('sessao_id')
            sessionStorage.removeItem('cliente_nome')
            sessionStorage.removeItem('is_delivery')
            localStorage.removeItem(`menue_sess_${token}`)
            localStorage.removeItem(`menue_sess_nome_${token}`)
            localStorage.removeItem(`menue_delivery_${token}`)
            setTransferindo(false)
            carregarMesa()
          }
        } catch {
          setTransferindo(false)
          carregarMesa()
        }
      })()
    } else {
      carregarMesa()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function carregarMesa() {
    fetch(`/api/mesas/${token}`)
      .then((r) => r.json())
      .then(({ mesa }) => setMesa(mesa))
      .catch(() => setErro('Mesa não encontrada.'))
      .finally(() => setLoading(false))
  }

  function formatarWhatsapp(valor: string) {
    const nums = valor.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErro('Por favor, informe seu nome.'); return }
    setSalvando(true)
    setErro('')

    const resp = await fetch(`/api/mesas/${token}/sessao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: nome.trim(),
        cliente_whatsapp: whatsapp.replace(/\D/g, '') || null,
      }),
    })

    const data = await resp.json()
    if (!resp.ok) { setErro(data.error || 'Erro ao abrir comanda.'); setSalvando(false); return }

    sessionStorage.setItem('sessao_id', data.sessao.id)
    sessionStorage.setItem('cliente_nome', data.sessao.cliente_nome)
    // Persiste sessão no localStorage para sobreviver ao fechar/reabrir o link QR
    localStorage.setItem(`menue_sess_${token}`, data.sessao.id)
    localStorage.setItem(`menue_sess_nome_${token}`, data.sessao.cliente_nome)
    // Salva para pré-preencher no próximo acesso
    localStorage.setItem('mmu_cliente_nome', nome.trim())
    if (whatsapp) localStorage.setItem('mmu_cliente_whatsapp', whatsapp)
    router.push(`/mesa/${token}/cardapio`)
  }

  async function handleFuncionario(e: React.FormEvent) {
    e.preventDefault()
    setFuncErro('')
    setFuncSalvando(true)

    const res = await fetch(`/api/mesas/${token}/sessao/funcionario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: funcEmail, senha: funcSenha }),
    })

    const data = await res.json()
    setFuncSalvando(false)

    if (!res.ok) { setFuncErro(data.error ?? 'Erro ao autenticar.'); return }

    sessionStorage.setItem('sessao_id', data.sessao.id)
    sessionStorage.setItem('cliente_nome', data.funcionario.nome)
    sessionStorage.setItem('funcionario_id', data.funcionario.id)
    sessionStorage.setItem('desconto_funcionario', String(data.funcionario.desconto_funcionario))
    localStorage.setItem(`menue_sess_${token}`, data.sessao.id)
    localStorage.setItem(`menue_sess_nome_${token}`, data.funcionario.nome)
    router.push(`/mesa/${token}/cardapio`)
  }

  // ── Transferindo comanda ──
  if (transferindo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <Card className="w-full max-w-sm shadow-xl border-0 overflow-hidden">
          <div
            className="px-6 pt-8 pb-7 text-white"
            style={{ background: heroGradient }}
          >
            {branding.restaurante_logo_url && (
              <img src={branding.restaurante_logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover mb-3 border border-white/20" />
            )}
            {branding.restaurante_nome && (
              <p className="text-xs font-bold tracking-widest uppercase text-white/70 mb-1">{branding.restaurante_nome}</p>
            )}
            <h1 className="text-3xl font-black leading-tight">Olá, {clienteNome}!</h1>
            <p className="text-white/80 text-lg font-semibold mt-1">
              Mesa <span className="text-white font-black">{mesa?.numero ?? '...'}</span>
            </p>
            <p className="text-white/50 text-sm mt-2">Transferindo sua comanda...</p>
          </div>
          <CardContent className="pt-6 pb-6 flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: cor }} />
            <span className="text-sm">Atualizando sua mesa...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Carregando ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `rgba(${rgb}, 0.06)` }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor }} />
      </div>
    )
  }

  // ── Mesa não encontrada ──
  if (erro && !mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `rgba(${rgb}, 0.06)` }}>
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-red-500 font-medium">{erro}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Formulário novo cliente ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Card className="w-full max-w-sm shadow-xl border-0 overflow-hidden">
        <div
          className="px-6 pt-8 pb-7 text-white"
          style={{ background: heroGradient }}
        >
          {branding.restaurante_logo_url && (
              <img src={branding.restaurante_logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover mb-3 border border-white/20" />
            )}
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: `rgba(${rgb}, 0.75)` }}>{branding.restaurante_nome}</p>
          <h1 className="text-3xl font-black leading-tight">Bem-vindo!</h1>
          <p className="text-lg font-semibold mt-1" style={{ color: `rgba(${rgb}, 0.85)` }}>
            Mesa <span className="text-white font-black">{mesa?.numero}</span>
          </p>
          <p className="text-white/50 text-sm mt-2">Informe seu nome para abrir sua comanda</p>
        </div>
        <CardContent className="pt-6">
          {/* Toggle cliente / funcionário */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
            <button type="button" onClick={() => setModoFuncionario(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${!modoFuncionario ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
              Cliente
            </button>
            <button type="button" onClick={() => setModoFuncionario(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${modoFuncionario ? 'bg-white shadow-sm' : 'text-slate-400'}`}
              style={modoFuncionario ? { color: cor } : {}}>
              <ChefHat className="w-3.5 h-3.5" />Funcionário
            </button>
          </div>

          {/* Formulário funcionário */}
          {modoFuncionario ? (
            <form onSubmit={handleFuncionario} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="func-email">E-mail</Label>
                <Input id="func-email" type="email" placeholder="seu@email.com"
                  value={funcEmail} onChange={(e) => setFuncEmail(e.target.value)}
                  autoFocus className="h-12 text-base" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="func-senha">Senha</Label>
                <div className="relative">
                  <Input id="func-senha" type={funcSenhaVisivel ? 'text' : 'password'}
                    placeholder="••••••" value={funcSenha}
                    onChange={(e) => setFuncSenha(e.target.value)}
                    className="h-12 text-base pr-11" required />
                  <button type="button" onClick={() => setFuncSenhaVisivel(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {funcSenhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {funcErro && <p className="text-sm text-red-500">{funcErro}</p>}
              <Button type="submit" disabled={funcSalvando || !funcEmail || !funcSenha}
                className="w-full h-12 text-base font-bold text-white hover:opacity-90"
                style={{ background: cor }}>
                {funcSalvando
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Autenticando...</>
                  : <><ChefHat className="w-4 h-4 mr-2" />Entrar como funcionário</>}
              </Button>
            </form>
          ) : (
          <>
          {nome && localStorage.getItem('mmu_cliente_nome') === nome && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-4">
              <BookUser className="w-4 h-4 shrink-0" style={{ color: cor }} />
              <p className="text-xs font-medium text-slate-600">Dados do seu último acesso foram lembrados</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">
                WhatsApp <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="whatsapp"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))}
                inputMode="numeric"
                className="h-12 text-base"
              />
              <p className="text-xs text-slate-500">Para receber atualizações do seu pedido</p>
            </div>
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold text-black hover:opacity-90"
              style={{ background: branding.cor_primaria }}
              disabled={salvando}
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><ArrowRight className="w-4 h-4 mr-2" /> Abrir minha comanda</>}
            </Button>
          </form>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
