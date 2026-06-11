'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Chope } from '@/lib/chopes/estoque'

export function ChopeFormModal({
  chope,
  onClose,
  onSaved,
}: {
  chope: Chope | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(chope?.nome ?? '')
  const [estilo, setEstilo] = useState(chope?.estilo ?? '')
  const [torneira, setTorneira] = useState(chope?.torneira != null ? String(chope.torneira) : '')
  const [fornecedor, setFornecedor] = useState(chope?.fornecedor ?? '')
  const [unidade, setUnidade] = useState(chope?.unidade ?? 'L')
  const [capacidadeBarril, setCapacidadeBarril] = useState(String(chope?.capacidade_barril ?? 30))
  const [estoqueAtual, setEstoqueAtual] = useState(String(chope?.estoque_atual ?? 0))
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(chope?.estoque_minimo ?? 0))
  const [estoqueCritico, setEstoqueCritico] = useState(String(chope?.estoque_critico ?? 0))
  const [ativo, setAtivo] = useState(chope?.ativo ?? true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit() {
    if (!nome.trim()) {
      setErro('Informe o nome do chope')
      return
    }
    setLoading(true)
    setErro('')

    const payload = {
      nome: nome.trim(),
      estilo: estilo.trim(),
      torneira: torneira === '' ? null : Number(torneira),
      fornecedor: fornecedor.trim() || null,
      unidade,
      capacidade_barril: Number(capacidadeBarril) || 30,
      estoque_atual: Number(estoqueAtual) || 0,
      estoque_minimo: Number(estoqueMinimo) || 0,
      estoque_critico: Number(estoqueCritico) || 0,
      ativo,
    }

    const res = await fetch(
      chope ? `/api/admin/chopes/${chope.id}` : '/api/admin/chopes',
      {
        method: chope ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErro(data?.error || 'Erro ao salvar chope')
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{chope ? 'Editar chope' : 'Novo chope'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Brahma Chopp" autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Estilo</Label>
              <Input value={estilo} onChange={(e) => setEstilo(e.target.value)} placeholder="Ex: Pilsen" />
            </div>

            <div className="space-y-1.5">
              <Label>Torneira</Label>
              <Input
                type="number"
                min="1"
                value={torneira}
                onChange={(e) => setTorneira(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Fornecedor</Label>
              <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Ambev" />
            </div>

            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="L" />
            </div>

            <div className="space-y-1.5">
              <Label>Capacidade do barril (L)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={capacidadeBarril}
                onChange={(e) => setCapacidadeBarril(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estoque atual (L)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estoque mínimo (L)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estoque crítico (L)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={estoqueCritico}
                onChange={(e) => setEstoqueCritico(e.target.value)}
              />
            </div>

            <div className="col-span-2 flex items-center gap-2 pt-1">
              <input
                id="ativo"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
