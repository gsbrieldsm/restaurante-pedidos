'use client'

import { useMemo, useState } from 'react'
import { LayoutGrid, List, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { AjusteEstoqueModal } from './AjusteEstoqueModal'
import { STATUS_LABEL, STATUS_ORDER, comStatus, type Chope, type ChopeComStatus, type StatusEstoque } from '@/lib/chopes/estoque'

const STATUS_COLUMN_CLASS: Record<StatusEstoque, string> = {
  OK: 'border-emerald-200 bg-emerald-50/50',
  ALERTA: 'border-amber-200 bg-amber-50/50',
  CRITICO: 'border-orange-200 bg-orange-50/50',
  ESGOTADO: 'border-red-200 bg-red-50/50',
}

export function EstoqueTab({ chopes, onChanged }: { chopes: Chope[]; onChanged: () => void }) {
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [ajuste, setAjuste] = useState<ChopeComStatus | null>(null)

  const ativos = useMemo(
    () => chopes.filter((c) => c.ativo).map(comStatus).sort((a, b) => (a.torneira ?? 999) - (b.torneira ?? 999)),
    [chopes]
  )

  const resumo = useMemo(() => {
    const counts: Record<StatusEstoque, number> = { OK: 0, ALERTA: 0, CRITICO: 0, ESGOTADO: 0 }
    for (const c of ativos) counts[c.status]++
    return counts
  }, [ativos])

  const porStatus = useMemo(() => {
    const grupos: Record<StatusEstoque, ChopeComStatus[]> = { OK: [], ALERTA: [], CRITICO: [], ESGOTADO: [] }
    for (const c of ativos) grupos[c.status].push(c)
    return grupos
  }, [ativos])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">{STATUS_LABEL[status]}</p>
              <p className="text-xl font-bold text-slate-800">{resumo[status]}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setView('lista')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              view === 'lista' ? 'bg-[#f0a830] text-[#2b2420] font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              view === 'kanban' ? 'bg-[#f0a830] text-[#2b2420] font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
          </button>
        </div>
      </div>

      {view === 'lista' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Torneira</th>
                <th className="px-4 py-3">Chope</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{c.torneira ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{c.nome}</p>
                    <p className="text-xs text-slate-500">{c.estilo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {c.estoque_atual.toFixed(1)} {c.unidade}
                      </span>
                      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#f0a830]"
                          style={{ width: `${Math.min(100, c.percentual)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAjuste(c)}>
                      Ajustar
                    </Button>
                  </td>
                </tr>
              ))}
              {ativos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhum chope ativo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className={`rounded-xl border p-3 space-y-2 ${STATUS_COLUMN_CLASS[status]}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{STATUS_LABEL[status]}</p>
                <span className="text-xs font-medium text-slate-500">{porStatus[status].length}</span>
              </div>

              <div className="space-y-2">
                {porStatus[status].map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{c.nome}</p>
                        <p className="text-xs text-slate-500">
                          {c.estilo}
                          {c.torneira ? ` · Torneira ${c.torneira}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-[#f0a830]" style={{ width: `${Math.min(100, c.percentual)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        {c.estoque_atual.toFixed(1)} {c.unidade}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setAjuste(c)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <Minus className="w-3.5 h-3.5 -ml-2.5 mr-1" />
                      Ajustar
                    </Button>
                  </div>
                ))}
                {porStatus[status].length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum chope</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {ajuste && (
        <AjusteEstoqueModal chope={ajuste} onClose={() => setAjuste(null)} onSaved={onChanged} />
      )}
    </div>
  )
}
