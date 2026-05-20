'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowRight } from 'lucide-react'

export default function IdentificacaoPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [mesa, setMesa] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [transferindo, setTransferindo] = useState(false)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const sessaoId = sessionStorage.getItem('sessao_id')
    const nomeGuardado = sessionStorage.getItem('cliente_nome')

    if (sessaoId) {
      // Já tem comanda aberta — transfere para esta mesa
      setTransferindo(true)
      setClienteNome(nomeGuardado)

      fetch(`/api/mesas/${token}`)
        .then((r) => r.json())
        .then(({ mesa }) => {
          setMesa(mesa)
          // Transfere a comanda para a nova mesa
          return fetch(`/api/mesas/${token}/sessao`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessao_id: sessaoId }),
          })
        })
        .then((r) => r.json())
        .then((data) => {
          if (data.sessao) {
            // Transferência OK — vai pro cardápio
            router.push(`/mesa/${token}/cardapio`)
          } else {
            // Comanda expirada — limpa e pede novo cadastro
            sessionStorage.removeItem('sessao_id')
            sessionStorage.removeItem('cliente_nome')
            setTransferindo(false)
            carregarMesa()
          }
        })
        .catch(() => {
          setTransferindo(false)
          carregarMesa()
        })
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
    router.push(`/mesa/${token}/cardapio`)
  }

  // ── Transferindo comanda ──
  if (transferindo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <Card className="w-full max-w-sm shadow-xl border-0 overflow-hidden">
          <div
            className="px-6 pt-8 pb-7 text-white"
            style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
          >
            <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-1">Meu Menu+</p>
            <h1 className="text-3xl font-black leading-tight">Olá, {clienteNome}!</h1>
            <p className="text-teal-300 text-lg font-semibold mt-1">
              Mesa <span className="text-white font-black">{mesa?.numero ?? '...'}</span>
            </p>
            <p className="text-white/50 text-sm mt-2">Transferindo sua comanda...</p>
          </div>
          <CardContent className="pt-6 pb-6 flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span className="text-sm">Atualizando sua mesa...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Carregando ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  // ── Mesa não encontrada ──
  if (erro && !mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50 p-4">
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
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-1">Meu Menu+</p>
          <h1 className="text-3xl font-black leading-tight">Bem-vindo!</h1>
          <p className="text-teal-300 text-lg font-semibold mt-1">
            Mesa <span className="text-white font-black">{mesa?.numero}</span>
          </p>
          <p className="text-white/50 text-sm mt-2">Informe seu nome para abrir sua comanda</p>
        </div>
        <CardContent className="pt-6">
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
              style={{ background: '#1A9B8A' }}
              disabled={salvando}
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><ArrowRight className="w-4 h-4 mr-2" /> Abrir minha comanda</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
