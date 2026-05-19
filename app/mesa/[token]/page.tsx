'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UtensilsCrossed, Loader2 } from 'lucide-react'

export default function IdentificacaoPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [mesa, setMesa] = useState<any>(null)
  const [sessaoExistente, setSessaoExistente] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch(`/api/mesas/${token}`)
      .then((r) => r.json())
      .then(({ mesa, sessao }) => {
        setMesa(mesa)
        if (sessao) {
          setSessaoExistente(sessao)
          // Se já tem sessão ativa, ir direto pro cardápio
          sessionStorage.setItem('sessao_id', sessao.id)
          sessionStorage.setItem('cliente_nome', sessao.cliente_nome)
          router.push(`/mesa/${token}/cardapio`)
        }
      })
      .catch(() => setErro('Mesa não encontrada.'))
      .finally(() => setLoading(false))
  }, [token, router])

  function formatarWhatsapp(valor: string) {
    const nums = valor.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Por favor, informe seu nome.')
      return
    }
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

    if (!resp.ok) {
      setErro(data.error || 'Erro ao iniciar sessão.')
      setSalvando(false)
      return
    }

    sessionStorage.setItem('sessao_id', data.sessao.id)
    sessionStorage.setItem('cliente_nome', data.sessao.cliente_nome)
    router.push(`/mesa/${token}/cardapio`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Card className="w-full max-w-sm shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src="/logo.png" alt="Meu Menu+" className="h-24 mx-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div className="mt-2 text-2xl font-black tracking-widest uppercase text-teal-900">Meu Menu+</div>
            <div className="text-xs font-bold tracking-widest text-teal-600 uppercase">cardápio digital</div>
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo!</CardTitle>
          <CardDescription className="text-base">
            Mesa <span className="font-bold text-teal-700">{mesa?.numero}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <p className="text-xs text-slate-500">
                Para receber atualizações do seu pedido
              </p>
            </div>

            {erro && <p className="text-sm text-red-500">{erro}</p>}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold text-black hover:opacity-90"
              style={{ background: '#F05A4F' }}
              disabled={salvando}
            >
              {salvando ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
              ) : (
                'Ver Cardápio →'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
