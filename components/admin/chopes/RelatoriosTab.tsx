'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Chope } from '@/lib/chopes/estoque'

type ItemPreview = {
  produto: string
  quantidade: number
  chopeId: string | null
  fatorConversao: number
  litros: number
}

type Importacao = {
  id: string
  nome_arquivo: string
  status: string
  resumo: { totalLinhas: number; aplicados: number; ignorados: { produto: string; quantidade: number }[] }
  criado_em: string
  movimentacoes: { id: string; quantidade: number; observacao: string | null; chope: { nome: string; torneira: number | null } | null }[]
}

const SEM_VINCULO = '__sem__'

export function RelatoriosTab({
  chopes,
  importacoes,
  onChanged,
}: {
  chopes: Chope[]
  importacoes: Importacao[]
  onChanged: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [itens, setItens] = useState<ItemPreview[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleFile(file: File) {
    setArquivo(file)
    setItens(null)
    setErro('')
    setCarregando(true)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/admin/chopes/relatorios/preview', { method: 'POST', body: formData })
    setCarregando(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErro(data?.error || 'Erro ao processar arquivo')
      return
    }

    const data = await res.json()
    setItens(data.itens)
  }

  function atualizarItem(index: number, chopeId: string | null) {
    setItens((prev) => {
      if (!prev) return prev
      const novo = [...prev]
      const item = { ...novo[index] }
      item.chopeId = chopeId
      item.litros = chopeId ? item.quantidade * item.fatorConversao : 0
      novo[index] = item
      return novo
    })
  }

  async function handleConfirmar() {
    if (!arquivo || !itens) return
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/admin/chopes/relatorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeArquivo: arquivo.name,
        itens: itens.map((i) => ({ ...i, salvarMapeamento: !!i.chopeId })),
      }),
    })

    setEnviando(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErro(data?.error || 'Erro ao confirmar importação')
      return
    }

    setArquivo(null)
    setItens(null)
    if (inputRef.current) inputRef.current.value = ''
    onChanged()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-3">Envie o relatório de vendas (Excel ou CSV)</p>
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={carregando}>
          {carregando ? 'Processando...' : 'Selecionar arquivo'}
        </Button>
        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}
      </div>

      {itens && itens.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#f0a830]" />
              {arquivo?.name}
            </p>
            <Button
              onClick={handleConfirmar}
              disabled={enviando}
              className="bg-[#f0a830] hover:bg-[#d99420] text-[#2b2420]"
            >
              {enviando ? 'Confirmando...' : 'Confirmar e dar baixa'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Produto (relatório)</th>
                  <th className="px-4 py-3">Qtd. vendida</th>
                  <th className="px-4 py-3">Vincular ao chope</th>
                  <th className="px-4 py-3">Baixa (L)</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">{item.produto}</td>
                    <td className="px-4 py-3 text-slate-600">{item.quantidade}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.chopeId ?? SEM_VINCULO}
                        onValueChange={(v) => atualizarItem(i, v === SEM_VINCULO ? null : v)}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_VINCULO}>Não vincular</SelectItem>
                          {chopes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}{c.torneira ? ` (Torneira ${c.torneira})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {item.chopeId ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          {item.litros.toFixed(2)} L
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ignorado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-700">Histórico de importações</p>
        </div>
        <div className="divide-y divide-slate-100">
          {importacoes.map((imp) => (
            <div key={imp.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">{imp.nome_arquivo}</p>
                <p className="text-xs text-slate-500">
                  {new Date(imp.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {imp.resumo?.aplicados ?? imp.movimentacoes?.length ?? 0} baixas aplicadas
                {imp.resumo?.ignorados?.length ? ` · ${imp.resumo.ignorados.length} produtos ignorados` : ''}
              </p>
            </div>
          ))}
          {importacoes.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma importação realizada ainda.</div>
          )}
        </div>
      </div>
    </div>
  )
}
