'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, Check, X, Clock } from 'lucide-react'

interface ItemCardapio {
  id: string
  nome: string
  descricao: string | null
  preco: number
  categoria: string
  estacao: string
  foto_url: string | null
  tempo_preparo_min: number | null
  destaque: boolean
}

interface ItemCarrinho {
  item: ItemCardapio
  quantidade: number
  observacao: string
}

type Tela = 'cardapio' | 'carrinho' | 'confirmacao' | 'senha'

function formatarReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

export default function TotemPage() {
  const [itens, setItens] = useState<ItemCardapio[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [tela, setTela] = useState<Tela>('cardapio')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [senha, setSenha] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)

  // Busca cardápio
  useEffect(() => {
    fetch('/api/totem/cardapio')
      .then(r => r.json())
      .then(({ itens }) => {
        setItens(itens ?? [])
        const cats = [...new Set((itens ?? []).map((i: ItemCardapio) => i.categoria))]
        if (cats.length) setCategoriaAtiva(cats[0] as string)
      })
      .finally(() => setLoading(false))
  }, [])

  // Reset automático após 60s na tela de senha
  useEffect(() => {
    if (tela !== 'senha') return
    const t = setTimeout(() => resetar(), 60000)
    return () => clearTimeout(t)
  }, [tela])

  const categorias = [...new Set(itens.map(i => i.categoria))]
  const itensFiltrados = itens.filter(i => i.categoria === categoriaAtiva)

  const totalCarrinho = carrinho.reduce((acc, c) => acc + c.item.preco * c.quantidade, 0)
  const qtdCarrinho   = carrinho.reduce((acc, c) => acc + c.quantidade, 0)

  function adicionar(item: ItemCardapio) {
    setCarrinho(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade + 1 }
        return novo
      }
      return [...prev, { item, quantidade: 1, observacao: '' }]
    })
  }

  function remover(itemId: string) {
    setCarrinho(prev => {
      const idx = prev.findIndex(c => c.item.id === itemId)
      if (idx < 0) return prev
      const novo = [...prev]
      if (novo[idx].quantidade === 1) {
        novo.splice(idx, 1)
      } else {
        novo[idx] = { ...novo[idx], quantidade: novo[idx].quantidade - 1 }
      }
      return novo
    })
  }

  function qtdItem(itemId: string) {
    return carrinho.find(c => c.item.id === itemId)?.quantidade ?? 0
  }

  async function confirmarPedido() {
    setEnviando(true)
    try {
      const res = await fetch('/api/totem/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: 'Balcão',
          itens: carrinho.map(c => ({
            item_id:    c.item.id,
            item_nome:  c.item.nome,
            quantidade: c.quantidade,
            item_preco: c.item.preco,
            estacao:    c.item.estacao,
            observacao: c.observacao || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (data.senha) {
        setSenha(data.senha)
        setTela('senha')
      }
    } finally {
      setEnviando(false)
    }
  }

  function resetar() {
    setCarrinho([])
    setSenha(null)
    setTela('cardapio')
    const cats = [...new Set(itens.map(i => i.categoria))]
    if (cats.length) setCategoriaAtiva(cats[0])
  }

  // ── TELA SENHA ──
  if (tela === 'senha') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-10"
        style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}>
        <div className="text-center space-y-4">
          <Check className="w-20 h-20 text-white mx-auto" strokeWidth={3} />
          <h1 className="text-4xl font-black text-white">Pedido confirmado!</h1>
          <p className="text-teal-200 text-xl">Aguarde sua senha ser chamada</p>
        </div>

        <div className="bg-white rounded-3xl px-24 py-12 text-center shadow-2xl">
          <p className="text-slate-400 text-lg font-semibold uppercase tracking-widest mb-2">Sua senha</p>
          <p className="text-[120px] font-black leading-none" style={{ color: '#1A9B8A' }}>
            {String(senha).padStart(3, '0')}
          </p>
          <p className="text-slate-400 text-sm mt-4">Retire no balcão quando chamado</p>
        </div>

        <button
          onClick={resetar}
          className="px-10 py-4 rounded-2xl text-white font-bold text-lg border border-white/30 hover:bg-white/10 transition-all"
        >
          Novo pedido
        </button>

        <p className="text-teal-300/50 text-sm">Esta tela reinicia automaticamente em 60 segundos</p>
      </div>
    )
  }

  // ── TELA CARRINHO ──
  if (tela === 'carrinho') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F0FAFA' }}>
        {/* Header */}
        <div className="px-8 py-6 flex items-center gap-4 bg-white border-b border-slate-200">
          <button onClick={() => setTela('cardapio')}
            className="p-3 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-2xl font-black text-slate-800">Seu pedido</h1>
        </div>

        {/* Itens */}
        <div className="flex-1 p-8 space-y-4 overflow-auto">
          {carrinho.map(c => (
            <div key={c.item.id} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              {c.item.foto_url && (
                <Image src={c.item.foto_url} alt={c.item.nome}
                  width={72} height={72}
                  className="w-18 h-18 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-lg">{c.item.nome}</p>
                <p className="text-teal-600 font-semibold">{formatarReal(c.item.preco * c.quantidade)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => remover(c.item.id)}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-200 hover:border-red-400 hover:text-red-500 transition-all">
                  {c.quantidade === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </button>
                <span className="w-8 text-center font-black text-xl">{c.quantidade}</span>
                <button onClick={() => adicionar(c.item)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: '#1A9B8A' }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-8 bg-white border-t border-slate-200 space-y-4">
          <div className="flex justify-between text-xl font-black text-slate-800">
            <span>Total</span>
            <span style={{ color: '#1A9B8A' }}>{formatarReal(totalCarrinho)}</span>
          </div>
          <button
            onClick={confirmarPedido}
            disabled={enviando}
            className="w-full py-5 rounded-2xl text-white font-black text-xl transition-all disabled:opacity-50"
            style={{ background: '#1A9B8A' }}
          >
            {enviando ? 'Enviando...' : 'Confirmar pedido →'}
          </button>
        </div>
      </div>
    )
  }

  // ── TELA CARDÁPIO ──
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0FAFA' }}>
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}>
        <div>
          <p className="text-teal-300 text-sm font-semibold uppercase tracking-widest">Menuê+</p>
          <h1 className="text-3xl font-black text-white">Faça seu pedido</h1>
        </div>
        {qtdCarrinho > 0 && (
          <button
            onClick={() => setTela('carrinho')}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-white bg-white/20 hover:bg-white/30 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{qtdCarrinho} {qtdCarrinho === 1 ? 'item' : 'itens'}</span>
            <span className="font-black">{formatarReal(totalCarrinho)}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Categorias */}
      <div className="flex gap-3 px-8 py-4 overflow-x-auto bg-white border-b border-slate-200 scrollbar-none">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`shrink-0 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              categoriaAtiva === cat
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={categoriaAtiva === cat ? { background: '#1A9B8A' } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Itens */}
      <div className="flex-1 p-8 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400 text-lg">Carregando cardápio...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {itensFiltrados.map(item => {
              const qtd = qtdItem(item.id)
              return (
                <div key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {item.foto_url ? (
                    <div className="relative h-44">
                      <Image src={item.foto_url} alt={item.nome}
                        fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-5xl"
                      style={{ background: '#F0FAFA' }}>🍽️</div>
                  )}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <p className="font-black text-slate-800 text-lg leading-tight">{item.nome}</p>
                    {item.descricao && (
                      <p className="text-slate-500 text-sm leading-snug line-clamp-2">{item.descricao}</p>
                    )}
                    {item.tempo_preparo_min && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>~{item.tempo_preparo_min}min</span>
                      </div>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="font-black text-xl" style={{ color: '#1A9B8A' }}>
                        {formatarReal(item.preco)}
                      </span>
                      {qtd === 0 ? (
                        <button
                          onClick={() => adicionar(item)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-sm transition-all"
                          style={{ background: '#1A9B8A' }}
                        >
                          <Plus className="w-4 h-4" /> Adicionar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => remover(item.id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-slate-200 hover:border-red-400 hover:text-red-500 transition-all">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-black text-lg">{qtd}</span>
                          <button onClick={() => adicionar(item)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
                            style={{ background: '#1A9B8A' }}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botão flutuante do carrinho (mobile) */}
      {qtdCarrinho > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-200 lg:hidden">
          <button
            onClick={() => setTela('carrinho')}
            className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-between px-6 transition-all"
            style={{ background: '#1A9B8A' }}
          >
            <span className="bg-white/20 rounded-xl px-3 py-1 text-sm">{qtdCarrinho}</span>
            <span>Ver pedido</span>
            <span>{formatarReal(totalCarrinho)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
