'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight,
  Clock, Loader2, Search, Receipt
} from 'lucide-react'
import type { CardapioItem, ItemCarrinho } from '@/lib/supabase/types'

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳',
  bar: '🍺',
  drinks: '🍹',
  chopeira: '🍻',
}

export default function CardapioPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [itens, setItens] = useState<CardapioItem[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})

  useEffect(() => {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId) {
      router.push(`/mesa/${token}`)
      return
    }

    fetch('/api/cardapio')
      .then((r) => r.json())
      .then(({ itens }) => {
        setItens(itens)
        if (itens.length > 0) {
          setCategoriaAtiva(itens[0].categoria)
        }
      })
      .finally(() => setLoading(false))
  }, [token, router])

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

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.item.preco * i.quantidade, 0)
  const qtdCarrinho = carrinho.reduce((acc, i) => acc + i.quantidade, 0)

  function adicionarItem(item: CardapioItem) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + 1 }
        return novo
      }
      return [...prev, { item, quantidade: 1, observacao: '' }]
    })
  }

  function removerItem(itemId: string) {
    setCarrinho((prev) => {
      const idx = prev.findIndex((c) => c.item.id === itemId)
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

  function qtdNoCarrinho(itemId: string) {
    return carrinho.find((c) => c.item.id === itemId)?.quantidade || 0
  }

  async function finalizarPedido() {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId || !carrinho.length) return

    setEnviando(true)

    const itensComObs = carrinho.map((c) => ({
      ...c,
      observacao: observacoes[c.item.id] || '',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F0FAFA' }}>
      {/* Header compacto */}
      <div className="text-white sticky top-0 z-10 shadow" style={{ background: '#F05A4F' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-widest text-sm uppercase text-teal-400">Meu Menu+</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/mesa/${token}/conta`)}
              className="flex items-center gap-1 text-xs text-teal-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>Minha conta</span>
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400" />
              <input
                className="bg-white/10 placeholder-teal-400 text-white rounded-lg py-1.5 pl-8 pr-3 text-sm outline-none focus:bg-white/20 w-36"
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button onClick={() => setCarrinhoAberto(true)} className="relative p-1.5">
              <ShoppingCart className="w-5 h-5" />
              {qtdCarrinho > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-teal-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {qtdCarrinho}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categorias dentro do header */}
        {!busca && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  categoriaAtiva === cat
                    ? 'bg-teal-600 text-black font-bold'
                    : 'bg-white/10 text-teal-300 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="p-4 space-y-3">
        {itensFiltrados.length === 0 && (
          <p className="text-center text-slate-400 mt-8">Nenhum item encontrado.</p>
        )}
        {itensFiltrados.map((item) => {
          const qtd = qtdNoCarrinho(item.id)
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden flex"
            >
              {item.imagem_url && (
                <img
                  src={item.imagem_url}
                  alt={item.nome}
                  className="w-24 h-24 object-cover"
                />
              )}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight">
                      {item.nome}
                    </h3>
                    <span className="text-xs">{ESTACAO_EMOJI[item.estacao]}</span>
                  </div>
                  {item.descricao && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {item.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-teal-700 font-bold text-sm">
                      R$ {item.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      ~{item.tempo_preparo_estimado}min
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-2">
                  {qtd === 0 ? (
                    <Button
                      size="sm"
                      onClick={() => adicionarItem(item)}
                      className="h-8 px-4 text-xs font-bold text-black hover:opacity-90"
                      style={{ background: '#F05A4F' }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removerItem(item.id)}
                        className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{qtd}</span>
                      <button
                        onClick={() => adicionarItem(item)}
                        className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
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
            style={{ background: '#F05A4F' }}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver pedido ({qtdCarrinho} {qtdCarrinho === 1 ? 'item' : 'itens'}) —{' '}
            R$ {totalCarrinho.toFixed(2).replace('.', ',')}
          </Button>
        </div>
      )}

      {/* Drawer do carrinho */}
      <Sheet open={carrinhoAberto} onOpenChange={setCarrinhoAberto}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-teal-600" />
              Meu Pedido
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4">
            {carrinho.length === 0 && (
              <p className="text-center text-slate-400 mt-8">Carrinho vazio.</p>
            )}
            {carrinho.map((c) => (
              <div key={c.item.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removerItem(c.item.id)}
                      className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                    >
                      {c.quantidade === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="font-bold w-4 text-center">{c.quantidade}</span>
                    <button
                      onClick={() => adicionarItem(c.item)}
                      className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.item.nome}</p>
                    <p className="text-xs text-slate-500">
                      R$ {(c.item.preco * c.quantidade).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                <input
                  className="w-full text-xs border rounded-lg px-3 py-2 placeholder-slate-400"
                  placeholder="Alguma observação? (ex: sem cebola)"
                  value={observacoes[c.item.id] || ''}
                  onChange={(e) =>
                    setObservacoes((prev) => ({ ...prev, [c.item.id]: e.target.value }))
                  }
                />
                <Separator />
              </div>
            ))}
          </div>

          {carrinho.length > 0 && (
            <div className="pt-3 space-y-3">
              <div className="flex justify-between items-center font-bold text-base">
                <span>Total</span>
                <span className="text-teal-700">
                  R$ {totalCarrinho.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <Button
                onClick={finalizarPedido}
                className="w-full h-12 text-base font-bold text-black hover:opacity-90"
                style={{ background: '#F05A4F' }}
                disabled={enviando}
              >
                {enviando ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <>Confirmar Pedido <ChevronRight className="w-5 h-5 ml-1" /></>
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
