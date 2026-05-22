'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, Loader2, QrCode, BarChart2,
  Users, Smartphone, ShieldCheck, Headphones,
} from 'lucide-react'

const INCLUSOS = [
  { icon: QrCode,       texto: 'Cardápio digital com QR Code por mesa' },
  { icon: Smartphone,   texto: 'Pedidos em tempo real para cozinha e bar' },
  { icon: Users,        texto: 'Gestão de garçons e estações' },
  { icon: BarChart2,    texto: 'Relatórios de vendas e performance' },
  { icon: ShieldCheck,  texto: 'Dados seguros e backup automático' },
  { icon: Headphones,   texto: 'Suporte via WhatsApp' },
]

export default function PlanosPage() {
  const router = useRouter()
  const [aceitando, setAceitando] = useState(false)
  const [aceito,    setAceito]    = useState(false)

  async function aceitarPlano() {
    setAceitando(true)

    const resp = await fetch('/api/tenant/plano', { method: 'POST' })
    const data = await resp.json()

    if (!resp.ok) {
      alert(data.error || 'Erro ao ativar conta.')
      setAceitando(false)
      return
    }

    setAceito(true)
    // Pequena pausa para mostrar o estado de sucesso antes de redirecionar
    setTimeout(() => {
      router.push('/admin')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F0FAFA' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-4 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-3">Meu Menu+</p>
          <h1 className="text-3xl font-black leading-tight">Seu restaurante pronto para decolar 🚀</h1>
          <p className="text-white/60 text-sm mt-2">
            Conta criada com sucesso! Veja o que está incluso no seu plano.
          </p>
        </div>

        {/* Card do plano */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          {/* Preço */}
          <div className="px-8 py-6 border-b border-slate-100">
            <div className="flex items-end gap-3 mb-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Plano Básico</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-slate-800">R$ 550</span>
                  <span className="text-slate-400 font-medium">/mês</span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400 font-medium">Implementação</p>
                <p className="text-xl font-black text-slate-700">R$ 2.000</p>
                <p className="text-xs text-slate-400">única vez</p>
              </div>
            </div>
          </div>

          {/* O que está incluso */}
          <div className="px-8 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">O que está incluso</p>
            <div className="space-y-3">
              {INCLUSOS.map(({ icon: Icon, texto }) => (
                <div key={texto} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm text-slate-700">{texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso contratual */}
          <div className="px-8 pb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
              Ao clicar em <strong className="text-slate-700">"Concordar e acessar"</strong> você confirma
              que está ciente dos valores acima e concorda com os termos de uso do Meu Menu+.
              O acesso ao sistema é liberado imediatamente após a confirmação.
              O faturamento é combinado diretamente com nossa equipe.
            </div>
          </div>

          {/* Botão */}
          <div className="px-8 pb-8">
            <Button
              onClick={aceitarPlano}
              disabled={aceitando || aceito}
              className="w-full h-13 text-base font-bold text-black hover:opacity-90"
              style={{ background: aceito ? '#16a34a' : '#1A9B8A', height: '52px' }}
            >
              {aceito ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Tudo certo! Abrindo seu painel...</>
              ) : aceitando ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Ativando sua conta...</>
              ) : (
                'Concordar e acessar o sistema →'
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Dúvidas? Fale com a gente no WhatsApp antes de continuar.
        </p>
      </div>
    </div>
  )
}
