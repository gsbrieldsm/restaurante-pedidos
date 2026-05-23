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

const PLANOS = [
  {
    id:        'starter',
    nome:      'Starter',
    usuarios:  'Até 5 usuários',
    preco:     350,
    cor:       '#1A9B8A',
    destaque:  false,
    exemplos:  ['1 admin', '2 garçons', '1 cozinha', '1 bar'],
  },
  {
    id:        'pro',
    nome:      'Pro',
    usuarios:  '6 a 10 usuários',
    preco:     450,
    cor:       '#1A9B8A',
    destaque:  true,
    exemplos:  ['1 admin', '4 garçons', '1 cozinha', '1 bar', '1 drinks', '1 chopeira + mais'],
  },
  {
    id:        'business',
    nome:      'Business',
    usuarios:  '11 a 20 usuários',
    preco:     650,
    cor:       '#0f7a6b',
    destaque:  false,
    exemplos:  ['Múltiplos admins', 'Equipe de garçons', 'Várias estações', 'Operação completa'],
  },
]

export default function PlanosPage() {
  const router = useRouter()
  const [planoSelecionado, setPlanoSelecionado] = useState('pro')
  const [aceitando, setAceitando] = useState(false)
  const [aceito,    setAceito]    = useState(false)

  const plano = PLANOS.find((p) => p.id === planoSelecionado)!

  async function aceitarPlano() {
    setAceitando(true)

    const resp = await fetch('/api/tenant/plano', { method: 'POST' })
    const data = await resp.json()

    if (!resp.ok) {
      alert(data.error || 'Erro ao ativar conta.')
      setAceitando(false)
      return
    }

    await fetch('/api/tenant/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qtd_mesas: 10 }),
    })

    setAceito(true)
    setTimeout(() => { router.push('/admin') }, 1200)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12" style={{ background: '#F0FAFA' }}>
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div
          className="rounded-2xl px-8 pt-10 pb-8 text-white mb-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}
        >
          <p className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-3">Menuê+</p>
          <h1 className="text-3xl font-black leading-tight">Escolha o plano ideal para seu restaurante 🚀</h1>
          <p className="text-white/60 text-sm mt-2">
            Conta criada! Selecione quantos usuários sua operação vai precisar.
          </p>
          <div
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            💡 Usuários = admin, garçons, cozinha, bar, drinks, chopeira…
          </div>
        </div>

        {/* Cards de plano */}
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {PLANOS.map((p) => {
            const ativo = planoSelecionado === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPlanoSelecionado(p.id)}
                className="relative rounded-2xl p-5 text-left transition-all hover:shadow-md"
                style={{
                  background: ativo ? '#fff' : '#fff',
                  border: ativo ? `2px solid ${p.cor}` : '2px solid #e2e8f0',
                  boxShadow: ativo ? `0 0 0 4px ${p.cor}22` : undefined,
                }}
              >
                {p.destaque && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ background: p.cor }}
                  >
                    mais popular
                  </div>
                )}
                <p className="font-black text-slate-800 text-base">{p.nome}</p>
                <p className="text-xs text-slate-500 mb-3">{p.usuarios}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black" style={{ color: ativo ? p.cor : '#0f172a' }}>
                    R$ {p.preco}
                  </span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <ul className="space-y-1.5">
                  {p.exemplos.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-xs text-slate-600">
                      <span style={{ color: p.cor }}>✓</span>
                      {ex}
                    </li>
                  ))}
                </ul>
                {ativo && (
                  <div
                    className="mt-4 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: p.cor }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Plano Enterprise */}
        <div
          className="rounded-2xl px-6 py-4 flex items-center justify-between mb-5"
          style={{ background: '#fff', border: '2px dashed #e2e8f0' }}
        >
          <div>
            <p className="font-bold text-slate-700 text-sm">Mais de 20 usuários?</p>
            <p className="text-slate-400 text-xs mt-0.5">Redes, franquias e grandes operações — montamos um plano sob medida.</p>
          </div>
          <a
            href="https://wa.me/5547988194822?text=Ol%C3%A1%2C%20preciso%20de%20um%20plano%20enterprise%20para%20mais%20de%2020%20usu%C3%A1rios"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 ml-4 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: '#0f3d35' }}
          >
            Falar no WhatsApp →
          </a>
        </div>

        {/* Card de confirmação */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Resumo selecionado */}
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Plano selecionado</p>
              <p className="text-xl font-black text-slate-800">{plano.nome} — {plano.usuarios}</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl font-black" style={{ color: '#1A9B8A' }}>R$ {plano.preco}</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">+ R$ 2.000 implementação (única vez)</p>
            </div>
          </div>

          {/* O que está incluso */}
          <div className="px-8 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">O que está incluso em todos os planos</p>
            <div className="grid sm:grid-cols-2 gap-3">
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
              que está ciente dos valores acima e concorda com os termos de uso do Menuê+.
              O acesso ao sistema é liberado imediatamente. O faturamento é combinado com nossa equipe.
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
                `Concordar e acessar — Plano ${plano.nome} →`
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Dúvidas? Fale com a gente no WhatsApp antes de continuar.
        </p>
      </div>
    </div>
  )
}
