'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CronometroItem } from './CronometroItem'
import { ChefHat, CheckCircle2, Loader2 } from 'lucide-react'
import type { ViewFilaEstacao } from '@/lib/supabase/types'

interface Props {
  item: ViewFilaEstacao
  onAtualizar: () => void
}

const URGENCIA_BORDA: Record<string, string> = {
  normal: 'border-l-green-400',
  quase: 'border-l-orange-400',
  atrasado: 'border-l-red-500',
}

export function CardPedidoItem({ item, onAtualizar }: Props) {
  const [loading, setLoading] = useState(false)

  const minutos = item.iniciado_em
    ? item.minutos_em_preparo || 0
    : item.minutos_aguardando
  const atrasado = minutos > item.tempo_preparo_estimado
  const quase = minutos > item.tempo_preparo_estimado * 0.75
  const urgencia = atrasado ? 'atrasado' : quase ? 'quase' : 'normal'

  async function atualizarStatus(novoStatus: 'em_preparo' | 'pronto') {
    setLoading(true)
    await fetch(`/api/pedidos/${item.pedido_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, status: novoStatus }),
    })
    setLoading(false)
    onAtualizar()
  }

  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${URGENCIA_BORDA[urgencia]} shadow-sm p-4 space-y-3`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Mesa {item.mesa_numero}
            </span>
            <span className="text-xs text-slate-500">{item.cliente_nome}</span>
          </div>
          <h3 className="font-bold text-slate-800 mt-1 text-base">
            {item.quantidade}× {item.item_nome}
          </h3>
          {item.observacao && (
            <p className="text-sm text-orange-700 bg-orange-50 rounded px-2 py-1 mt-1">
              ⚠️ {item.observacao}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={
            item.status === 'em_preparo'
              ? 'border-teal-500 text-teal-700 bg-teal-50'
              : 'border-slate-300 text-slate-500'
          }
        >
          {item.status === 'em_preparo' ? 'Em preparo' : 'Aguardando'}
        </Badge>
      </div>

      {/* Cronômetro e tempo estimado */}
      <div className="flex items-center justify-between text-sm">
        <CronometroItem
          iniciadoEm={item.iniciado_em}
          criadoEm={item.criado_em}
          tempoEstimado={item.tempo_preparo_estimado}
          status={item.status}
        />
        <span className="text-slate-400 text-xs">
          Estimado: {item.tempo_preparo_estimado}min
        </span>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        {item.status === 'aguardando' && (
          <Button
            onClick={() => atualizarStatus('em_preparo')}
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 h-10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><ChefHat className="w-4 h-4 mr-1.5" /> Iniciar Preparo</>
            )}
          </Button>
        )}
        {item.status === 'em_preparo' && (
          <Button
            onClick={() => atualizarStatus('pronto')}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 h-10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Marcar Pronto</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
