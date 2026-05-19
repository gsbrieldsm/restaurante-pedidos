'use client'

import { useState } from 'react'
import {
  Trash2, RefreshCw, Users, ClipboardList,
  DollarSign, Bell, TableProperties, AlertTriangle, CheckCircle2, Loader2, ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Acao {
  escopo: string
  titulo: string
  descricao: string
  detalhe: string
  icon: React.ElementType
  nivel: 'medio' | 'alto' | 'critico'
}

const ACOES: Acao[] = [
  {
    escopo: 'chamadas',
    titulo: 'Limpar chamadas do garçom',
    descricao: 'Remove todos os registros de chamadas de clientes.',
    detalhe: 'Apaga a tabela chamadas_garcom inteira. Não afeta pedidos, mesas ou pagamentos.',
    icon: Bell,
    nivel: 'medio',
  },
  {
    escopo: 'pagamentos',
    titulo: 'Limpar histórico de pagamentos',
    descricao: 'Remove todos os registros de pagamentos do Financeiro.',
    detalhe: 'Apaga a tabela pagamentos. Não afeta pedidos nem mesas.',
    icon: DollarSign,
    nivel: 'alto',
  },
  {
    escopo: 'pedidos',
    titulo: 'Limpar todos os pedidos',
    descricao: 'Remove todos os pedidos e itens de pedido do sistema.',
    detalhe: 'Apaga pedidos e pedido_itens. Mesas e sessões permanecem abertas.',
    icon: ClipboardList,
    nivel: 'alto',
  },
  {
    escopo: 'mesas',
    titulo: 'Fechar todas as mesas',
    descricao: 'Encerra todas as sessões abertas e libera todas as mesas.',
    detalhe: 'Fecha sessões ativas e muda status de todas as mesas para "livre". Não apaga pedidos.',
    icon: TableProperties,
    nivel: 'alto',
  },
  {
    escopo: 'clientes_historico',
    titulo: 'Apagar histórico de clientes',
    descricao: 'Remove sessões encerradas (clientes que já saíram).',
    detalhe: 'Apaga sessoes_mesa onde ativa = false. Não afeta mesas abertas no momento.',
    icon: Users,
    nivel: 'alto',
  },
  {
    escopo: 'reset_dia',
    titulo: 'Reset do dia de hoje',
    descricao: 'Apaga pedidos, pagamentos e chamadas criados hoje.',
    detalhe: 'Filtra por data de hoje. Dados de outros dias são mantidos. Útil para limpar testes do dia.',
    icon: RefreshCw,
    nivel: 'critico',
  },
  {
    escopo: 'reset_total',
    titulo: 'Reset total do sistema',
    descricao: 'Apaga TUDO: pedidos, pagamentos, sessões, chamadas e libera mesas.',
    detalhe: 'Mantém apenas o cardápio e a estrutura de mesas. Use apenas para reiniciar do zero.',
    icon: ShieldAlert,
    nivel: 'critico',
  },
]

const NIVEL_CONFIG = {
  medio: {
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    badgeLabel: 'Moderado',
    btn: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    icon: 'text-yellow-500',
  },
  alto: {
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    badgeLabel: 'Alto',
    btn: 'bg-orange-500 hover:bg-orange-600 text-white',
    icon: 'text-orange-500',
  },
  critico: {
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    badgeLabel: 'Crítico',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    icon: 'text-red-500',
  },
}

export default function ConfiguracoesPage() {
  const [confirmando, setConfirmando] = useState<Acao | null>(null)
  const [executando, setExecutando] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [digitado, setDigitado] = useState('')

  async function executar() {
    if (!confirmando) return
    setExecutando(true)
    setErro(null)

    try {
      const resp = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escopo: confirmando.escopo }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? 'Erro desconhecido')

      setSucesso(confirmando.titulo)
      setConfirmando(null)
      setDigitado('')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao executar')
    } finally {
      setExecutando(false)
    }
  }

  const PALAVRA_CONFIRMA = 'CONFIRMAR'
  const podeExecutar = digitado === PALAVRA_CONFIRMA

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">Configurações</p>
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Dados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Use com cuidado. As ações abaixo são irreversíveis e afetam diretamente o banco de dados.
        </p>
      </div>

      {/* Aviso geral */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Atenção:</strong> estas ações apagam dados permanentemente e não podem ser desfeitas.
          Confirme sempre antes de executar em produção.
        </div>
      </div>

      {/* Feedback de sucesso */}
      {sucesso && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">✓ {sucesso} — concluído com sucesso.</p>
          <button onClick={() => setSucesso(null)} className="ml-auto text-green-500 hover:text-green-700 text-xs">fechar</button>
        </div>
      )}

      {/* Feedback de erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">fechar</button>
        </div>
      )}

      {/* Cards de ação */}
      <div className="space-y-3">
        {ACOES.map((acao) => {
          const cfg = NIVEL_CONFIG[acao.nivel]
          const Icon = acao.icon
          return (
            <div
              key={acao.escopo}
              className={`bg-white rounded-xl border ${cfg.border} p-4 flex items-start gap-4`}
            >
              <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 ${cfg.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-slate-800 text-sm">{acao.titulo}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.badgeLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{acao.descricao}</p>
              </div>
              <button
                onClick={() => { setConfirmando(acao); setDigitado(''); setErro(null) }}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${cfg.btn}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Executar
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de confirmação */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !executando && setConfirmando(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl">

            {/* Ícone + título */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                confirmando.nivel === 'critico' ? 'bg-red-100' :
                confirmando.nivel === 'alto' ? 'bg-orange-100' : 'bg-yellow-100'
              }`}>
                <ShieldAlert className={`w-6 h-6 ${
                  confirmando.nivel === 'critico' ? 'text-red-600' :
                  confirmando.nivel === 'alto' ? 'text-orange-500' : 'text-yellow-500'
                }`} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">{confirmando.titulo}</h2>
                <p className="text-xs text-slate-500 mt-1">{confirmando.detalhe}</p>
              </div>
            </div>

            {/* Campo de confirmação */}
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Para confirmar, digite <strong className="text-red-600 font-mono">{PALAVRA_CONFIRMA}</strong> abaixo:
              </p>
              <input
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                placeholder={PALAVRA_CONFIRMA}
                value={digitado}
                onChange={(e) => setDigitado(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && podeExecutar && executar()}
              />
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmando(null)}
                disabled={executando}
              >
                Cancelar
              </Button>
              <Button
                className={`flex-1 ${NIVEL_CONFIG[confirmando.nivel].btn} disabled:opacity-40`}
                disabled={!podeExecutar || executando}
                onClick={executar}
              >
                {executando
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Executando...</>
                  : <><Trash2 className="w-4 h-4 mr-2" /> Confirmar</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
