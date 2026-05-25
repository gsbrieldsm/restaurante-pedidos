'use client'

import { useEffect, useState } from 'react'
import { PlayCircle, BookOpen, ChevronRight, Loader2, Search } from 'lucide-react'
import Link from 'next/link'

interface Video {
  id:         string
  titulo:     string
  descricao:  string | null
  youtube_id: string
  categoria:  string
  ordem:      number
}

const COR = '#1A9B8A'

// Labels amigáveis para as categorias
const CATEGORIA_LABEL: Record<string, string> = {
  geral:         '📖 Geral',
  cardapio:      '🍽️ Cardápio',
  mesas:         '🪑 Mesas & QR Code',
  pedidos:       '📋 Pedidos',
  garcom:        '🛎️ Garçom',
  estacoes:      '🍳 Estações',
  financeiro:    '💰 Financeiro',
  equipe:        '👥 Equipe',
  configuracoes: '⚙️ Configurações',
}

function categLabel(cat: string) {
  return CATEGORIA_LABEL[cat] ?? `📌 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`
}

export default function SuportePage() {
  const [videos,    setVideos]    = useState<Video[]>([])
  const [loading,   setLoading]   = useState(true)
  const [busca,     setBusca]     = useState('')
  const [catAtiva,  setCatAtiva]  = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pub/suporte')
      .then(r => r.json())
      .then(d => setVideos(d.videos ?? []))
      .finally(() => setLoading(false))
  }, [])

  // Agrupa por categoria
  const categorias = [...new Set(videos.map(v => v.categoria))]

  const videosFiltrados = videos.filter(v => {
    const buscaOk = !busca || v.titulo.toLowerCase().includes(busca.toLowerCase()) || (v.descricao ?? '').toLowerCase().includes(busca.toLowerCase())
    const catOk   = !catAtiva || v.categoria === catAtiva
    return buscaOk && catOk
  })

  const grupos = categorias
    .filter(cat => !catAtiva || cat === catAtiva)
    .map(cat => ({
      cat,
      itens: videosFiltrados.filter(v => v.categoria === cat),
    }))
    .filter(g => g.itens.length > 0)

  return (
    <div className="min-h-screen" style={{ background: '#F0FAFA' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-base font-black text-white">M+</span>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-teal-300">Menuê+</p>
              <p className="text-white font-bold text-sm leading-tight">Central de Suporte</p>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            Como usar o Menuê+
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xl">
            Vídeos explicativos sobre cada funcionalidade do sistema. Aprenda no seu ritmo.
          </p>

          {/* Busca */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setCatAtiva(null) }}
              placeholder="Buscar vídeo..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Filtro por categoria ── */}
        {!busca && categorias.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setCatAtiva(null)}
              className="px-4 py-2 rounded-full text-xs font-bold transition-all"
              style={{
                background: !catAtiva ? COR : '#fff',
                color:      !catAtiva ? '#fff' : '#64748b',
                border:     `1px solid ${!catAtiva ? COR : '#e2e8f0'}`,
              }}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCatAtiva(catAtiva === cat ? null : cat)}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                style={{
                  background: catAtiva === cat ? COR : '#fff',
                  color:      catAtiva === cat ? '#fff' : '#64748b',
                  border:     `1px solid ${catAtiva === cat ? COR : '#e2e8f0'}`,
                }}
              >
                {categLabel(cat)}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: COR }} />
          </div>
        )}

        {/* ── Sem vídeos ── */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">Nenhum vídeo disponível ainda.</p>
            <p className="text-slate-400 text-sm mt-1">Em breve adicionaremos tutoriais aqui.</p>
          </div>
        )}

        {/* ── Sem resultados na busca ── */}
        {!loading && videos.length > 0 && videosFiltrados.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">Nenhum vídeo encontrado para "{busca}"</p>
            <button onClick={() => setBusca('')} className="mt-3 text-sm font-semibold" style={{ color: COR }}>
              Limpar busca
            </button>
          </div>
        )}

        {/* ── Grupos por categoria ── */}
        {!loading && grupos.map(({ cat, itens }) => (
          <div key={cat} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{categLabel(cat)}</h2>
              <span className="text-xs text-slate-400 font-medium">{itens.length} vídeo{itens.length > 1 ? 's' : ''}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {itens.map(v => (
                <div key={v.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">

                  {/* Thumbnail clicável */}
                  {expandido === v.id ? (
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${v.youtube_id}?autoplay=1&rel=0`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandido(v.id)}
                      className="relative w-full group"
                      style={{ paddingTop: '56.25%' }}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                        alt={v.titulo}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{ background: COR }}>
                          <PlayCircle className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Info */}
                  <div className="px-5 py-4">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{v.titulo}</p>
                    {v.descricao && (
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">{v.descricao}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── Rodapé ── */}
        <div className="mt-8 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-400">
            Ainda tem dúvidas?{' '}
            <a
              href="https://wa.me/5547988194822"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: COR }}
            >
              Fale com a gente no WhatsApp
            </a>
          </p>
          <Link href="/login" className="inline-block mt-3 text-xs text-slate-300 hover:text-slate-500 transition-colors">
            Acessar painel →
          </Link>
        </div>

      </div>
    </div>
  )
}
