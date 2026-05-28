'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowRight, BookUser, TableProperties } from 'lucide-react'
import { darkenHex, hexToRgbParts } from '@/lib/cor'

interface Branding {
  restaurante_nome:     string
  restaurante_logo_url: string | null
  cor_primaria:         string
}

function formatarWhatsapp(valor: string) {
  const nums = valor.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

export default function AcessoPublicoPage() {
  const { slug } = useParams() as { slug: string }
  const router   = useRouter()

  const [branding, setBranding] = useState<Branding>({
    restaurante_nome:     '',
    restaurante_logo_url: null,
    cor_primaria:         '#1A9B8A',
  })
  const [mesas,    setMesas]    = useState<number[]>([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [nome,        setNome]        = useState('')
  const [whatsapp,    setWhatsapp]    = useState('')
  const [mesaNumero,  setMesaNumero]  = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [erro,        setErro]        = useState('')

  const cor          = branding.cor_primaria
  const rgb          = hexToRgbParts(cor)
  const heroGradient = `linear-gradient(135deg, ${darkenHex(cor, 0.10)} 0%, ${darkenHex(cor, 0.28)} 50%, ${cor} 100%)`

  useEffect(() => {
    // Pré-preenche com dados do último acesso
    const nomeSalvo     = localStorage.getItem('mmu_cliente_nome')
    const whatsappSalvo = localStorage.getItem('mmu_cliente_whatsapp')
    const mesaSalva     = localStorage.getItem(`mmu_mesa_${slug}`)
    if (nomeSalvo)     setNome(nomeSalvo)
    if (whatsappSalvo) setWhatsapp(whatsappSalvo)
    if (mesaSalva)     setMesaNumero(mesaSalva)

    fetch(`/api/pub/${slug}/sessao`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        setBranding(d.branding)
        setMesas(d.mesas ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim())    { setErro('Por favor, informe seu nome.');         return }
    if (!mesaNumero)     { setErro('Por favor, informe o número da mesa.'); return }
    setSalvando(true)
    setErro('')

    const resp = await fetch(`/api/pub/${slug}/sessao`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        mesa_numero:       Number(mesaNumero),
        cliente_nome:      nome.trim(),
        cliente_whatsapp:  whatsapp.replace(/\D/g, '') || null,
      }),
    })

    const data = await resp.json()
    if (!resp.ok) {
      setErro(data.error || 'Erro ao abrir comanda.')
      setSalvando(false)
      return
    }

    // Salva para próximo acesso
    localStorage.setItem('mmu_cliente_nome',      nome.trim())
    if (whatsapp) localStorage.setItem('mmu_cliente_whatsapp', whatsapp)
    localStorage.setItem(`mmu_mesa_${slug}`,      mesaNumero)

    sessionStorage.setItem('sessao_id',    data.sessao_id)
    sessionStorage.setItem('cliente_nome', data.cliente_nome)
    // Persiste no localStorage para sobreviver ao fechar/reabrir o navegador
    localStorage.setItem(`menue_sess_${data.token}`,      data.sessao_id)
    localStorage.setItem(`menue_sess_nome_${data.token}`, data.cliente_nome)

    router.push(`/mesa/${data.token}/cardapio`)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `rgba(${rgb}, 0.06)` }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor }} />
      </div>
    )
  }

  // ── Restaurante não encontrado ──
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-10 pb-10 space-y-3">
            <p className="text-4xl">🍽️</p>
            <p className="font-bold text-slate-700">Restaurante não encontrado</p>
            <p className="text-sm text-slate-400">Verifique se o endereço está correto.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <Card className="w-full max-w-sm shadow-xl border-0 overflow-hidden">

        {/* Header com branding do restaurante */}
        <div className="px-6 pt-8 pb-7 text-white" style={{ background: heroGradient }}>
          {branding.restaurante_logo_url && (
            <img
              src={branding.restaurante_logo_url}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-cover mb-3 border border-white/20"
            />
          )}
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1"
            style={{ color: `rgba(${rgb}, 0.8)` }}
          >
            {branding.restaurante_nome}
          </p>
          <h1 className="text-3xl font-black leading-tight">Bem-vindo!</h1>
          <p className="text-white/60 text-sm mt-2">
            Informe seus dados para abrir sua comanda
          </p>
        </div>

        <CardContent className="pt-6 pb-6">
          {/* Lembrado */}
          {nome && localStorage.getItem('mmu_cliente_nome') === nome && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-4">
              <BookUser className="w-4 h-4 shrink-0" style={{ color: cor }} />
              <p className="text-xs font-medium text-slate-600">Dados do seu último acesso foram lembrados</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nome */}
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

            {/* Número da mesa */}
            <div className="space-y-1.5">
              <Label htmlFor="mesa" className="flex items-center gap-1.5">
                <TableProperties className="w-4 h-4" style={{ color: cor }} />
                Número da mesa *
              </Label>
              {mesas.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {mesas.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMesaNumero(String(n))}
                      className="h-11 rounded-xl font-bold text-sm border-2 transition-all"
                      style={
                        mesaNumero === String(n)
                          ? { background: cor, color: '#fff', borderColor: cor }
                          : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  id="mesa"
                  placeholder="Ex: 5"
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="h-12 text-base"
                />
              )}
            </div>

            {/* WhatsApp */}
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
              style={{ background: cor }}
              disabled={salvando}
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aguarde...</>
                : <><ArrowRight className="w-4 h-4 mr-2" /> Abrir minha comanda</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rodapé discreto */}
      <p className="mt-6 text-xs text-slate-400">
        Powered by <span className="font-semibold" style={{ color: '#1A9B8A' }}>Menuê+</span>
      </p>
    </div>
  )
}
