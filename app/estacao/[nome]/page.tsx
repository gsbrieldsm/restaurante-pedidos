'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTenantIdClient } from '@/lib/tenant-client'
import { CardPedidoItem } from '@/components/estacao/CardPedidoItem'
import { Loader2, WifiOff, Volume2, VolumeX } from 'lucide-react'
import { criarBeep, desbloquearAudio } from '@/lib/audio'
import type { EstacaoTipo, ViewFilaEstacao } from '@/lib/supabase/types'

const ESTACAO_CONFIG: Record<EstacaoTipo, { label: string; emoji: string; cor: string }> = {
  cozinha:  { label: 'Cozinha',   emoji: '🍳', cor: 'bg-teal-600' },
  bar:      { label: 'Bar',       emoji: '🍺', cor: 'bg-teal-700'  },
  drinks:   { label: 'Drinks',    emoji: '🍹', cor: 'bg-purple-600' },
  chopeira: { label: 'Chopeira',  emoji: '🍻', cor: 'bg-yellow-600' },
}

export default function EstacaoPage() {
  const { nome } = useParams() as { nome: string }
  const estacao = nome as EstacaoTipo
  const config = ESTACAO_CONFIG[estacao]

  const [itens, setItens] = useState<ViewFilaEstacao[]>([])
  const [loading, setLoading] = useState(true)
  const [conectado, setConectado] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())
  const [somAtivo, setSomAtivo] = useState(false)
  const audioAlertaRef = useRef<HTMLAudioElement | null>(null)
  const inicializadoRef = useRef(false) // true após o primeiro fetch completar

  // Som de alerta — 2 bips (880 Hz → 1100 Hz)
  function tocarAlerta() {
    const a = audioAlertaRef.current
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
  }

  // Ativa o som dentro do gesto do usuário (obrigatório no Safari)
  async function ativarSom() {
    try {
      audioAlertaRef.current = criarBeep([880, 1100], 0.3, 120)

      // Desbloqueia silenciosamente (Safari exige play() dentro do gesto)
      await desbloquearAudio(audioAlertaRef.current)

      setSomAtivo(true)

      // Bip de confirmação audível
      criarBeep(660, 0.2).play().catch(() => {})
    } catch {}
  }

  // Título da aba do browser
  useEffect(() => {
    if (config) document.title = `${config.emoji} ${config.label} — Menuê+`
  }, [config])

  const buscarItens = useCallback(async () => {
    try {
      const resp = await fetch(`/api/estacao?estacao=${estacao}`)
      const data = await resp.json()
      setItens((prev) => {
        const novos = data.itens as ViewFilaEstacao[]
        // Tocar som se chegou novo item (após o primeiro fetch de inicialização)
        if (inicializadoRef.current && novos.length > prev.length) {
          tocarAlerta()
        }
        return novos
      })
      inicializadoRef.current = true
      setConectado(true)
      setUltimaAtualizacao(new Date())
    } catch {
      setConectado(false)
    } finally {
      setLoading(false)
    }
  }, [estacao])

  useEffect(() => {
    buscarItens()

    // Realtime via Supabase — filtra por tenant para não receber eventos de outros restaurantes
    const supabase  = createClient()
    const tenantId  = getTenantIdClient()
    const filtroItens  = tenantId ? { event: '*' as const, schema: 'public', table: 'pedido_itens',  filter: `tenant_id=eq.${tenantId}` } : { event: '*' as const, schema: 'public', table: 'pedido_itens'  }
    const filtroPedido = tenantId ? { event: '*' as const, schema: 'public', table: 'pedidos',       filter: `tenant_id=eq.${tenantId}` } : { event: '*' as const, schema: 'public', table: 'pedidos'       }

    const channel = supabase
      .channel(`estacao-${estacao}-${tenantId ?? 'anon'}`)
      .on('postgres_changes', filtroItens,  () => buscarItens())
      .on('postgres_changes', filtroPedido, () => buscarItens())
      .subscribe()

    // Polling de segurança: garante atualização mesmo se o realtime falhar
    const timer = setInterval(buscarItens, 5000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [estacao, buscarItens])

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Estação inválida: {nome}</p>
      </div>
    )
  }

  const aguardando = itens.filter((i) => i.status === 'aguardando')
  const emPreparo = itens.filter((i) => i.status === 'em_preparo')

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Banner de som — ativo: verde / inativo: âmbar pulsando */}
      <button
        onClick={somAtivo ? undefined : ativarSom}
        className={`w-full text-white text-sm font-bold py-2.5 px-4 flex items-center justify-center gap-2 transition-colors ${
          somAtivo
            ? 'bg-green-600 cursor-default'
            : 'bg-amber-500 hover:bg-amber-400 animate-pulse'
        }`}
      >
        {somAtivo ? (
          <><Volume2 className="w-4 h-4" /> Som de novos pedidos ativo</>
        ) : (
          <><VolumeX className="w-4 h-4" /> Toque aqui para ativar o som de novos pedidos</>
        )}
      </button>

      {/* Header */}
      <div className={`${config.cor} px-4 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{config.label}</h1>
              <p className="text-sm opacity-80">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'} na fila
              </p>
            </div>
          </div>
          <div className="text-right">
            {conectado ? (
              <div className="flex items-center gap-1.5 text-sm opacity-80">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                Ao vivo
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-red-200">
                <WifiOff className="w-4 h-4" />
                Desconectado
              </div>
            )}
            <p className="text-xs opacity-60 mt-0.5">
              {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <span className="text-5xl">✅</span>
          <p className="text-lg font-medium">Nenhum pedido pendente</p>
          <p className="text-sm">Aguardando novos pedidos...</p>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Em preparo — prioridade */}
          {emPreparo.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                Em Preparo ({emPreparo.length})
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {emPreparo.map((item) => (
                  <CardPedidoItem
                    key={item.id}
                    item={item}
                    onAtualizar={buscarItens}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Aguardando */}
          {aguardando.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full" />
                Aguardando ({aguardando.length})
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {aguardando.map((item) => (
                  <CardPedidoItem
                    key={item.id}
                    item={item}
                    onAtualizar={buscarItens}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
