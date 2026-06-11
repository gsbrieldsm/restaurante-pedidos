'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChopeComStatus } from '@/lib/chopes/estoque'

export function AjusteEstoqueModal({
  chope,
  onClose,
  onSaved,
}: {
  chope: ChopeComStatus
  onClose: () => void
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA_MANUAL'>('ENTRADA')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit() {
    const valor = Number(quantidade)
    if (!valor || valor <= 0) {
      setErro('Informe uma quantidade válida')
      return
    }
    setLoading(true)
    setErro('')

    const res = await fetch('/api/admin/chopes/movimentacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chopeId: chope.id,
        tipo,
        quantidade: tipo === 'ENTRADA' ? valor : -valor,
        observacao: observacao || null,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      setErro('Erro ao registrar movimentação')
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <p className="text-sm text-slate-500">
            {chope.nome}
            {chope.torneira ? ` · Torneira ${chope.torneira}` : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('ENTRADA')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === 'ENTRADA'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Entrada (novo barril)
            </button>
            <button
              type="button"
              onClick={() => setTipo('SAIDA_MANUAL')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === 'SAIDA_MANUAL'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Saída manual
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Quantidade ({chope.unidade})</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Ex: 30"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Barril novo recebido do fornecedor"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
