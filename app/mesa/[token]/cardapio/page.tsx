'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight,
  Clock, Loader2, Search, Receipt, ConciergeBell, CheckCircle2, X,
  PartyPopper, RotateCcw, MessageCircle, RefreshCw
} from 'lucide-react'
import type { CardapioItem, GrupoOpcao, OpcaoSelecionada, ItemCarrinho } from '@/lib/supabase/types'
import { darkenHex, hexToRgbParts } from '@/lib/cor'

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

  const [isDelivery, setIsDelivery] = useState(false)

  const [chamandoGarcom, setChamandoGarcom] = useState(false)
  const [garcomChamado, setGarcomChamado] = useState(false)
  const [contaFechada, setContaFechada] = useState(false)
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
    saldo_habilitado:     boolean
  }>({ restaurante_nome: '', restaurante_logo_url: null, cor_primaria: '#1A9B8A', saldo_habilitado: false })

  // ── Saldo pré-pago ───────────────────────────────────────────────────────
  const [saldoCliente, setSaldoCliente] = useState<{
    id: string; nome: string | null; telefone: string; saldo_disponivel: number
  } | null>(null)
  const [modalSaldo, setModalSaldo]           = useState(false)
  const [saldoTelefone, setSaldoTelefone]     = useState('')
  const [saldoNome, setSaldoNome]             = useState('')
  const [saldoIdentificando, setSaldoIdentificando] = useState(false)
  const [saldoErro, setSaldoErro]             = useState('')
  // OTP
  const [saldoEtapa, setSaldoEtapa]           = useState<'telefone' | 'otp'>('telefone')
  const [saldoOtp, setSaldoOtp]               = useState('')
  const [saldoClienteId, setSaldoClienteId]   = useState<string | null>(null)
  const [saldoReenviando, setSaldoReenviando] = useState(false)

  useEffect(() => {
    // Se veio via garçom com ?sessao=, salva no sessionStorage
    const sessaoParam = searchParams.get('sessao')
    if (sessaoParam) {
      sessionStorage.setItem('sessao_id', sessaoParam)
    }

    // Detecta se é sessão de delivery
    if (sessionStorage.getItem('is_delivery') === '1') {
      setIsDelivery(true)
    }

    // Recupera sessão — sessionStorage primeiro; fallback para localStorage (sobrevive ao fechar/reabrir link QR)
    const sessaoId = sessionStorage.getItem('sessao_id') || localStorage.getItem(`menue_sess_${token}`)
    if (!sessaoId) {
      router.push(`/mesa/${token}`)
      return
    }
    // Sincroniza para sessionStorage caso veio do localStorage
    if (!sessionStorage.getItem('sessao_id')) {
      sessionStorage.setItem('sessao_id', sessaoId)
    }

    Promise.all([
      fetch(`/api/cardapio?token=${token}`).then((r) => r.json()),
      fetch(`/api/configuracoes/banner?mesa_token=${token}`).then((r) => r.json()),
    ]).then(([cardapioData, bannerData]) => {
      const lista = cardapioData.itens ?? []
      setItens(lista)
      if (lista.length > 0) setCategoriaAtiva(lista[0].categoria)
      if (bannerData.banner) setBanner(bannerData.banner)
      if (bannerData.branding) {
        setBranding(bannerData.branding)

        // Saldo pré-pago: verifica se o tenant tem a feature ativa
        if (bannerData.branding.saldo_habilitado) {
          const salvo = localStorage.getItem(`menue_saldo_${token}`)
          if (salvo) {
            try {
              const parsed = JSON.parse(salvo)
              // Revalida o saldo atual no servidor
              fetch(`/api/pub/saldo?cliente_id=${parsed.id}`)
                .then(r => r.json())
                .then(d => {
                  if (d.cliente) setSaldoCliente(d.cliente)
                  else {
                    localStorage.removeItem(`menue_saldo_${token}`)
                    setModalSaldo(true)
                  }
                })
                .catch(() => setSaldoCliente(parsed))
            } catch {
              setModalSaldo(true)
            }
          } else {
            setModalSaldo(true)
          }
        }
      }
    }).finally(() => setLoading(false))

    // Polling: verifica a cada 10s se a sessão ainda está ativa
    // Quando o garçom fecha a comanda, exibe a tela de "conta fechada"
    const verificarSessao = async () => {
      try {
        const res  = await fetch(`/api/sessao?id=${sessaoId}`)
        const data = await res.json()
        if (data.ativa === false) {
          setContaFechada(true)
          clearInterval(pollTimer)
          // Limpa sessão persistida — comanda encerrada
          localStorage.removeItem(`menue_sess_${token}`)
          localStorage.removeItem(`menue_sess_nome_${token}`)
        }
      } catch { /* ignora erros de rede */ }
    }

    const pollTimer = setInterval(verificarSessao, 10_000)
    return () => clearInterval(pollTimer)
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

  // ── Identificação via saldo pré-pago ──────────────────────────────────────
  async function identificarSaldo() {
    const tel = saldoTelefone.replace(/\D/g, '')
    if (tel.length < 10) { setSaldoErro('Informe um telefone com DDD válido.'); return }

    setSaldoIdentificando(true)
    setSaldoErro('')

    const resp = await fetch('/api/pub/saldo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mesa_token: token, telefone: tel, nome: saldoNome }),
    })
    const data = await resp.json()
    setSaldoIdentificando(false)

    if (!resp.ok) { setSaldoErro(data.error ?? 'Erro ao identificar.'); return }

    // Celular já verificado anteriormente → entra direto
    if (data.cliente) {
      setSaldoCliente(data.cliente)
      localStorage.setItem(`menue_saldo_${token}`, JSON.stringify(data.cliente))
      setModalSaldo(false)
      setSaldoTelefone('')
      setSaldoNome('')
      return
    }

    // Primeiro acesso → precisa verificar via WhatsApp OTP
    if (data.precisa_verificar) {
      setSaldoClienteId(data.cliente_id)
      setSaldoEtapa('otp')
      setSaldoOtp('')
    }
  }

  async function verificarOTP() {
    if (!saldoClienteId || saldoOtp.replace(/\D/g, '').length < 6) return

    setSaldoIdentificando(true)
    setSaldoErro('')

    const resp = await fetch('/api/pub/saldo/verificar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cliente_id: saldoClienteId, codigo: saldoOtp.trim() }),
    })
    const data = await resp.json()
    setSaldoIdentificando(false)

    if (!resp.ok) {
      if (data.code === 'otp_expirado') {
        setSaldoErro('Código expirado. Clique em "Reenviar código" para receber um novo.')
      } else {
        setSaldoErro(data.error ?? 'Código inválido.')
      }
      return
    }

    setSaldoCliente(data.cliente)
    localStorage.setItem(`menue_saldo_${token}`, JSON.stringify(data.cliente))
    setModalSaldo(false)
    setSaldoTelefone('')
    setSaldoNome('')
    setSaldoEtapa('telefone')
    setSaldoOtp('')
    setSaldoClienteId(null)
  }

  async function reenviarOTP() {
    const tel = saldoTelefone.replace(/\D/g, '')
    if (tel.length < 10) return

    setSaldoReenviando(true)
    setSaldoErro('')

    const resp = await fetch('/api/pub/saldo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mesa_token: token, telefone: tel, nome: saldoNome }),
    })
    const data = await resp.json()
    setSaldoReenviando(false)

    if (!resp.ok) { setSaldoErro(data.error ?? 'Erro ao reenviar.'); return }
    if (data.precisa_verificar) {
      setSaldoClienteId(data.cliente_id)
      setSaldoOtp('')
    }
  }

  async function finalizarPedido() {
    const sessaoId = sessionStorage.getItem('sessao_id')
    if (!sessaoId || !carrinho.length) return

    // Verifica saldo antes de abrir o spinner (UX mais rápida)
    if (branding.saldo_habilitado && saldoCliente) {
      if (totalCarrinho > saldoCliente.saldo_disponivel) {
        alert(
          `Saldo insuficiente!\n\nSeu saldo: R$ ${saldoCliente.saldo_disponivel.toFixed(2)}\nTotal do pedido: R$ ${totalCarrinho.toFixed(2)}\n\nRecarregue seu saldo no caixa para continuar.`
        )
        return
      }
    }

    setEnviando(true)

    const itensComObs = carrinho.map((c) => ({
      ...c,
      observacao: c.opcoes_selecionadas.length > 0 ? c.observacao : (observacoes[c.item.id] || ''),
    }))

    const resp = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessao_id:        sessaoId,
        itens:            itensComObs,
        ...(branding.saldo_habilitado && saldoCliente
          ? { cliente_saldo_id: saldoCliente.id }
          : {}),
      }),
    })

    const data = await resp.json()
    setEnviando(false)

    if (resp.ok) {
      // Atualiza saldo local após pedido confirmado
      if (branding.saldo_habilitado && saldoCliente) {
        const novoSaldo = {
          ...saldoCliente,
          saldo_disponivel: saldoCliente.saldo_disponivel - totalCarrinho,
        }
        setSaldoCliente(novoSaldo)
        localStorage.setItem(`menue_saldo_${token}`, JSON.stringify(novoSaldo))
      }
      sessionStorage.setItem('ultimo_pedido_id', data.pedido.id)
      router.push(`/mesa/${token}/confirmacao`)
    } else if (data.code === 'saldo_insuficiente') {
      alert('Saldo insuficiente. Recarregue no caixa antes de pedir.')
    }
  }

  // Gera gradiente do header a partir da cor primária do restaurante
  const cor = branding.cor_primaria ?? '#1A9B8A'
  const headerGradient = `linear-gradient(135deg, ${darkenHex(cor, 0.10)} 0%, ${darkenHex(cor, 0.28)} 50%, ${cor} 100%)`

  const BANNER_ESTILOS: Record<string, { gradient: string; subColor: string }> = {
    teal:   { gradient: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)', subColor: '#5eead4' },
    ocean:  { gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2d5e 50%, #1a6eb5 100%)', subColor: '#93c5fd' },
    sunset: { gradient: 'linear-gradient(135deg, #1a0808 0%, #5e1a0d 50%, #e0533a 100%)', subColor: '#fca5a5' },
    gold:   { gradient: 'linear-gradient(135deg, #1a1205 0%, #5e3e0d 50%, #d4a017 100%)', subColor: '#fde68a' },
    roxo:   { gradient: 'linear-gradient(135deg, #12091a 0%, #3d1a5e 50%, #8b5cf6 100%)', subColor: '#c4b5fd' },
  }

  function abrirNovaComanda() {
    sessionStorage.removeItem('sessao_id')
    sessionStorage.removeItem('ultimo_pedido_id')
    sessionStorage.removeItem('cliente_nome')
    localStorage.removeItem(`menue_sess_${token}`)
    localStorage.removeItem(`menue_sess_nome_${token}`)
    router.push(`/mesa/${token}`)
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cor }} />
      </div>
    )
  }

  if (contaFechada) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: headerGradient }}
      >
        {/* Logo do restaurante */}
        {branding.restaurante_logo_url && (
          <img
            src={branding.restaurante_logo_url}
            alt="Logo"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl mb-6"
          />
        )}

        {/* Ícone festivo */}
        <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center mb-6 shadow-inner">
          <PartyPopper className="w-12 h-12 text-white" />
        </div>

        {/* Texto principal */}
        <h1 className="text-3xl font-black text-white leading-tight mb-3">
          Conta fechada!
        </h1>
        <p className="text-white/80 text-lg mb-2">
          Seu pagamento foi confirmado.
        </p>
        <p className="text-white/60 text-sm mb-10">
          Obrigado pela visita
          {branding.restaurante_nome ? ` ao ${branding.restaurante_nome}` : ''}! 🙏
        </p>

        {/* Divider */}
        <div className="w-16 h-px bg-white/20 mb-8" />

        {/* CTA: nova comanda */}
        <p className="text-white/60 text-sm mb-4">Vai pedir mais alguma coisa?</p>
        <button
          onClick={abrirNovaComanda}
          className="flex items-center gap-2.5 bg-white font-black text-base px-8 py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all"
          style={{ color: cor }}
        >
          <RotateCcw className="w-5 h-5" />
          Abrir nova comanda
        </button>
        <p className="text-white/40 text-xs mt-4">
          Você informará seu nome e poderá pedir normalmente
        </p>
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
            {/* Chamar garçom — oculto em sessões de delivery */}
            {!isDelivery && (
              <button
                onClick={chamarGarcom}
                disabled={chamandoGarcom}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium transition-all ${
                  garcomChamado
                    ? 'bg-green-500/20 text-green-300'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
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
            )}

            {/* Minha conta */}
            <button
              onClick={() => router.push(`/mesa/${token}/conta`)}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors font-medium"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              className="w-full bg-white/10 placeholder-white/40 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:bg-white/20 transition-colors"
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

      {/* ── Banner de saldo pré-pago ─────────────────────────────────────────── */}
      {branding.saldo_habilitado && saldoCliente && (
        <div
          className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${darkenHex(cor, 0.25)}, ${cor})` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-lg">
              💳
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-semibold leading-none mb-0.5">
                {saldoCliente.nome ? `Olá, ${saldoCliente.nome.split(' ')[0]}!` : 'Seu saldo'}
              </p>
              <p className="text-white font-black text-lg leading-none">
                R$ {saldoCliente.saldo_disponivel.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/60 text-[10px] leading-tight">disponível para gastar</p>
            <button
              onClick={() => { setSaldoEtapa('telefone'); setSaldoOtp(''); setSaldoErro(''); setModalSaldo(true) }}
              className="text-white/70 text-xs underline underline-offset-2 mt-0.5"
            >
              trocar conta
            </button>
          </div>
        </div>
      )}

      {/* Banner: saldo habilitado mas cliente não identificado */}
      {branding.saldo_habilitado && !saldoCliente && !modalSaldo && (
        <div
          className="mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm border-2 border-dashed"
          style={{ borderColor: cor, background: `${cor}10` }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: cor }}>💳 Tem saldo pré-pago?</p>
            <p className="text-xs text-slate-500 mt-0.5">Identifique-se para usar seu saldo</p>
          </div>
          <button
            onClick={() => { setSaldoEtapa('telefone'); setSaldoOtp(''); setSaldoErro(''); setModalSaldo(true) }}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: cor }}
          >
            Entrar
          </button>
        </div>
      )}

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
                <div className="w-36 h-36 flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, #f8fafc, rgba(${hexToRgbParts(cor)}, 0.08))` }}>
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
                    <span className="font-black text-base" style={{ color: cor }}>
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
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: `${cor}22`, color: cor }}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-lg w-5 text-center text-slate-800">{qtd}</span>
                      <button
                        onClick={() => adicionarItem(item)}
                        className="w-9 h-9 rounded-full text-white flex items-center justify-center"
                        style={{ background: cor }}
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

      {/* Rodapé Menuê+ */}
      <div className="flex items-center justify-center gap-1.5 py-6 pb-8">
        <span className="text-xs text-slate-300 font-medium">Powered by</span>
        <span
          className="text-xs font-black tracking-tight"
          style={{ color: cor, opacity: 0.7 }}
        >
          Menuê+
        </span>
        <span className="text-xs text-slate-300">•</span>
        <span className="text-xs text-slate-300 font-medium">Sistema de Gestão</span>
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
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all border-slate-200 bg-white hover:border-slate-300"
                          style={selecionado ? { borderColor: cor, background: `${cor}12` } : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`shrink-0 flex items-center justify-center transition-colors border-2 ${
                                grupo.multiplo ? 'w-5 h-5 rounded' : 'w-5 h-5 rounded-full'
                              }`}
                              style={selecionado
                                ? { borderColor: cor, background: grupo.multiplo ? cor : 'transparent' }
                                : { borderColor: '#cbd5e1' }}
                            >
                              {selecionado && (
                                grupo.multiplo
                                  ? <span className="text-white text-xs font-black">✓</span>
                                  : <div className="w-2.5 h-2.5 rounded-full" style={{ background: cor }} />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {opcao.nome}
                            </span>
                          </div>
                          {opcao.preco_adicional > 0 && (
                            <span className="text-sm font-bold shrink-0 text-slate-500">
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
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 placeholder-slate-400 outline-none"
                  style={{ '--tw-ring-color': cor } as React.CSSProperties}
                  onFocus={(e) => (e.currentTarget.style.borderColor = cor)}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = '')}
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
                <ShoppingCart className="w-5 h-5" style={{ color: cor }} />
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
                        className="w-9 h-9 rounded-full text-white flex items-center justify-center"
                        style={{ background: cor }}
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
                      <p className="text-sm font-medium mt-0.5" style={{ color: cor }}>
                        R$ {(c.preco_unitario * c.quantidade).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  {c.opcoes_selecionadas.length === 0 && (
                    <input
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 placeholder-slate-400 outline-none transition-colors"
                      style={{ '--tw-ring-color': cor } as React.CSSProperties}
                      onFocus={(e) => (e.target.style.borderColor = cor)}
                      onBlur={(e) => (e.target.style.borderColor = '')}
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

                {/* Alerta de saldo insuficiente */}
                {branding.saldo_habilitado && saldoCliente && totalCarrinho > saldoCliente.saldo_disponivel && (
                  <div className="rounded-xl px-3 py-2.5 bg-red-50 border border-red-100 flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs font-bold text-red-700">Saldo insuficiente</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Seu saldo é R$ {saldoCliente.saldo_disponivel.toFixed(2).replace('.', ',')} —
                        faltam R$ {(totalCarrinho - saldoCliente.saldo_disponivel).toFixed(2).replace('.', ',')} para este pedido.
                        Recarregue no caixa!
                      </p>
                    </div>
                  </div>
                )}

                {/* Saldo disponível após pedido */}
                {branding.saldo_habilitado && saldoCliente && totalCarrinho <= saldoCliente.saldo_disponivel && (
                  <div className="rounded-xl px-3 py-2 flex items-center justify-between"
                    style={{ background: `${cor}12` }}>
                    <span className="text-xs font-semibold text-slate-600">Saldo após pedido</span>
                    <span className="text-sm font-black" style={{ color: cor }}>
                      R$ {(saldoCliente.saldo_disponivel - totalCarrinho).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-slate-800">Total</span>
                  <span className="font-black text-2xl" style={{ color: cor }}>
                    R$ {totalCarrinho.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <button
                  onClick={finalizarPedido}
                  disabled={
                    enviando ||
                    (branding.saldo_habilitado && !!saldoCliente && totalCarrinho > saldoCliente.saldo_disponivel) ||
                    (branding.saldo_habilitado && !saldoCliente)
                  }
                  className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: branding.cor_primaria, height: '52px' }}
                >
                  {enviando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : branding.saldo_habilitado && !saldoCliente ? (
                    <>Identifique-se para pedir</>
                  ) : (
                    <>Confirmar Pedido <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de identificação por saldo ──────────────────────────────────── */}
      {modalSaldo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => saldoCliente && setModalSaldo(false)} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

            {/* Alça mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-5 text-center"
              style={{ background: `linear-gradient(135deg, ${darkenHex(cor, 0.25)}, ${cor})` }}>
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3 text-2xl">
                {saldoEtapa === 'otp' ? <MessageCircle className="w-7 h-7 text-white" /> : '💳'}
              </div>
              {saldoEtapa === 'telefone' ? (
                <>
                  <h2 className="text-lg font-black text-white">Identificação de saldo</h2>
                  <p className="text-white/70 text-sm mt-1">
                    Informe seu celular para acessar seu saldo pré-pago
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-black text-white">Verificar WhatsApp</h2>
                  <p className="text-white/70 text-sm mt-1">
                    Enviamos um código de 6 dígitos para
                  </p>
                  <p className="text-white font-bold text-sm mt-0.5">
                    {saldoTelefone || 'seu WhatsApp'}
                  </p>
                </>
              )}
            </div>

            {/* Etapa 1: telefone */}
            {saldoEtapa === 'telefone' && (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Celular com DDD *
                  </label>
                  <input
                    type="tel"
                    value={saldoTelefone}
                    onChange={(e) => setSaldoTelefone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && identificarSaldo()}
                    placeholder="(47) 99999-0000"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 outline-none focus:border-teal-400 transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Seu nome (opcional)
                  </label>
                  <input
                    type="text"
                    value={saldoNome}
                    onChange={(e) => setSaldoNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && identificarSaldo()}
                    placeholder="Como quer ser chamado?"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 outline-none focus:border-teal-400 transition-colors"
                  />
                </div>

                {saldoErro && (
                  <p className="text-sm text-red-600 font-medium bg-red-50 rounded-xl px-3 py-2">
                    {saldoErro}
                  </p>
                )}

                <button
                  onClick={identificarSaldo}
                  disabled={saldoIdentificando || saldoTelefone.replace(/\D/g, '').length < 10}
                  className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-2xl disabled:opacity-40 transition-opacity"
                  style={{ background: cor, height: '52px' }}
                >
                  {saldoIdentificando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                  ) : (
                    <>Continuar <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>

                {saldoCliente && (
                  <button
                    onClick={() => setModalSaldo(false)}
                    className="w-full text-center text-sm text-slate-400 py-1"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}

            {/* Etapa 2: OTP */}
            {saldoEtapa === 'otp' && (
              <div className="px-6 py-5 space-y-4">
                {/* Instruções */}
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-xl mt-0.5">📱</span>
                  <p className="text-sm text-green-800 leading-relaxed">
                    Abra o <strong>WhatsApp</strong> e use o código de 6 dígitos que acabamos de enviar.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Código de verificação *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={saldoOtp}
                    onChange={(e) => setSaldoOtp(e.target.value.slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && verificarOTP()}
                    placeholder="000000"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-2xl font-black text-center text-slate-800 outline-none focus:border-teal-400 transition-colors tracking-[0.4em]"
                    autoFocus
                  />
                </div>

                {saldoErro && (
                  <p className="text-sm text-red-600 font-medium bg-red-50 rounded-xl px-3 py-2">
                    {saldoErro}
                  </p>
                )}

                <button
                  onClick={verificarOTP}
                  disabled={saldoIdentificando || saldoOtp.replace(/\D/g, '').length < 6}
                  className="w-full flex items-center justify-center gap-2 font-bold text-base text-white rounded-2xl disabled:opacity-40 transition-opacity"
                  style={{ background: cor, height: '52px' }}
                >
                  {saldoIdentificando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Verificar código</>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setSaldoEtapa('telefone')
                      setSaldoOtp('')
                      setSaldoErro('')
                    }}
                    className="text-sm text-slate-400 underline underline-offset-2"
                  >
                    ← Trocar número
                  </button>
                  <button
                    onClick={reenviarOTP}
                    disabled={saldoReenviando}
                    className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ color: cor }}
                  >
                    {saldoReenviando
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reenviando...</>
                      : <><RefreshCw className="w-3.5 h-3.5" /> Reenviar código</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
