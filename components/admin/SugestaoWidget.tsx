'use client'

import { useState } from 'react'
import { MessageSquarePlus, X, Send, Lightbulb, Bug, HelpCircle, MessageCircle, CheckCircle2, CircleDashed, ChevronDown } from 'lucide-react'

const TIPOS = [
  { value: 'sugestao', label: 'Sugestão',  icon: Lightbulb,     cor: 'text-amber-500'  },
  { value: 'bug',      label: 'Bug',        icon: Bug,           cor: 'text-red-500'    },
  { value: 'duvida',   label: 'Dúvida',     icon: HelpCircle,    cor: 'text-blue-500'   },
  { value: 'outro',    label: 'Outro',      icon: MessageCircle, cor: 'text-slate-500'  },
]

export function SugestaoWidget() {
  const [aberto,     setAberto]     = useState(false)
  const [tipo,       setTipo]       = useState('sugestao')
  const [mensagem,   setMensagem]   = useState('')
  const [anonimo,    setAnonimo]    = useState(false)
  const [nomeAutor,  setNomeAutor]  = useState('')
  const [enviando,   setEnviando]   = useState(false)
  const [enviado,    setEnviado]    = useState(false)

  async function enviar() {
    if (!mensagem.trim()) return
    setEnviando(true)

    const res = await fetch('/api/admin/chamados', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        tipo,
        mensagem,
        anonimo,
        nome_autor: anonimo ? null : nomeAutor,
      }),
    })

    setEnviando(false)
    if (res.ok) {
      setEnviado(true)
      setTimeout(() => {
        setAberto(false)
        setEnviado(false)
        setMensagem('')
        setNomeAutor('')
        setAnonimo(false)
        setTipo('sugestao')
      }, 2500)
    }
  }

  const tipoAtual = TIPOS.find(t => t.value === tipo) ?? TIPOS[0]
  const IconeTipo = tipoAtual.icon

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-lg shadow-teal-900/20 transition-all hover:scale-105 active:scale-95"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Sugestão</span>
      </button>

      {/* Overlay + modal */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <MessageSquarePlus className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-black text-slate-800">Sugestões & Melhorias</p>
                  <p className="text-xs text-slate-400 mt-0.5">Sua opinião chega direto pra gente</p>
                </div>
              </div>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {enviado ? (
              /* Tela de sucesso */
              <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-teal-600" />
                </div>
                <p className="font-black text-slate-800 text-lg">Obrigado!</p>
                <p className="text-sm text-slate-500 max-w-xs">Sua mensagem foi enviada. Vamos analisar e dar um retorno em breve.</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">

                {/* Tipo */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Tipo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIPOS.map((t) => {
                      const Icone = t.icon
                      return (
                        <button
                          key={t.value}
                          onClick={() => setTipo(t.value)}
                          className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            tipo === t.value
                              ? 'border-teal-300 bg-teal-50 text-teal-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icone className={`w-4 h-4 ${tipo === t.value ? 'text-teal-600' : t.cor}`} />
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Mensagem */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Mensagem</label>
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Descreva sua sugestão, problema ou dúvida..."
                    rows={4}
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none placeholder:text-slate-300 text-slate-700"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{mensagem.length}/500</p>
                </div>

                {/* Identificação */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setAnonimo(!anonimo)}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${anonimo ? 'bg-slate-400' : 'bg-teal-500'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${anonimo ? 'translate-x-0' : 'translate-x-4'}`} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {anonimo ? 'Envio anônimo' : 'Me identificar'}
                    </span>
                  </label>

                  {!anonimo && (
                    <input
                      type="text"
                      value={nomeAutor}
                      onChange={(e) => setNomeAutor(e.target.value)}
                      placeholder="Seu nome (opcional)"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-400 bg-white placeholder:text-slate-300 text-slate-700"
                    />
                  )}
                </div>

                {/* Botão enviar */}
                <button
                  onClick={enviar}
                  disabled={!mensagem.trim() || enviando}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enviando
                    ? <><CircleDashed className="w-4 h-4 animate-spin" /> Enviando...</>
                    : <><Send className="w-4 h-4" /> Enviar mensagem</>
                  }
                </button>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
