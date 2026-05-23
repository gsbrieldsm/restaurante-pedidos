'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight,
  Clock, Loader2, Search, Receipt, ConciergeBell, CheckCircle2, X
} from 'lucide-react'
import type { CardapioItem, GrupoOpcao, OpcaoSelecionada, ItemCarrinho } from '@/lib/supabase/types'

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳',
  bar: '🍺',
  drinks: '🍹',
  chopeira: '🍻',
}

export default function CardapioPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()
  const searchParams = useSearchParams()

  const [itens, setItens] = useState<CardapioItem[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  // — bottom sheet de opcionais —
  const [itemOpcionais, setItemOpcionais] = useState<(CardapioItem & { grupos_opcao: GrupoOpcao[] }) | null>(null)
  const [selecoes, setSelecoes] = useState<Record<string, string[]>>({}) // grupoId → [opcaoId]
  const [obsOpcional, setObsOpcional] = useState('')

  const [chamandoGarcom, setChamandoGarcom] = useState(false)
  const [garcomChamado, setGarcomChamado] = useState(false)
  const [banner, setBanner] = useState<{
    banner_ativo:             boolean
    banner_titulo:            string
    banner_subtitulo:         string
    banner_emoji:             string
    banner_estilo:            string
    banner_imagem_url:        string | null
    banner_imagem_url_mobile: string | null
  } | null>(null)
  const [bannerFechado, setBannerFechado] = useState(false)
  const [branding, setBranding] = useState<{
    restaurante_nome:     string
    restaurante_logo_url: string | null
    cor_primaria:         string
  }>({ restaurante_nome: '', restaurante_logo_url: null, cor_primaria: '#1A9B8A' })

  useEffect(() => {
    // Se veio via garçom com ?sessao=, salva no sessionStorage
    const sessaoParam = searchParams.get('sessao')
    if (sessaoParam) {
      sessionStorage.setItem('sessao_id', sessaoParam)
    }

    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) {
      router.push(`/mesa/${token}`)
      return
    }

    Promise.all([
      fetch(`/api/cardapio?token=${token}`).then((r) => r.json()),
      fetch(`/api/configuracoes/banner?mesa_token=${token}`).then((r) => r.json()),
    ]).then(([cardapioData, bannerData]) => {
      const lista = cardapioData.itens ?? []
      setItens(lista)
      if (lista.length > 0) setCategoriaAtiva(lista[0].categoria)
      if (bannerData.banner) setBanner(bannerData.banner)
      if (bannerData.branding) setBranding(bannerData.branding)
    }).finally(() => setLoading(false))
  }, [token, router, searchParams])

  const categorias = useMemo(
    () => [...new Set(itens.map((i) => i.categoria))],
    [itens]
  )

  const itensFiltrados = useMemo(() => {
    let lista = itens
    if (busca) {
      lista = lista.filter(
        (i) =>
          i.nome.toLowerCase().includes(busca.toLowerCase()) ||
          i.descricao?.toLowerCase().includes(busca.toLowerCase())
      )
    } else {
      lista = lista.filter((i) => i.categoria === categoriaAtiva)
    }
    return lista
  }, [itens, categoriaAtiva, busca])

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0)
  const qtdCarrinho = carrinho.reduce((acc, i) => acc + i.quantidade, 0)

  function abrirOpcionais(item: CardapioItem & { grupos_opcao?: GrupoOpcao[] }) {
    const grupos = item.grupos_opcao ?? []
    if (grupos.length === 0) {
      // sem opcionais: adiciona direto
      adicionarSemOpcional(item)
      return
    }
    setItemOpcionais(item as CardapioItem & { grupos_opcao: GrupoOpcao[] })
    setSelecoes({})
    setObsOpcional('')
  }

  function adicionarSemOpcional(item: CardapioItem) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((c) => c.carrinhoKey === item.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + 1 }
        return novo
      }
      return [...prev, {
        carrinhoKey: item.id,
        item,
        quantidade: 1,
        observacao: '',
        opcoes_selecionadas: [],
        preco_unitario: item.preco,
      }]
    })
  }

  function adicionarItem(item: CardapioItem) {
    abrirOpcionais(item as CardapioItem & { grupos_opcao?: GrupoOpcao[] })
  }

  function confirmarOpcionais() {
    if (!itemOpcionais) return
    const grupos = itemOpcionais.grupos_opcao ?? []

    // valida obrigatórios
    for (const g of grupos) {
      if (g.obrigatorio && (!selecoes[g.id] || selecoes[g.id].length === 0)) return
    }

    const opcoesSelecionadas: OpcaoSelecionada[] = grupos.flatMap((g) =>
      (selecoes[g.id] ?? []).map((opcaoId) => {
        const opcao = g.opcoes.find((o) => o.id === opcaoId)!
        return {
          grupo_id: g.id,
          grupo_nome: g.nome,
          opcao_id: opcaoId,
          opcao_nome: opcao.nome,
          preco_adicional: opcao.preco_adicional,
        }
      })
    )

    const adicional = opcoesSelecionadas.reduce((acc, o) => acc + o.preco_adicional, 0)
    const preco_unitario = itemOpcionais.preco + adicional
    const carrinhoKey = crypto.randomUUID()

    setCarrinho((prev) => [...prev, {
      carrinhoKey,
      item: itemOpcionais,
      quantidade: 1,
      observacao: obsOpcional,
      opcoes_selecionadas: opcoesSelecionadas,
      preco_unitario,
    }])

    setItemOpcionais(null)
  }

  function toggleSelecao(grupo: GrupoOpcao, opcaoId: string) {
    setSelecoes((prev) => {
      const atual = prev[grupo.id] ?? []
      if (grupo.multiplo) {
        // checkbox: toggle
        return {
          ...prev,
          [grupo.id]: atual.includes(opcaoId)
            ? atual.filter((id) => id !== opcaoId)
            : [...atual, opcaoId],
        }
      } else {
        // radio: seleciona um só
        return { ...prev, [grupo.id]: [opcaoId] }
      }
    })
  }

  function precoOpcionalAtual(): number {
    if (!itemOpcionais) return 0
    return itemOpcionais.grupos_opcao.flatMap((g) =>
      (selecoes[g.id] ?? []).map((id) => g.opcoes.find((o) => o.id === id)?.preco_adicional ?? 0)
    ).reduce((a, b) => a + b, 0)
  }

  function opcionaisValidos(): boolean {
    if (!itemOpcionais) return false
    return itemOpcionais.grupos_opcao
      .filter((g) => g.obrigatorio)
      .every((g) => (selecoes[g.id] ?? []).length > 0)
  }

  function removerItem(carrinhoKey: string) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((c) => c.carrinhoKey === carrinhoKey)
      if (idx < 0) return prev
      const novo = [...prev]
      if (novo[idx].quantidade > 1) {
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade - 1 }
      } else {
        novo.splice(idx, 1)
      }
      return novo
    })
  }

  function adicionarMaisNoCarrinho(carrinhoKey: string) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((c) => c.carrinhoKey === carrinhoKey)
      if (idx < 0) return prev
      const novo = [...prev]
      novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + 1 }
      return novo
    })
  }

  function qtdNoCarrinho(itemId: string) {
    return carrinho.filter((c) => c.item.id === itemId).reduce((acc, c) => acc + c.quantidade, 0)
  }

  async function finalizarPedido() {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId || !carrinho.length) return

    setEnviando(true)

    const itensComObs = carrinho.map((c) => ({
      ...c,
      observacao: c.opcoes_selecionadas.length > 0 ? c.observacao : (observacoes[c.item.id] || ''),
    }))

    const resp = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao_id: sessaoId, itens: itensComObs }),
    })

    const data = await resp.json()
    setEnviando(false)

    if (resp.ok) {
      sessionStorage.setItem('ultimo_pedido_id', data.pedido.id)
      router.push(`/mesa/${token}/confirmacao`)
    }
  }

  // Gera gradiente do header a partir da cor primária do restaurante
  function darkenHex(hex: string, factor: number): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`
  }
  const cor = branding.cor_primaria ?? '#1A9B8A'
  const headerGradient = `linear-gradient(135deg, ${darkenHex(cor, 0.10)} 0%, ${darkenHex(cor, 0.28)} 50%, ${cor} 100%)`

  const BANNER_ESTILOS: Record<string, { gradient: string; subColor: string }> = {
    teal:   { gradient: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)', subColor: '#5eead4' },
    ocean:  { gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2d5e 50%, #1a6eb5 100%)', subColor: '#93c5fd' },
    sunset: { gradient: 'linear-gradient(135deg, #1a0808 0%, #5e1a0d 50%, #e0533a 100%)', subColor: '#fca5a5' },
    gold:   { gradient: 'linear-gradient(135deg, #1a1205 0%, #5e3e0d 50%, #d4a017 100%)', subColor: '#fde68a' },
    roxo:   { gradient: 'linear-gradient(135deg, #12091a 0%, #3d1a5e 50%, #8b5cf6 100%)', subColor: '#c4b5fd' },
  }

  async function chamarGarcom() {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId || chamandoGarcom || garcomChamado) return
    setChamandoGarcom(true)
    await fetch(`/api/mesa/${token}/chamar-garcom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessao_id: sessaoId, motivo: 'ajuda' }),
    })
    setChamandoGarcom(false)
    setGarcomChamado(true)
    // Reset após 4 segundos para permitir chamar novamente
    setTimeout(() => setGarcomChamado(false), 4000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F0FAFA' }}>
      {/* Header */}
      <div
        className="text-white sticky top-0 z-10 shadow-lg"
        style={{ background: headerGradient }}
      >
        {/* Linha superior: marca + ações */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.restaurante_logo_url && (
              <img
                src={branding.restaurante_logo_url}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-white/20"
              />
            )}
            <div className="min-w-0">
              {branding.restaurante_nome && (
                <p className="text-xs font-bold tracking-widest uppercase leading-none truncate text-white/70">
                  {branding.restaurante_nome}
                </p>
              )}
              <p className="text-white font-black text-xl leading-tight">Cardápio</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Chamar garçom */}
            <button
              onClick={chamarGarcom}
              disabled={chamandoGarcom}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium transition-all ${
                garcomChamado
                  ? 'bg-green-500/20 text-green-300'
                  : 'text-teal-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {chamandoGarcom ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : garcomChamado ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ConciergeBell className="w-4 h-4" />
              )}
              <span>{garcomChamado ? 'Chamado!' : 'Garçom'}</span>
            </button>

            {/* Minha conta */}
            <button
              onClick={() => router.push(`/mesa/${token}/conta`)}
              className="flex items-center gap-1.5 text-sm text-teal-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors font-medium"
            >
              <Receipt className="w-4 h-4" />
              <span>Conta</span>
            </button>

            {/* Carrinho */}
            <button onClick={() => setCarrinhoAberto(true)} className="relative p-1.5">
              <ShoppingCart className="w-6 h-6" />
              {qtdCarrinho > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center" style={{ color: cor }}>
                  {qtdCarrinho}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
            <input
              className="w-full bg-white/10 placeholder-teal-400 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-white/20 transition-colors"
              placeholder="Buscar no cardápio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Categorias */}
        {!busca && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  categoriaAtiva === cat
                    ? 'bg-white font-bold shadow'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                style={categoriaAtiva === cat ? { color: cor } : undefined}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toast: garçom chamado */}
      {garcomChamado && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Garçom chamado!</p>
            <p className="text-green-600 text-xs">Alguém estará com você em breve.</p>
          </div>
        </div>
      )}

      {/* Banner personalizável */}
      {banner?.banner_ativo && !bannerFechado && (() => {
        const temImagem = !!(banner.banner_imagem_url || banner.banner_imagem_url_mobile)
        const estilo = BANNER_ESTILOS[banner.banner_estilo] ?? BANNER_ESTILOS.teal

        return (
          <div className="px-4 pt-4">
            <div className="relative rounded-3xl overflow-hidden shadow-xl">

              {/* Botão fechar */}
              <button
                onClick={() => setBannerFechado(true)}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>

              {temImagem ? (
                /* ── Modo imagem ── */
                <>
                  <picture>
                    {/* Mobile: usa imagem mobile se existir, senão fallback para desktop */}
                    {banner.banner_imagem_url_mobile && (
                      <source media="(max-width: 767px)" srcSet={banner.banner_imagem_url_mobile} />
                    )}
                    {/* Desktop: usa imagem desktop se existir */}
                    {banner.banner_imagem_url && (
                      <source media="(min-width: 768px)" srcSet={banner.banner_imagem_url} />
                    )}
                    <img
                      src={banner.banner_imagem_url || banner.banner_imagem_url_mobile!}
                      alt={banner.banner_titulo}
                      className="w-full h-52 object-cover"
                    />
                  </picture>
                  {/* overlay degradê de baixo para cima */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pr-10">
                    {banner.banner_emoji && (
                      <div className="text-4xl mb-2 leading-none">{banner.banner_emoji}</div>
                    )}
                    <h2 className="text-white font-black text-2xl leading-tight drop-shadow">
                      {banner.banner_titulo}
                    </h2>
                    {banner.banner_subtitulo && (
                      <p className="text-white/75 text-sm mt-1.5 leading-relaxed">
                        {banner.banner_subtitulo}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* ── Modo gradiente ── */
                <div style={{ background: estilo.gradient }}>
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
                  <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full opacity-5 bg-white" />
                  <div className="relative px-6 pt-6 pb-7 pr-10">
                    <div className="text-5xl mb-4 leading-none">{banner.banner_emoji}</div>
                    <h2 className="text-white font-black text-2xl leading-tight">
                      {banner.banner_titulo}
                    </h2>
                    {banner.banner_subtitulo && (
                      <p className="text-sm mt-2 leading-relaxed font-medium" style={{ color: estilo.subColor }}>
                        {banner.banner_subtitulo}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Itens */}
      <div className="p-4 space-y-4">
        {itensFiltrados.length === 0 && (
          <p className="text-center text-slate-400 mt-8">Nenhum item encontrado.</p>
        )}
        {itensFiltrados.map((item) => {
          const qtd = qtdNoCarrinho(item.id)
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden flex"
            >
              {/* Foto lateral */}
              {item.imagem_url ? (
                <img
                  src={item.imagem_url}
                  alt={item.nome}
                  className="w-36 h-36 object-cover shrink-0"
                />
              ) : (
                <div className="w-36 h-36 bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center shrink-0">
                  <span className="text-4xl opacity-30">{ESTACAO_EMOJI[item.estacao]}</span>
                </div>
              )}

              {/* Conteúdo */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                      {item.nome}
                    </h3>
                    <span className="text-base shrink-0">{ESTACAO_EMOJI[item.estacao]}</span>
                  </div>
                  {item.descricao && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-teal-700 font-black text-base">
                      R$ {item.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      ~{item.tempo_preparo_estimado}min
                    </span>
                  </div>
                </div>

                {/* Botão / controle de quantidade */}
                <div className="flex items-center justify-end mt-3">
                  {qtd === 0 ? (
                    <Button
                      onClick={() => adicionarItem(item)}
                      className="h-10 px-5 text-sm font-bold text-black hover:opacity-90"
                      style={{ background: branding.cor_primaria }}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Adicionar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removerItem(item.id)}
                        className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-lg w-5 text-center text-slate-800">{qtd}</span>
                      <button
                        onClick={() => adicionarItem(item)}
                        className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botão fixo do carrinho */}
      {qtdCarrinho > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button
            onClick={() => setCarrinhoAberto(true)}
            className="w-full h-12 text-base font-bold text-black hover:opacity-90"
            style={{ background: branding.cor_primaria }}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver pedido ({qtdCarrinho} {qtdCarrinho === 1 ? 'item' : 'itens'}) —{' '}
            R$ {totalCarrinho.toFixed(2).replace('.', ',')}
          </Button>
        </div>
      )}

      {/* ── Bottom sheet de opcionais ── */}
      {itemOpcionais && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setItemOpcionais(null)} />
          <div
            className="relative bg-white rounded-t-3xl flex flex-col w-full"
            style={{ maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
          >
            {/* Alça */}
            <div className="shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Cabeçalho */}
            <div className="shrink-0 px-5 pt-2 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-lg leading-snug">{itemOpcionais.nome}</p>
                  {itemOpcionais.descricao && (
                    <p className="text-sm text-slate-500 mt-0.5">{itemOpcionais.descricao}</p>
                  )}
                </div>
                <button
                  onClick={() => setItemOpcionais(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Grupos com scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 min-h-0">
              {itemOpcionais.grupos_opcao.map((grupo) => (
                <div key={grupo.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-bold text-slate-800 text-sm">{grupo.nome}</p>
                    {grupo.obrigatorio ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Obrigatório</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Opcional</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {grupo.opcoes.map((opcao) => {
                      const selecionado = (selecoes[grupo.id] ?? []).includes(opcao.id)
                      return (
                        <button
                          key={opcao.id}
                          onClick={() => toggleSelecao(grupo, opcao.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                            selecionado
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`shrink-0 flex items-center justify-center transition-colors ${
                              grupo.multiplo
                                ? `w-5 h-5 rounded border-2 ${selecionado ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`
                                : `w-5 h-5 rounded-full border-2 ${selecionado ? 'border-teal-500' : 'border-slate-300'}`
                            }`}>
                              {selecionado && (
                                grupo.multiplo
                                  ? <span className="text-white text-xs font-black">✓</span>
                                  : <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                              )}
                            </div>
                            <span className={`text-sm font-medium ${selecionado ? 'text-teal-800' : 'text-slate-700'}`}>
                              {opcao.nome}
                            </span>
                          </div>
                          {opcao.preco_adicional > 0 && (
                            <span className={`text-sm font-bold shrink-0 ${selecionado ? 'text-teal-700' : 'text-slate-500'}`}>
                              +R$ {opcao.preco_adicional.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Observação */}
              <div>
                <p className="font-bold text-slate-800 text-sm mb-2">Observação</p>
                <input
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 placeholder-slate-400 outline-none focus:border-teal-400"
                  placeholder="Alguma observação? (ex: sem cebola)"
                  value={obsOpcional}
                  onChange={(e) => setObsOpcional(e.target.value)}
                />
              </div>
            </div>

            {/* Botão confirmar */}
            <div className="shrink-0 px-5 pt-3 pb-2 border-t border-slate-100 bg-white">
              <button
                onClick={confirmarOpcionais}
                disabled={!opcionaisValidos()}
                className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-2xl disabled:opacity-40 transition-opacity"
                style={{ background: branding.cor_primaria, height: '52px' }}
              >
                Adicionar
                {precoOpcionalAtual() > 0
                  ? ` — R$ ${(itemOpcionais.preco + precoOpcionalAtual()).toFixed(2).replace('.', ',')}`
                  : ` — R$ ${itemOpcionais.preco.toFixed(2).replace('.', ',')}`}
              </button>
              {itemOpcionais.grupos_opcao.some((g) => g.obrigatorio && (!selecoes[g.id] || selecoes[g.id].length === 0)) && (
                <p className="text-center text-xs text-slate-400 mt-2">Selecione as opções obrigatórias para continuar</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer do carrinho — custom, sem dependência do Sheet */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCarrinhoAberto(false)}
          />

          {/* Painel */}
          <div
            className="relative bg-white rounded-t-3xl flex flex-col w-full"
            style={{
              maxHeight: '82vh',
              paddingBottom: 'env(safe-area-inset-bottom, 12px)',
            }}
          >
            {/* Alça */}
            <div className="shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Cabeçalho */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-teal-600" />
                <span className="font-bold text-lg text-slate-800">Meu Pedido</span>
              </div>
              <button
                onClick={() => setCarrinhoAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista com scroll próprio */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0">
              {carrinho.length === 0 && (
                <p className="text-center text-slate-400 mt-8">Carrinho vazio.</p>
              )}
              {carrinho.map((c) => (
                <div key={c.carrinhoKey} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => removerItem(c.carrinhoKey)}
                        className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                      >
                        {c.quantidade === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="font-bold text-base w-5 text-center">{c.quantidade}</span>
                      <button
                        onClick={() => adicionarMaisNoCarrinho(c.carrinhoKey)}
                        className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-slate-800 leading-snug">{c.item.nome}</p>
                      {c.opcoes_selecionadas.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.opcoes_selecionadas.map((o) => o.opcao_nome).join(' · ')}
                        </p>
                      )}
                      <p className="text-sm text-teal-700 font-medium mt-0.5">
                        R$ {(c.preco_unitario * c.quantidade).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  {c.opcoes_selecionadas.length === 0 && (
                    <input
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 placeholder-slate-400 outline-none focus:border-teal-400"
                      placeholder="Alguma observação? (ex: sem cebola)"
                      value={observacoes[c.item.id] || ''}
                      onChange={(e) =>
                        setObservacoes((prev) => ({ ...prev, [c.item.id]: e.target.value }))
                      }
                    />
                  )}
                  {c.observacao && c.opcoes_selecionadas.length > 0 && (
                    <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-1.5">⚠️ {c.observacao}</p>
                  )}
                  <Separator />
                </div>
              ))}
            </div>

            {/* Rodapé — sempre visível, nunca scrollável */}
            {carrinho.length > 0 && (
              <div className="shrink-0 px-5 pt-3 pb-2 border-t border-slate-100 space-y-3 bg-white">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-slate-800">Total</span>
                  <span className="font-black text-2xl text-teal-700">
                    R$ {totalCarrinho.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <button
                  onClick={finalizarPedido}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 font-bold text-base text-black rounded-2xl disabled:opacity-50"
                  style={{ background: branding.cor_primaria, height: '52px' }}
                >
                  {enviando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <>Confirmar Pedido <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
