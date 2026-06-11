'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChopeFormModal } from './ChopeFormModal'
import type { Chope } from '@/lib/chopes/estoque'

export function ChopesTab({ chopes, onChanged }: { chopes: Chope[]; onChanged: () => void }) {
  const [editando, setEditando] = useState<Chope | null | 'novo'>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este chope? Essa ação não pode ser desfeita.')) return
    setExcluindo(id)
    const res = await fetch(`/api/admin/chopes/${id}`, { method: 'DELETE' })
    setExcluindo(null)
    if (res.ok) onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')} className="bg-[#f0a830] hover:bg-[#d99420] text-[#2b2420]">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo chope
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Torneira</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Estilo</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Capacidade</th>
              <th className="px-4 py-3">Mín. / Crít.</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {chopes
              .slice()
              .sort((a, b) => (a.torneira ?? 999) - (b.torneira ?? 999))
              .map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{c.torneira ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{c.estilo}</td>
                  <td className="px-4 py-3 text-slate-600">{c.fornecedor ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.capacidade_barril} {c.unidade}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.estoque_minimo} / {c.estoque_critico} {c.unidade}
                  </td>
                  <td className="px-4 py-3">
                    {c.ativo ? (
                      <span className="text-emerald-700 text-xs font-medium">Sim</span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Não</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditando(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        disabled={excluindo === c.id}
                        onClick={() => handleExcluir(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            {chopes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Nenhum chope cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <ChopeFormModal
          chope={editando === 'novo' ? null : editando}
          onClose={() => setEditando(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}
