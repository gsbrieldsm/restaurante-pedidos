'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X } from 'lucide-react'
import type { CardapioItem, EstacaoTipo } from '@/lib/supabase/types'

const ESTACOES: EstacaoTipo[] = ['cozinha', 'bar', 'drinks', 'chopeira']
const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻',
}

const FORM_VAZIO = {
  nome: '', descricao: '', preco: '', custo: '', categoria: '',
  estacao: 'cozinha' as EstacaoTipo, tempo_preparo_estimado: '10',
}

export default function CardapioAdminPage() {
  const [itens, setItens] = useState<CardapioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<CardapioItem | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [filtroEstacao, setFiltroEstacao] = useState<string>('todas')
  const [togglendoId, setTogglendoId] = useState<string | null>(null)

  // imagem
  const [imagemAtual, setImagemAtual] = useState<string | null>(null) // url já salva
  const [imagemPreview, setImagemPreview] = useState<string | null>(null) // preview local
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [uploadando, setUploadando] = useState(false)
  const inputFileRef = useRef<HTMLInputElement>(null)

  async function buscarItens() {
    const res = await fetch('/api/admin/cardapio')
    const data = await res.json()
    setItens(data.itens || [])
    setLoading(false)
  }

  useEffect(() => { buscarItens() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setImagemAtual(null)
    setImagemPreview(null)
    setImagemFile(null)
    setModalAberto(true)
  }

  function abrirEditar(item: CardapioItem) {
    setEditando(item)
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      preco: item.preco.toString(),
      custo: item.custo ? item.custo.toString() : '',
      categoria: item.categoria,
      estacao: item.estacao,
      tempo_preparo_estimado: item.tempo_preparo_estimado.toString(),
    })
    setImagemAtual(item.imagem_url)
    setImagemPreview(null)
    setImagemFile(null)
    setModalAberto(true)
  }

  function selecionarImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
  }

  function removerImagem() {
    setImagemFile(null)
    setImagemPreview(null)
    setImagemAtual(null)
    if (inputFileRef.current) inputFileRef.current.value = ''
  }

  async function salvar() {
    if (!form.nome || !form.preco || !form.categoria) return
    setSalvando(true)

    let imagemUrl = imagemAtual ?? null

    // faz upload se selecionou arquivo novo
    if (imagemFile) {
      setUploadando(true)
      const fd = new FormData()
      fd.append('file', imagemFile)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      setUploadando(false)
      if (data.url) imagemUrl = data.url
    }

    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      preco: parseFloat(form.preco),
      custo: form.custo ? parseFloat(form.custo) : 0,
      categoria: form.categoria,
      estacao: form.estacao,
      tempo_preparo_estimado: parseInt(form.tempo_preparo_estimado) || 10,
      imagem_url: imagemUrl,
    }

    if (editando) {
      await fetch(`/api/cardapio/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/cardapio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, disponivel: true }),
      })
    }

    setSalvando(false)
    setModalAberto(false)
    buscarItens()
  }

  async function toggleDisponivel(item: CardapioItem) {
    setTogglendoId(item.id)
    // Optimistic update
    setItens((prev) =>
      prev.map((i) => i.id === item.id ? { ...i, disponivel: !i.disponivel } : i)
    )
    await fetch(`/api/cardapio/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponivel: !item.disponivel }),
    })
    setTogglendoId(null)
  }

  async function deletar(item: CardapioItem) {
    if (!confirm(`Remover "${item.nome}" do cardápio?`)) return
    await fetch(`/api/cardapio/${item.id}`, { method: 'DELETE' })
    buscarItens()
  }

  const itensFiltrados = filtroEstacao === 'todas'
    ? itens
    : itens.filter((i) => i.estacao === filtroEstacao)

  const categorias = [...new Set(itensFiltrados.map((i) => i.categoria))]

  const previewVisivel = imagemPreview || imagemAtual

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cardápio</h1>
          <p className="text-slate-500 text-sm">{itens.length} itens cadastrados</p>
        </div>
        <Button onClick={abrirNovo} className="bg-teal-600 hover:bg-teal-700 gap-2">
          <Plus className="w-4 h-4" />
          Novo Item
        </Button>
      </div>

      {/* Filtro por estação */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroEstacao('todas')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filtroEstacao === 'todas' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todas
        </button>
        {ESTACOES.map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstacao(e)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filtroEstacao === e ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {ESTACAO_EMOJI[e]} {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista agrupada por categoria */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : (
        categorias.map((cat) => (
          <div key={cat}>
            <h2 className="font-semibold text-slate-600 text-sm uppercase tracking-wider mb-2">{cat}</h2>
            <div className="space-y-2">
              {itensFiltrados
                .filter((i) => i.categoria === cat)
                .map((item) => (
                  <Card key={item.id} className={`transition-opacity ${!item.disponivel ? 'opacity-60' : ''}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                        {item.imagem_url ? (
                          <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{ESTACAO_EMOJI[item.estacao]}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 truncate">{item.nome}</p>
                          {!item.disponivel && (
                            <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                              Indisponível
                            </span>
                          )}
                        </div>
                        {item.descricao && (
                          <p className="text-xs text-slate-400 truncate">{item.descricao}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-teal-700">
                            R$ {item.preco.toFixed(2).replace('.', ',')}
                          </span>
                          <span>·</span>
                          <span>~{item.tempo_preparo_estimado}min</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle visibilidade */}
                        <button
                          onClick={() => toggleDisponivel(item)}
                          disabled={togglendoId === item.id}
                          title={item.disponivel ? 'Desativar item' : 'Ativar item'}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                            item.disponivel ? 'bg-teal-500' : 'bg-slate-300'
                          }`}
                        >
                          {togglendoId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white absolute top-1.5 left-1.5" />
                          ) : (
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              item.disponivel ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          )}
                        </button>

                        <button onClick={() => abrirEditar(item)} className="p-1.5 rounded hover:bg-slate-100">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => deletar(item)} className="p-1.5 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}

      {/* Modal novo/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Upload de imagem */}
            <div className="space-y-1.5">
              <Label>Foto do produto</Label>
              {previewVisivel ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={previewVisivel}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removerImagem}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => inputFileRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Trocar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => inputFileRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-teal-400 hover:text-teal-500 hover:bg-teal-50 transition-all"
                >
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-sm font-medium">Clique para adicionar foto</span>
                  <span className="text-xs">JPG, PNG ou WEBP</span>
                </button>
              )}
              <input
                ref={inputFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={selecionarImagem}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Picanha 300g"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição breve"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Preço de venda (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custo unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.custo}
                  onChange={(e) => setForm({ ...form, custo: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tempo estimado (min)</Label>
                <Input
                  type="number"
                  value={form.tempo_preparo_estimado}
                  onChange={(e) => setForm({ ...form, tempo_preparo_estimado: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ex: Carnes"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estação *</Label>
                <Select
                  value={form.estacao}
                  onValueChange={(v) => setForm({ ...form, estacao: v as EstacaoTipo })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTACOES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTACAO_EMOJI[e]} {e.charAt(0).toUpperCase() + e.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={salvando || uploadando}
              >
                {uploadando ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando foto...</>
                ) : salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
