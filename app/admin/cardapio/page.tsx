'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import type { CardapioItem, EstacaoTipo, GrupoOpcao } from '@/lib/supabase/types'

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

  // — Opcionais —
  const [modalOpcionaisItem, setModalOpcionaisItem] = useState<CardapioItem | null>(null)
  const [grupos, setGrupos] = useState<GrupoOpcao[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(false)
  const [novoGrupoAberto, setNovoGrupoAberto] = useState(false)
  const [novoGrupoForm, setNovoGrupoForm] = useState({ nome: '', obrigatorio: false, multiplo: false })
  const [salvandoGrupo, setSalvandoGrupo] = useState(false)
  // opcao nova por grupo: Record<grupoId, { nome, preco }>
  const [novaOpcaoForm, setNovaOpcaoForm] = useState<Record<string, { nome: string; preco: string }>>({})
  const [salvandoOpcao, setSalvandoOpcao] = useState<string | null>(null)

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

  async function abrirOpcionais(item: CardapioItem) {
    setModalOpcionaisItem(item)
    setLoadingGrupos(true)
    setNovoGrupoAberto(false)
    setNovoGrupoForm({ nome: '', obrigatorio: false, multiplo: false })
    const res = await fetch(`/api/admin/cardapio/${item.id}/opcoes`)
    const data = await res.json()
    setGrupos(data.grupos ?? [])
    setLoadingGrupos(false)
  }

  async function salvarNovoGrupo() {
    if (!modalOpcionaisItem || !novoGrupoForm.nome.trim()) return
    setSalvandoGrupo(true)
    await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoGrupoForm),
    })
    setSalvandoGrupo(false)
    setNovoGrupoAberto(false)
    setNovoGrupoForm({ nome: '', obrigatorio: false, multiplo: false })
    const res = await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`)
    const data = await res.json()
    setGrupos(data.grupos ?? [])
  }

  async function deletarGrupo(grupoId: string) {
    if (!modalOpcionaisItem) return
    if (!confirm('Remover este grupo e todas as suas opções?')) return
    await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupo_id: grupoId }),
    })
    const res = await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`)
    const data = await res.json()
    setGrupos(data.grupos ?? [])
  }

  async function adicionarOpcao(grupoId: string) {
    if (!modalOpcionaisItem) return
    const form = novaOpcaoForm[grupoId]
    if (!form?.nome.trim()) return
    setSalvandoOpcao(grupoId)
    await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'criar_opcao',
        grupo_id: grupoId,
        nome: form.nome.trim(),
        preco_adicional: parseFloat(form.preco || '0') || 0,
      }),
    })
    setSalvandoOpcao(null)
    setNovaOpcaoForm((prev) => ({ ...prev, [grupoId]: { nome: '', preco: '' } }))
    const res = await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`)
    const data = await res.json()
    setGrupos(data.grupos ?? [])
  }

  async function deletarOpcao(opcaoId: string) {
    if (!modalOpcionaisItem) return
    await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'deletar_opcao', opcao_id: opcaoId }),
    })
    const res = await fetch(`/api/admin/cardapio/${modalOpcionaisItem.id}/opcoes`)
    const data = await res.json()
    setGrupos(data.grupos ?? [])
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

                        <button
                          onClick={() => abrirOpcionais(item)}
                          title="Opcionais"
                          className="p-1.5 rounded hover:bg-teal-50 relative"
                        >
                          <Settings2 className="w-4 h-4 text-teal-500" />
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

      {/* ── Modal Opcionais ── */}
      <Dialog open={!!modalOpcionaisItem} onOpenChange={(v) => { if (!v) setModalOpcionaisItem(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-600" />
              Opcionais — {modalOpcionaisItem?.nome}
            </DialogTitle>
          </DialogHeader>

          {loadingGrupos ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

              {grupos.length === 0 && !novoGrupoAberto && (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nenhum grupo de opcionais ainda.<br />Clique em "Novo grupo" para começar.
                </p>
              )}

              {/* Lista de grupos existentes */}
              {grupos.map((grupo) => {
                const opcaoForm = novaOpcaoForm[grupo.id] ?? { nome: '', preco: '' }
                return (
                  <div key={grupo.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Cabeçalho do grupo */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-semibold text-slate-800 text-sm truncate">{grupo.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          grupo.obrigatorio ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {grupo.obrigatorio ? 'Obrigatório' : 'Opcional'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-600 font-medium">
                          {grupo.multiplo ? 'Múltipla escolha' : 'Escolha única'}
                        </span>
                      </div>
                      <button
                        onClick={() => deletarGrupo(grupo.id)}
                        className="p-1.5 rounded hover:bg-red-50 shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    {/* Opções do grupo */}
                    <div className="divide-y divide-slate-100">
                      {grupo.opcoes.length === 0 && (
                        <p className="text-xs text-slate-400 px-4 py-2">Nenhuma opção ainda.</p>
                      )}
                      {grupo.opcoes.map((opcao) => (
                        <div key={opcao.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm text-slate-700 truncate">{opcao.nome}</span>
                            {opcao.preco_adicional > 0 && (
                              <span className="text-xs text-teal-600 font-medium shrink-0">
                                +R$ {opcao.preco_adicional.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deletarOpcao(opcao.id)}
                            className="p-1 rounded hover:bg-red-50 shrink-0 ml-2"
                          >
                            <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      ))}

                      {/* Form nova opção */}
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50/50">
                        <input
                          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400"
                          placeholder="Nome da opção"
                          value={opcaoForm.nome}
                          onChange={(e) => setNovaOpcaoForm((p) => ({ ...p, [grupo.id]: { ...opcaoForm, nome: e.target.value } }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') adicionarOpcao(grupo.id) }}
                        />
                        <input
                          className="w-24 shrink-0 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400"
                          placeholder="+ R$ 0,00"
                          type="number"
                          step="0.50"
                          min="0"
                          value={opcaoForm.preco}
                          onChange={(e) => setNovaOpcaoForm((p) => ({ ...p, [grupo.id]: { ...opcaoForm, preco: e.target.value } }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') adicionarOpcao(grupo.id) }}
                        />
                        <button
                          onClick={() => adicionarOpcao(grupo.id)}
                          disabled={!opcaoForm.nome.trim() || salvandoOpcao === grupo.id}
                          className="shrink-0 p-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700"
                        >
                          {salvandoOpcao === grupo.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Form novo grupo */}
              {novoGrupoAberto ? (
                <div className="border-2 border-dashed border-teal-300 rounded-xl p-4 space-y-3 bg-teal-50/30">
                  <p className="text-sm font-semibold text-teal-700">Novo grupo</p>
                  <input
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400"
                    placeholder="Nome do grupo (ex: Tamanho, Acompanhamento)"
                    value={novoGrupoForm.nome}
                    onChange={(e) => setNovoGrupoForm((p) => ({ ...p, nome: e.target.value }))}
                    autoFocus
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setNovoGrupoForm((p) => ({ ...p, obrigatorio: !p.obrigatorio }))}
                        className={`w-9 h-5 rounded-full transition-colors relative ${novoGrupoForm.obrigatorio ? 'bg-red-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${novoGrupoForm.obrigatorio ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-sm text-slate-600">Obrigatório</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setNovoGrupoForm((p) => ({ ...p, multiplo: !p.multiplo }))}
                        className={`w-9 h-5 rounded-full transition-colors relative ${novoGrupoForm.multiplo ? 'bg-teal-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${novoGrupoForm.multiplo ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-sm text-slate-600">Múltipla escolha</span>
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setNovoGrupoAberto(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      disabled={!novoGrupoForm.nome.trim() || salvandoGrupo}
                      onClick={salvarNovoGrupo}
                    >
                      {salvandoGrupo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar grupo'}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNovoGrupoAberto(true)}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Novo grupo de opcionais
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
