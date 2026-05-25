'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTenantIdClient } from '@/lib/tenant-client'
import { criarBeep } from '@/lib/audio'

interface PedidoRetirada {
  id: string
  senha_balcao: number
  status_geral: string
  cliente_nome: string
  criado_em: string
}

export default function PainelRetiradaPage() {
  const [prontos, setProntos]       = useState<PedidoRetirada[]>([])
  const [emPreparo, setEmPreparo]   = useState<PedidoRetirada[]>([])
  const [novasSenhas, setNovasSenhas] = useState<number[]>([]) // senhas que acabaram de ficar prontas
  const prontosPrevRef = useRef<Set<string>>(new Set())
  const somAtivo = useRef(false)

  useEffect(() => {
    document.title = '📟 Painel de Retirada — Menuê+'
  }, [])

  const buscar = useCallback(async () => {
    const res  = await fetch('/api/totem/retirada')
    const data = await res.json()

    const novosProntos: PedidoRetirada[] = data.prontos ?? []
    const novosIds = new Set(novosProntos.map((p: PedidoRetirada) => p.id))

    // Detecta senhas que acabaram de ficar prontas
    const recemProntos = novosProntos.filter(p => !prontosPrevRef.current.has(p.id))
    if (recemProntos.length > 0) {
      setNovasSenhas(recemProntos.map(p => p.senha_balcao))
      // Bip de alerta
      if (somAtivo.current) {
        try { criarBeep([880, 1100, 880], 0.2, 80).play() } catch {}
      }
      // Remove destaque após 5s
      setTimeout(() => setNovasSenhas([]), 5000)
    }

    prontosPrevRef.current = novosIds
    setProntos(novosProntos)
    setEmPreparo(data.em_preparo ?? [])
  }, [])

  useEffect(() => {
    buscar()

    const supabase = createClient()
    const tenantId = getTenantIdClient()
    const filtro   = tenantId
      ? { event: '*' as const, schema: 'public', table: 'pedidos', filter: `tenant_id=eq.${tenantId}` }
      : { event: '*' as const, schema: 'public', table: 'pedidos' }

    const channel = supabase.channel('painel-retirada')
      .on('postgres_changes', filtro, () => buscar())
      .subscribe()

    const timer = setInterval(buscar, 5000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [buscar])

  function ativarSom() {
    somAtivo.current = true
    try { criarBeep(660, 0.15).play() } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: '#0b2a25' }}>

      {/* Header */}
      <div className="px-10 py-6 flex items-center justify-between border-b border-white/10">
        <div>
          <p className="text-teal-400 text-sm font-bold uppercase tracking-widest">Menuê+ Balcão</p>
          <h1 className="text-3xl font-black text-white">Painel de Retirada</h1>
        </div>
        <button
          onClick={ativarSom}
          className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
        >
          🔔 Ativar som
        </button>
      </div>

      <div className="flex flex-1 gap-0">
        {/* PRONTOS — coluna principal */}
        <div className="flex-1 p-8 border-r border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-green-400 font-black text-xl uppercase tracking-widest">
              Prontos para retirada
            </h2>
          </div>

          {prontos.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/20 text-2xl font-bold">Nenhuma senha pronta</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
              {prontos.map(p => {
                const isNova = novasSenhas.includes(p.senha_balcao)
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl flex flex-col items-center justify-center py-8 transition-all duration-500 ${
                      isNova
                        ? 'bg-green-400 scale-110 shadow-2xl shadow-green-400/50'
                        : 'bg-white/10'
                    }`}
                  >
                    <p className={`text-6xl font-black leading-none ${isNova ? 'text-white' : 'text-green-400'}`}>
                      {String(p.senha_balcao).padStart(3, '0')}
                    </p>
                    {isNova && (
                      <p className="text-white font-bold text-sm mt-2 animate-bounce">RETIRE!</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* EM PREPARO — coluna lateral */}
        <div className="w-64 xl:w-80 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <h2 className="text-yellow-400 font-bold text-sm uppercase tracking-widest">Em preparo</h2>
          </div>

          <div className="space-y-2">
            {emPreparo.slice(0, 12).map(p => (
              <div key={p.id}
                className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white/5">
                <span className="text-2xl font-black text-white/50">
                  {String(p.senha_balcao).padStart(3, '0')}
                </span>
              </div>
            ))}
            {emPreparo.length === 0 && (
              <p className="text-white/20 text-sm">Nenhum pedido</p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé com hora */}
      <div className="px-10 py-3 border-t border-white/10 flex justify-end">
        <Clock />
      </div>
    </div>
  )
}

function Clock() {
  const [hora, setHora] = useState('')
  useEffect(() => {
    const atualizar = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    atualizar()
    const t = setInterval(atualizar, 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="text-white/30 font-mono text-lg">{hora}</span>
}
