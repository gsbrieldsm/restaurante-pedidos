export type EstacaoTipo = 'cozinha' | 'bar' | 'drinks' | 'chopeira'
export type StatusItem = 'aguardando' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type StatusPedido = 'aguardando' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type StatusMesa = 'livre' | 'ocupada' | 'aguardando_pagamento'

export interface Database {
  public: {
    Tables: {
      mesas: {
        Row: Mesa
        Insert: Omit<Mesa, 'id' | 'criado_em' | 'qr_token'>
        Update: Partial<Omit<Mesa, 'id'>>
      }
      sessoes_mesa: {
        Row: SessaoMesa
        Insert: Omit<SessaoMesa, 'id' | 'aberta_em'>
        Update: Partial<Omit<SessaoMesa, 'id'>>
      }
      cardapio_itens: {
        Row: CardapioItem
        Insert: Omit<CardapioItem, 'id' | 'criado_em'>
        Update: Partial<Omit<CardapioItem, 'id'>>
      }
      pedidos: {
        Row: Pedido
        Insert: Omit<Pedido, 'id' | 'criado_em' | 'atualizado_em'>
        Update: Partial<Omit<Pedido, 'id'>>
      }
      pedido_itens: {
        Row: PedidoItem
        Insert: Omit<PedidoItem, 'id' | 'criado_em'>
        Update: Partial<Omit<PedidoItem, 'id'>>
      }
      notificacoes_whatsapp: {
        Row: NotificacaoWhatsapp
        Insert: Omit<NotificacaoWhatsapp, 'id' | 'criado_em'>
        Update: Partial<Omit<NotificacaoWhatsapp, 'id'>>
      }
    }
    Views: {
      view_mesas_status: { Row: ViewMesaStatus }
      view_fila_estacoes: { Row: ViewFilaEstacao }
    }
  }
}

export interface Mesa {
  id: string
  numero: number
  nome: string | null
  qr_token: string
  status: StatusMesa
  capacidade: number
  criado_em: string
}

export interface SessaoMesa {
  id: string
  mesa_id: string
  cliente_nome: string
  cliente_whatsapp: string | null
  aberta_em: string
  fechada_em: string | null
  ativa: boolean
}

export interface CardapioItem {
  id: string
  nome: string
  descricao: string | null
  preco: number
  custo: number
  categoria: string
  estacao: EstacaoTipo
  tempo_preparo_estimado: number
  disponivel: boolean
  imagem_url: string | null
  ordem: number
  criado_em: string
}

export interface Pedido {
  id: string
  sessao_id: string
  mesa_id: string
  mesa_numero: number
  cliente_nome: string
  cliente_whatsapp: string | null
  status_geral: StatusPedido
  observacao_geral: string | null
  total: number
  whatsapp_enviado_confirmacao: boolean
  whatsapp_enviado_preparo: boolean
  whatsapp_enviado_pronto: boolean
  criado_em: string
  atualizado_em: string
}

export interface PedidoItem {
  id: string
  pedido_id: string
  item_id: string
  item_nome: string
  item_preco: number
  quantidade: number
  observacao: string | null
  estacao: EstacaoTipo
  tempo_preparo_estimado: number
  status: StatusItem
  iniciado_em: string | null
  pronto_em: string | null
  entregue_em: string | null
  tempo_real_minutos: number | null
  criado_em: string
}

export interface NotificacaoWhatsapp {
  id: string
  pedido_id: string
  tipo: 'confirmacao' | 'em_preparo' | 'pronto' | 'entregue'
  mensagem: string
  numero_destino: string
  status: 'pendente' | 'enviado' | 'erro'
  erro_detalhes: string | null
  criado_em: string
}

export interface ViewMesaStatus {
  id: string
  numero: number
  nome: string | null
  status: StatusMesa
  capacidade: number
  sessao_id: string | null
  cliente_nome: string | null
  cliente_whatsapp: string | null
  aberta_em: string | null
  total_pedidos: number
  pedidos_ativos: number
  ultimo_pedido_em: string | null
}

export interface ViewFilaEstacao {
  id: string
  pedido_id: string
  item_nome: string
  quantidade: number
  observacao: string | null
  estacao: EstacaoTipo
  status: StatusItem
  tempo_preparo_estimado: number
  iniciado_em: string | null
  criado_em: string
  mesa_numero: number
  cliente_nome: string
  minutos_aguardando: number
  minutos_em_preparo: number | null
}

export interface OpcaoItem {
  id: string
  grupo_id: string
  nome: string
  preco_adicional: number
  ordem: number
}

export interface GrupoOpcao {
  id: string
  item_id: string
  nome: string
  obrigatorio: boolean
  multiplo: boolean
  ordem: number
  opcoes: OpcaoItem[]
}

export interface OpcaoSelecionada {
  grupo_id: string
  grupo_nome: string
  opcao_id: string
  opcao_nome: string
  preco_adicional: number
}

export interface ItemCarrinho {
  carrinhoKey: string         // item.id para itens sem opcionais, uuid único para com opcionais
  item: CardapioItem
  quantidade: number
  observacao: string
  opcoes_selecionadas: OpcaoSelecionada[]
  preco_unitario: number      // preco base + soma dos adicionais
}
