'use client'

import { useState, useEffect } from 'react'
import { Clock, MessageCircle, X } from 'lucide-react'

const PLANOS_PRECO: Record<string, number> = {
  starter:    350,
  pro:        450,
  business:   650,
  enterprise: 900,
}

const PLANOS_NOME: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  business:   'Business',
  enterprise: 'Enterprise',
}

function lerCookie(nome: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function TrialBanner() {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [plano, setPlano]                 = useState('')
  const [nomeRestaurante, setNomeRestaurante] = useState('')
  const [fechado, setFechado]             = useState(false)

  useEffect(() => {
    // Plano pago → sem banner
    if (lerCookie('plano_ativo') === 'sim') return

    const trialExpira = lerCookie('trial_expira_em')
    if (!trialExpira) return

    const expira = new Date(trialExpira)
    const dias   = Math.ceil((expira.getTime() - Date.now()) / 86400000)
    setDiasRestantes(dias)

    // Busca plano e nome do restaurante
    fetch('/api/admin/perfil')
      .then((r) => r.json())
      .then((d) => {
        if (d.plano)             setPlano(d.plano)
        if (d.nome_restaurante)  setNomeRestaurante(d.nome_restaurante)
      })
      .catch(() => {})
  }, [])

  if (fechado || diasRestantes === null) return null

  const expirou  = diasRestantes <= 0
  const urgente  = diasRestantes <= 2
  const nomePlano = PLANOS_NOME[plano] ?? plano
  const preco     = PLANOS_PRECO[plano] ?? null

  const textoWpp = [
    `Olá! ${expirou ? 'Meu trial do Menuê+ expirou.' : `Meu trial do Menuê+ expira em ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}.`}`,
    nomeRestaurante ? `Restaurante: ${nomeRestaurante}.` : '',
    plano ? `Plano escolhido: ${nomePlano}${preco ? ` — R$ ${preco}/mês` : ''}.` : '',
    'Quero ativar meu plano!',
  ].filter(Boolean).join(' ')

  const wppUrl = `https://wa.me/5547988194822?text=${encodeURIComponent(textoWpp)}`

  const cores = urgente
    ? { fundo: 'bg-red-50 border-red-200',   texto: 'text-red-800',   icone: 'text-red-500',   btn: 'bg-red-500 hover:bg-red-600',   fechar: 'text-red-400 hover:text-red-600' }
    : { fundo: 'bg-amber-50 border-amber-200', texto: 'text-amber-800', icone: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600', fechar: 'text-amber-400 hover:text-amber-600' }

  return (
    <div className={`mx-4 mt-4 rounded-xl px-4 py-3 flex items-center gap-3 border text-sm ${cores.fundo} ${cores.texto}`}>
      <Clock className={`w-4 h-4 shrink-0 ${cores.icone}`} />

      <div className="flex-1 min-w-0">
        {expirou ? (
          <span className="font-bold">Seu trial expirou.</span>
        ) : (
          <span>
            <span className="font-bold">
              Trial expira em {diasRestantes} dia{diasRestantes === 1 ? '' : 's'}.
            </span>
            {preco && (
              <span className="ml-1.5 opacity-70 text-xs">
                {nomePlano} — R$ {preco}/mês
              </span>
            )}
          </span>
        )}
        <span className="ml-1.5 opacity-70 text-xs hidden sm:inline">
          Fale com nossa equipe e ativamos agora.
        </span>
      </div>

      <a
        href={wppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors ${cores.btn}`}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Ativar plano</span>
        <span className="sm:hidden">Ativar</span>
      </a>

      <button
        onClick={() => setFechado(true)}
        className={`shrink-0 transition-colors ${cores.fechar}`}
        aria-label="Fechar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
