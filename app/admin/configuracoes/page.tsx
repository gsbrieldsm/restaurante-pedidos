'use client'

import { useState, useEffect, useRef } from 'react'
import { getPlanoConfig } from '@/lib/planos'
import {
  Trash2, RefreshCw, Users, ClipboardList,
  DollarSign, Bell, TableProperties, AlertTriangle, CheckCircle2, Loader2, ShieldAlert,
  Megaphone, Save, ImagePlus, X, Upload, Monitor, Smartphone,
  ChevronRight, UserCog, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ImageCropper from '@/components/admin/ImageCropper'
import Link from 'next/link'

interface BannerConfig {
  banner_ativo:             boolean
  banner_titulo:            string
  banner_subtitulo:         string
  banner_emoji:             string
  banner_estilo:            string
  banner_imagem_url:        string | null
  banner_imagem_url_mobile: string | null
}

const BANNER_ESTILOS: Record<string, { label: string; gradient: string; subColor: string }> = {
  teal:   { label: 'Teal',    gradient: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 50%, #1A9B8A 100%)', subColor: '#5eead4' },
  ocean:  { label: 'Oceano',  gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2d5e 50%, #1a6eb5 100%)', subColor: '#93c5fd' },
  sunset: { label: 'Sunset',  gradient: 'linear-gradient(135deg, #1a0808 0%, #5e1a0d 50%, #e0533a 100%)', subColor: '#fca5a5' },
  gold:   { label: 'Dourado', gradient: 'linear-gradient(135deg, #1a1205 0%, #5e3e0d 50%, #d4a017 100%)', subColor: '#fde68a' },
  roxo:   { label: 'Roxo',    gradient: 'linear-gradient(135deg, #12091a 0%, #3d1a5e 50%, #8b5cf6 100%)', subColor: '#c4b5fd' },
}

interface Acao {
  escopo: string
  titulo: string
  descricao: string
  detalhe: string
  icon: React.ElementType
  nivel: 'medio' | 'alto' | 'critico'
}

const ACOES: Acao[] = [
  {
    escopo: 'chamadas',
    titulo: 'Limpar chamadas do garçom',
    descricao: 'Remove todos os registros de chamadas de clientes.',
    detalhe: 'Apaga a tabela chamadas_garcom inteira. Não afeta pedidos, mesas ou pagamentos.',
    icon: Bell,
    nivel: 'medio',
  },
  {
    escopo: 'pagamentos',
    titulo: 'Limpar histórico de pagamentos',
    descricao: 'Remove todos os registros de pagamentos do Financeiro.',
    detalhe: 'Apaga a tabela pagamentos. Não afeta pedidos nem mesas.',
    icon: DollarSign,
    nivel: 'alto',
  },
  {
    escopo: 'pedidos',
    titulo: 'Limpar todos os pedidos',
    descricao: 'Remove todos os pedidos e itens de pedido do sistema.',
    detalhe: 'Apaga pedidos e pedido_itens. Mesas e sessões permanecem abertas.',
    icon: ClipboardList,
    nivel: 'alto',
  },
  {
    escopo: 'mesas',
    titulo: 'Fechar todas as mesas',
    descricao: 'Encerra todas as sessões abertas e libera todas as mesas.',
    detalhe: 'Fecha sessões ativas e muda status de todas as mesas para "livre". Não apaga pedidos.',
    icon: TableProperties,
    nivel: 'alto',
  },
  {
    escopo: 'clientes_historico',
    titulo: 'Apagar histórico de clientes',
    descricao: 'Remove sessões encerradas (clientes que já saíram).',
    detalhe: 'Apaga sessoes_mesa onde ativa = false. Não afeta mesas abertas no momento.',
    icon: Users,
    nivel: 'alto',
  },
  {
    escopo: 'reset_dia',
    titulo: 'Reset do dia de hoje',
    descricao: 'Apaga pedidos, pagamentos e chamadas criados hoje.',
    detalhe: 'Filtra por data de hoje. Dados de outros dias são mantidos. Útil para limpar testes do dia.',
    icon: RefreshCw,
    nivel: 'critico',
  },
  {
    escopo: 'reset_total',
    titulo: 'Reset total do sistema',
    descricao: 'Apaga TUDO: pedidos, pagamentos, sessões, chamadas e libera mesas.',
    detalhe: 'Mantém apenas o cardápio e a estrutura de mesas. Use apenas para reiniciar do zero.',
    icon: ShieldAlert,
    nivel: 'critico',
  },
]

const NIVEL_CONFIG = {
  medio: {
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    badgeLabel: 'Moderado',
    btn: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    icon: 'text-yellow-500',
  },
  alto: {
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    badgeLabel: 'Alto',
    btn: 'bg-orange-500 hover:bg-orange-600 text-white',
    icon: 'text-orange-500',
  },
  critico: {
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    badgeLabel: 'Crítico',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    icon: 'text-red-500',
  },
}

export default function ConfiguracoesPage() {
  // Lê plano do cookie (client-side)
  const planoAtual = typeof document !== 'undefined'
    ? document.cookie.match(/tenant_plano=([^;]+)/)?.[1] ?? 'starter'
    : 'starter'
  const planoConfig     = getPlanoConfig(planoAtual)
  const temSaldoPrePago = planoConfig.saldo_pre_pago

  // --- Identidade Visual state ---
  const [branding, setBranding] = useState({
    restaurante_nome:     '',
    restaurante_logo_url: null as string | null,
    cor_primaria:         '#1A9B8A',
    pix_chave:            '',
    saldo_habilitado:     false,
  })
  const [brandingSalvando, setBrandingSalvando] = useState(false)
  const [brandingSucesso,  setBrandingSucesso]  = useState(false)
  const [uploadingLogo,    setUploadingLogo]    = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) setBranding((b) => ({ ...b, restaurante_logo_url: data.url }))
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  async function salvarBranding() {
    setBrandingSalvando(true)
    // Salva junto com os dados de banner atuais para não sobrescrever
    const resp = await fetch('/api/admin/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...banner, ...branding }),
    })
    setBrandingSalvando(false)
    if (resp.ok) {
      setBrandingSucesso(true)
      setTimeout(() => setBrandingSucesso(false), 3000)
    }
  }

  // --- Banner state ---
  const [banner, setBanner] = useState<BannerConfig>({
    banner_ativo:             false,
    banner_titulo:            'Bem-vindo ao Menuê+! 🎉',
    banner_subtitulo:         'Veja nossas novidades do dia',
    banner_emoji:             '🍽️',
    banner_estilo:            'teal',
    banner_imagem_url:        null,
    banner_imagem_url_mobile: null,
  })
  const [bannerCarregando, setBannerCarregando] = useState(true)
  const [bannerSalvando,   setBannerSalvando]   = useState(false)
  const [bannerSucesso,    setBannerSucesso]     = useState(false)
  const [uploading,        setUploading]         = useState(false)
  const [uploadingMobile,  setUploadingMobile]   = useState(false)
  const fileInputRef       = useRef<HTMLInputElement>(null)
  const fileInputMobileRef = useRef<HTMLInputElement>(null)

  // Cropper de imagem de capa
  const [cropperConfig, setCropperConfig] = useState<{
    file:   File
    target: 'desktop' | 'mobile'
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/configuracoes')
      .then((r) => r.json())
      .then(({ config }) => {
        if (config) {
          setBanner({
            banner_ativo:      config.banner_ativo      ?? false,
            banner_titulo:     config.banner_titulo      ?? '',
            banner_subtitulo:  config.banner_subtitulo   ?? '',
            banner_emoji:      config.banner_emoji       ?? '🍽️',
            banner_estilo:     config.banner_estilo      ?? 'teal',
            banner_imagem_url:        config.banner_imagem_url         ?? null,
            banner_imagem_url_mobile: config.banner_imagem_url_mobile  ?? null,
          })
          setBranding({
            restaurante_nome:     config.restaurante_nome     ?? '',
            restaurante_logo_url: config.restaurante_logo_url ?? null,
            cor_primaria:         config.cor_primaria         ?? '#1A9B8A',
            pix_chave:            config.pix_chave            ?? '',
            saldo_habilitado:     config.saldo_habilitado      ?? false,
          })
        }
      })
      .finally(() => setBannerCarregando(false))
  }, [])

  // Abre o cropper ao selecionar — o upload só acontece após o usuário ajustar
  function uploadImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropperConfig({ file, target: 'desktop' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function uploadImagemMobile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropperConfig({ file, target: 'mobile' })
    if (fileInputMobileRef.current) fileInputMobileRef.current.value = ''
  }

  // Recebe o blob já recortado e faz o upload final
  async function handleCropConfirm(blob: Blob) {
    const isDesktop = cropperConfig?.target === 'desktop'
    setCropperConfig(null)
    if (isDesktop) setUploading(true); else setUploadingMobile(true)
    const fd = new FormData()
    fd.append('file', new File([blob], 'banner.jpg', { type: 'image/jpeg' }))
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      if (isDesktop) setBanner((b) => ({ ...b, banner_imagem_url: data.url }))
      else            setBanner((b) => ({ ...b, banner_imagem_url_mobile: data.url }))
    }
    if (isDesktop) setUploading(false); else setUploadingMobile(false)
  }

  async function salvarBanner() {
    setBannerSalvando(true)
    const resp = await fetch('/api/admin/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...branding, ...banner }),
    })
    setBannerSalvando(false)
    if (resp.ok) {
      setBannerSucesso(true)
      setTimeout(() => setBannerSucesso(false), 3000)
    }
  }

  // --- Reset state ---
  const [confirmando, setConfirmando] = useState<Acao | null>(null)
  const [executando, setExecutando] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [digitado, setDigitado] = useState('')

  async function executar() {
    if (!confirmando) return
    setExecutando(true)
    setErro(null)

    try {
      const resp = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escopo: confirmando.escopo }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? 'Erro desconhecido')

      setSucesso(confirmando.titulo)
      setConfirmando(null)
      setDigitado('')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao executar')
    } finally {
      setExecutando(false)
    }
  }

  const PALAVRA_CONFIRMA = 'CONFIRMAR'
  const podeExecutar = digitado === PALAVRA_CONFIRMA

  const estiloAtual = BANNER_ESTILOS[banner.banner_estilo] ?? BANNER_ESTILOS.teal

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-3xl">

      {/* ── Equipe & Controle de Acesso ── */}
      <Link
        href="/admin/equipe"
        className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 px-5 py-4 hover:border-teal-300 hover:bg-teal-50/40 transition-all group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <UserCog className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">Equipe & Controle de Acesso</p>
          <p className="text-xs text-slate-400 mt-0.5">Convide membros, defina cargos e gerencie acessos ao painel.</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
      </Link>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* ── Identidade Visual ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600">Configurações</p>
        </div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ImagePlus className="w-6 h-6 text-teal-600" />
              Identidade Visual
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Nome, logo e cor de destaque que aparecem para os clientes no cardápio.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              💡 Essas configurações alteram apenas o <strong>cardápio do cliente</strong> — o painel de gestão Menuê+ mantém sua identidade própria.
            </p>
          </div>
        </div>

        <div className="space-y-5 max-w-lg">
          {/* Nome do restaurante */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nome do restaurante
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              placeholder="Ex: Boteco do João"
              value={branding.restaurante_nome}
              onChange={(e) => setBranding((b) => ({ ...b, restaurante_nome: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">Aparece no topo do cardápio e na tela de boas-vindas.</p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Logo</label>
            <div className="flex items-center gap-3">
              {branding.restaurante_logo_url ? (
                <div className="relative shrink-0">
                  <img
                    src={branding.restaurante_logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                  />
                  <button
                    onClick={() => setBranding((b) => ({ ...b, restaurante_logo_url: null }))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 shrink-0">
                  <ImagePlus className="w-6 h-6 text-slate-300" />
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="text-sm"
                >
                  {uploadingLogo
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando...</>
                    : <><Upload className="w-3.5 h-3.5 mr-1.5" /> {branding.restaurante_logo_url ? 'Trocar logo' : 'Enviar logo'}</>
                  }
                </Button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                <p className="text-xs text-slate-400 mt-1">PNG, JPG ou WebP. Recomendado: 200×200px.</p>
              </div>
            </div>
          </div>

          {/* Cor primária */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cor de destaque</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.cor_primaria}
                onChange={(e) => setBranding((b) => ({ ...b, cor_primaria: e.target.value }))}
                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1"
              />
              <div>
                <p className="text-sm font-mono text-slate-700">{branding.cor_primaria}</p>
                <p className="text-xs text-slate-400">Usada nos botões e destaques do cardápio.</p>
              </div>
              <div
                className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{ background: branding.cor_primaria }}
              >
                Preview
              </div>
            </div>
          </div>

          {/* Chave PIX */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Chave PIX para pagamento na mesa
            </label>
            <input
              type="text"
              placeholder="Ex: 54.691.723/0001-03 ou email@restaurante.com"
              value={branding.pix_chave}
              onChange={(e) => setBranding((b) => ({ ...b, pix_chave: e.target.value }))}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-400"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Aparece no botão "Pagar via PIX" na conta do cliente. Se deixar em branco, a opção de PIX <strong>não aparece</strong>.
            </p>
          </div>

          {/* Saldo pré-pago */}
          <div className="rounded-2xl border-2 p-4 transition-all"
            style={{
              borderColor: !temSaldoPrePago ? '#e2e8f0' : branding.saldo_habilitado ? '#1A9B8A' : '#e2e8f0',
              background:  !temSaldoPrePago ? '#f8fafc'  : branding.saldo_habilitado ? '#f0fdfa' : '#f8fafc',
              opacity:     !temSaldoPrePago ? 0.7 : 1,
            }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💳</span>
                  <p className="text-sm font-black text-slate-800">Saldo pré-pago por cliente</p>
                  {temSaldoPrePago
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">NOVO</span>
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Business</span>
                  }
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clientes carregam saldo no caixa (via garçom) e só conseguem pedir o que têm disponível.
                  O saldo fica vinculado ao celular — funciona em qualquer QR code do estabelecimento.
                  Ideal para bares, eventos e festas.
                </p>
                {!temSaldoPrePago && (
                  <p className="text-xs font-semibold text-amber-600 mt-2">
                    🔒 Disponível no plano Business ou superior.
                  </p>
                )}
              </div>
              <button
                disabled={!temSaldoPrePago}
                onClick={() => temSaldoPrePago && setBranding((b) => ({ ...b, saldo_habilitado: !b.saldo_habilitado }))}
                className={`relative shrink-0 inline-flex w-11 h-6 rounded-full transition-colors ${
                  !temSaldoPrePago
                    ? 'bg-slate-200 cursor-not-allowed'
                    : branding.saldo_habilitado ? 'bg-teal-500 cursor-pointer' : 'bg-slate-300 cursor-pointer'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  branding.saldo_habilitado && temSaldoPrePago ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Botão salvar */}
          <Button
            onClick={salvarBranding}
            disabled={brandingSalvando}
            className="font-bold text-black hover:opacity-90"
            style={{ background: '#1A9B8A' }}
          >
            {brandingSalvando
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              : brandingSucesso
              ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Salvo!</>
              : <><Save className="w-4 h-4 mr-2" /> Salvar identidade</>
            }
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* ── Banner do Cardápio ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600">Configurações</p>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-teal-600" />
              Banner do Cardápio
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Exibido no topo da lista de itens quando o cliente abre o cardápio.
            </p>
          </div>
        </div>
      </div>

      {bannerCarregando ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          {/* Toggle ativo */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {banner.banner_ativo
                ? <Eye className="w-5 h-5 text-teal-600" />
                : <EyeOff className="w-5 h-5 text-slate-400" />}
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {banner.banner_ativo ? 'Banner ativo' : 'Banner desativado'}
                </p>
                <p className="text-xs text-slate-400">
                  {banner.banner_ativo ? 'Visível para os clientes' : 'Não aparece no cardápio'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setBanner((b) => ({ ...b, banner_ativo: !b.banner_ativo }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                banner.banner_ativo ? 'bg-teal-500' : 'bg-slate-200'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                banner.banner_ativo ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Preview */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pré-visualização</p>
            <div className="flex gap-4 flex-wrap">

              {/* Preview Desktop */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-1 mb-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Desktop</span>
                </div>
                <div className="relative rounded-xl overflow-hidden shadow-md">
                  {(banner.banner_imagem_url || banner.banner_imagem_url_mobile) ? (
                    <>
                      <img src={banner.banner_imagem_url || banner.banner_imagem_url_mobile!} alt="Desktop"
                        className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                        {banner.banner_emoji && <div className="text-2xl mb-1 leading-none">{banner.banner_emoji}</div>}
                        <h2 className="text-white font-black text-base leading-tight">{banner.banner_titulo || 'Título do banner'}</h2>
                        {banner.banner_subtitulo && <p className="text-white/75 text-xs mt-0.5">{banner.banner_subtitulo}</p>}
                      </div>
                    </>
                  ) : (
                    <div style={{ background: estiloAtual.gradient }} className="relative">
                      <div className="relative px-4 pt-4 pb-5">
                        <div className="text-3xl mb-2 leading-none">{banner.banner_emoji || '🍽️'}</div>
                        <h2 className="text-white font-black text-base leading-tight">{banner.banner_titulo || 'Título do banner'}</h2>
                        {banner.banner_subtitulo && <p className="text-xs mt-1 font-medium" style={{ color: estiloAtual.subColor }}>{banner.banner_subtitulo}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Mobile */}
              <div className="w-36">
                <div className="flex items-center gap-1 mb-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Mobile</span>
                </div>
                <div className="relative rounded-xl overflow-hidden shadow-md">
                  {(banner.banner_imagem_url_mobile || banner.banner_imagem_url) ? (
                    <>
                      <img src={banner.banner_imagem_url_mobile || banner.banner_imagem_url!} alt="Mobile"
                        className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                        {banner.banner_emoji && <div className="text-xl mb-0.5 leading-none">{banner.banner_emoji}</div>}
                        <h2 className="text-white font-black text-sm leading-tight">{banner.banner_titulo || 'Título'}</h2>
                      </div>
                    </>
                  ) : (
                    <div style={{ background: estiloAtual.gradient }} className="relative">
                      <div className="relative px-3 pt-4 pb-5">
                        <div className="text-2xl mb-1.5 leading-none">{banner.banner_emoji || '🍽️'}</div>
                        <h2 className="text-white font-black text-sm leading-tight">{banner.banner_titulo || 'Título'}</h2>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Campos */}
          <div className="px-5 py-4 space-y-4">

            {/* Upload de imagem — Desktop + Mobile */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                Imagem de fundo
              </label>
              <p className="text-xs text-slate-400 -mt-1">
                Use imagens diferentes para desktop (horizontal) e mobile (vertical). Sem imagem, o banner usa gradiente de cor.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* ── Desktop ── */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desktop</span>
                    {banner.banner_imagem_url && (
                      <span className="ml-auto text-xs text-teal-600 font-medium">✓ Ativa</span>
                    )}
                  </div>
                  {banner.banner_imagem_url ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <img src={banner.banner_imagem_url} alt="Desktop" className="w-16 h-10 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">{banner.banner_imagem_url.split('/').pop()}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors">
                          <Upload className="w-3 h-3" /> Trocar
                        </button>
                        <button onClick={() => setBanner((b) => ({ ...b, banner_imagem_url: null }))}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors">
                          <X className="w-3 h-3" /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl py-5 flex flex-col items-center gap-1.5 text-slate-400 hover:text-teal-600 transition-colors group">
                      {uploading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Enviando...</span></>
                      ) : (
                        <>
                          <ImagePlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium">Enviar imagem desktop</span>
                          <span className="text-xs text-slate-300">1200×480px recomendado</span>
                        </>
                      )}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImagem} />
                </div>

                {/* ── Mobile ── */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile</span>
                    {banner.banner_imagem_url_mobile && (
                      <span className="ml-auto text-xs text-teal-600 font-medium">✓ Ativa</span>
                    )}
                  </div>
                  {banner.banner_imagem_url_mobile ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <img src={banner.banner_imagem_url_mobile} alt="Mobile" className="w-16 h-10 object-cover rounded-lg shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">{banner.banner_imagem_url_mobile.split('/').pop()}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => fileInputMobileRef.current?.click()} disabled={uploadingMobile}
                          className="flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors">
                          <Upload className="w-3 h-3" /> Trocar
                        </button>
                        <button onClick={() => setBanner((b) => ({ ...b, banner_imagem_url_mobile: null }))}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors">
                          <X className="w-3 h-3" /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputMobileRef.current?.click()} disabled={uploadingMobile}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl py-5 flex flex-col items-center gap-1.5 text-slate-400 hover:text-teal-600 transition-colors group">
                      {uploadingMobile ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Enviando...</span></>
                      ) : (
                        <>
                          <Smartphone className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium">Enviar imagem mobile</span>
                          <span className="text-xs text-slate-300">600×400px recomendado</span>
                        </>
                      )}
                    </button>
                  )}
                  <input ref={fileInputMobileRef} type="file" accept="image/*" className="hidden" onChange={uploadImagemMobile} />
                  {!banner.banner_imagem_url_mobile && banner.banner_imagem_url && (
                    <p className="text-xs text-slate-400">Sem imagem mobile? Usa a desktop como fallback.</p>
                  )}
                </div>

              </div>

              {!banner.banner_imagem_url && !banner.banner_imagem_url_mobile && (
                <p className="text-xs text-slate-400">
                  Sem imagem? O banner usa o gradiente de cor selecionado abaixo.
                </p>
              )}
            </div>

            {/* Emoji + Estilo (só visível sem imagem, ou sempre para o emoji) */}
            <div className="flex gap-4">
              <div className="space-y-1.5 w-28">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Emoji</label>
                <input
                  value={banner.banner_emoji}
                  onChange={(e) => setBanner((b) => ({ ...b, banner_emoji: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xl text-center outline-none focus:border-teal-400 transition-colors"
                  maxLength={4}
                />
              </div>
              {!banner.banner_imagem_url && (
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cor / Estilo</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(BANNER_ESTILOS).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setBanner((b) => ({ ...b, banner_estilo: key }))}
                        title={val.label}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          banner.banner_estilo === key
                            ? 'border-slate-800 scale-110 shadow-md'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ background: val.gradient }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Título principal</label>
              <input
                value={banner.banner_titulo}
                onChange={(e) => setBanner((b) => ({ ...b, banner_titulo: e.target.value }))}
                placeholder="Ex: Promoção de hoje! 🎉"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors"
                maxLength={80}
              />
            </div>

            {/* Subtítulo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Subtítulo <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                value={banner.banner_subtitulo}
                onChange={(e) => setBanner((b) => ({ ...b, banner_subtitulo: e.target.value }))}
                placeholder="Ex: Peça o prato do chef com 20% off hoje!"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors"
                maxLength={120}
              />
            </div>

            {/* Botão salvar */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={salvarBanner}
                disabled={bannerSalvando}
                className="flex items-center gap-2 text-white"
                style={{ background: '#1A9B8A' }}
              >
                {bannerSalvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  : <><Save className="w-4 h-4" /> Salvar banner</>}
              </Button>
              {bannerSucesso && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Salvo!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Header — Gestão de Dados */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Gestão de Dados</h2>
        <p className="text-sm text-slate-500 mt-1">
          Use com cuidado. As ações abaixo são irreversíveis e afetam diretamente o banco de dados.
        </p>
      </div>

      {/* Aviso geral */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Atenção:</strong> estas ações apagam dados permanentemente e não podem ser desfeitas.
          Confirme sempre antes de executar em produção.
        </div>
      </div>

      {/* Feedback de sucesso */}
      {sucesso && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">✓ {sucesso} — concluído com sucesso.</p>
          <button onClick={() => setSucesso(null)} className="ml-auto text-green-500 hover:text-green-700 text-xs">fechar</button>
        </div>
      )}

      {/* Feedback de erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">fechar</button>
        </div>
      )}

      {/* Cards de ação */}
      <div className="space-y-3">
        {ACOES.map((acao) => {
          const cfg = NIVEL_CONFIG[acao.nivel]
          const Icon = acao.icon
          return (
            <div
              key={acao.escopo}
              className={`bg-white rounded-xl border ${cfg.border} p-4 flex items-start gap-4`}
            >
              <div className={`w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 ${cfg.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-slate-800 text-sm">{acao.titulo}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.badgeLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{acao.descricao}</p>
              </div>
              <button
                onClick={() => { setConfirmando(acao); setDigitado(''); setErro(null) }}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${cfg.btn}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Executar
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de confirmação */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !executando && setConfirmando(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl">

            {/* Ícone + título */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                confirmando.nivel === 'critico' ? 'bg-red-100' :
                confirmando.nivel === 'alto' ? 'bg-orange-100' : 'bg-yellow-100'
              }`}>
                <ShieldAlert className={`w-6 h-6 ${
                  confirmando.nivel === 'critico' ? 'text-red-600' :
                  confirmando.nivel === 'alto' ? 'text-orange-500' : 'text-yellow-500'
                }`} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">{confirmando.titulo}</h2>
                <p className="text-xs text-slate-500 mt-1">{confirmando.detalhe}</p>
              </div>
            </div>

            {/* Campo de confirmação */}
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Para confirmar, digite <strong className="text-red-600 font-mono">{PALAVRA_CONFIRMA}</strong> abaixo:
              </p>
              <input
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                placeholder={PALAVRA_CONFIRMA}
                value={digitado}
                onChange={(e) => setDigitado(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && podeExecutar && executar()}
              />
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmando(null)}
                disabled={executando}
              >
                Cancelar
              </Button>
              <Button
                className={`flex-1 ${NIVEL_CONFIG[confirmando.nivel].btn} disabled:opacity-40`}
                disabled={!podeExecutar || executando}
                onClick={executar}
              >
                {executando
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Executando...</>
                  : <><Trash2 className="w-4 h-4 mr-2" /> Confirmar</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cropper de imagem de capa ── */}
      {cropperConfig && (
        <ImageCropper
          file={cropperConfig.file}
          aspectRatio={cropperConfig.target === 'desktop' ? 1200 / 480 : 600 / 400}
          outputWidth={cropperConfig.target === 'desktop' ? 1200 : 600}
          outputHeight={cropperConfig.target === 'desktop' ? 480  : 400}
          label={cropperConfig.target === 'desktop'
            ? 'Desktop · 1200×480px'
            : 'Mobile · 600×400px'}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropperConfig(null)}
        />
      )}
    </div>
  )
}
