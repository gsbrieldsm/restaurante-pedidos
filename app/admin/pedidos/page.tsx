'use client'

import { useState, useEffect } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import type { Pedido, PedidoItem } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

type PedidoComItens = Pedido & { pedido_itens: PedidoItem[] }

const STATUS_COR: Record<string, string> = {
  aguardando: 'bg-slate-100 text-slate-600',
  em_preparo: 'bg-teal-100 text-teal-700',
  pronto:     'bg-green-100 text-green-700',
  entregue:   'bg-blue-100 text-blue-700',
  cancelado:  'bg-red-100 text-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  em_preparo: 'Em Preparo',
  pronto:     'Pronto',
  entregue:   'Entregue',
  cancelado:  'Cancelado',
}

const ESTACAO_EMOJI: Record<string, string> = {
  cozinha: '🍳', bar: '🍺', drinks: '🍹', chopeira: '🍻',
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoComItens[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  async function buscarPedidos() {
    const supabase = createClient()
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_itens(*)')
      .gte('criado_em', hoje.toISOString())
      .order('criado_em', { ascending: false })

    setPedidos((data as PedidoComItens[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    buscarPedidos()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, buscarPedidos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_itens' }, buscarPedidos)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    const matchBusca =
      !busca ||
      p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.mesa_numero.toString().includes(busca)
    const matchStatus = filtroStatus === 'todos' || p.status_geral === filtroStatus
    return matchBusca && matchStatus
  })

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pedidos do Dia</h1>
        <p className="text-slate-500 text-sm">{pedidos.length} pedidos hoje</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-48"
            placeholder="Mesa ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['todos', 'aguardando', 'em_preparo', 'pronto', 'entregue'].map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filtroStatus === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading && <p className="text-slate-400 text-center py-8">Carregando...</p>}
        {!loading && pedidosFiltrados.length === 0 && (
          <p className="text-slate-400 text-center py-8">Nenhum pedido encontrado.</p>
        )}
        {pedidosFiltrados.map((pedido) => {
          const aberto = expandidos.has(pedido.id)
          return (
            <Card key={pedido.id} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => toggleExpandido(pedido.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center font-bold text-orange-700">
                        {pedido.mesa_numero}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{pedido.cliente_nome}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {pedido.pedido_itens.length} {pedido.pedido_itens.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">
                        R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COR[pedido.status_geral]}`}>
                        {STATUS_LABEL[pedido.status_geral]}
                      </span>
                      {aberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </CardContent>
              </button>

              {aberto && (
                <div className="border-t bg-slate-50 p-4 space-y-2">
                  {pedido.pedido_itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{item.quantidade}×</span>
                        <span className="text-slate-700">{item.item_nome}</span>
                        <span className="text-xs">{ESTACAO_EMOJI[item.estacao]}</span>
                        {item.observacao && (
                          <span className="text-xs text-teal-700">({item.observacao})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {item.tempo_real_minutos && (
                          <span className="text-xs text-slate-400">
                            {item.tempo_real_minutos}min
                            {item.tempo_real_minutos > item.tempo_preparo_estimado && (
                              <span className="text-red-500 ml-1">+{item.tempo_real_minutos - item.tempo_preparo_estimado}min atraso</span>
                            )}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[item.status]}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
