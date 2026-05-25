@AGENTS.md

# Menuê+ — Contexto do Projeto

## O que é
SaaS multi-tenant de cardápio digital com pedidos via QR Code para restaurantes.
Cada restaurante é um **tenant** isolado. Domínio: `www.menue.com.br`.
Subdomínios de tenant (`joao.menue.com.br`) são roteados via **Cloudflare Worker** que injeta o header `x-tenant-slug` e faz proxy para o Vercel.

## Stack
- **Next.js App Router** — `app/` directory, server components, API routes em `app/api/`
- **Supabase** (PostgreSQL) — banco multi-tenant, todas as queries filtram por `tenant_id`
- **Resend** — e-mail transacional (`RESEND_API_KEY` no Vercel, comentado no `.env.local`)
- **Mercado Pago** — pagamentos PIX (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`)
- **Tailwind CSS** — cor primária teal (`#1A9B8A`), fundo claro `#F0FAFA`
- **Vercel** — deploy automático via push na branch `main`

## Estrutura de autenticação
| Cookie | Descrição |
|--------|-----------|
| `tenant_id` | UUID do tenant ativo (httpOnly) |
| `tenant_slug` | Slug do tenant (não-httpOnly, lido por JS) |
| `admin_auth` | Token de sessão do staff (`mmu:<uuid>` ou `mmu-admin-v1`) |
| `mmu_cargo` | `admin` ou `operador` |
| `trial_expira_em` | ISO date do fim do trial (não-httpOnly) |
| `plano_ativo` | `sim` se plano pago ativo |
| `superadmin_auth` | `sa-ok` para acesso ao painel master |

## Planos e limites (`lib/planos.ts`)
| Plano | Mesas | Estações | Bloqueado |
|-------|-------|----------|-----------|
| starter | 15 | 2 | performance, clientes, financeiro |
| pro | 30 | 4 | — |
| business | 60 | ilimitado | — |
| enterprise | ilimitado | ilimitado | — |

## Preços atuais (landing + trial-expirado)
- Starter: **R$ 397/mês**
- Pro: **R$ 697/mês**
- Business: **R$ 1.197/mês**
- Implementação: **R$ 2.000** (cobrada só se continuar após trial)

## Painéis principais
| Rota | Quem acessa |
|------|-------------|
| `/admin` | Dono/admin do restaurante |
| `/garcom` | Garçons |
| `/estacao/cozinha` `/estacao/bar` etc. | Estações de preparo |
| `/superadmin` | Acesso master (Gabriel) |
| `/parceiros/painel` | Parceiros de indicação |
| `/s/[slug]` | Cardápio público do restaurante |
| `/mesa/[token]/cardapio` | Cliente no cardápio via QR |

## Arquivos críticos
- `middleware.ts` — roteamento, auth, subdomínio, trial expirado, plano bloqueado
- `lib/planos.ts` — fonte única de verdade dos limites por plano
- `lib/audio.ts` — geração de beeps para painéis (garçom, estações)
- `app/api/tenant/setup/route.ts` — cria mesas e config padrão ao ativar trial
- `app/api/tenant/plano/route.ts` — ativa trial de 7 dias
- `app/api/tenant/verificar-email/route.ts` — verifica email e seta cookies de sessão
- `supabase/migrations/` — todas as migrations numeradas sequencialmente (atual: 032)

## Banco de dados — tabelas principais
- `tenants` — restaurantes cadastrados
- `usuarios` — staff de cada tenant
- `mesas` — mesas com QR token
- `sessoes_mesa` — sessão ativa de um cliente em uma mesa
- `pedidos` / `pedido_itens` — pedidos e seus itens
- `chamadas_garcom` — cliente chama o garçom pelo cardápio
- `configuracoes` — config visual do restaurante (banner, cores, logo)
- `chamados` — tickets de sugestão/bug abertos pelo admin (vai para superadmin)
- `parceiros_leads` — leads de parceiros de indicação

## Emails transacionais (Resend)
- Boas-vindas: `lib/email/boas-vindas.ts`
- Notificação de chamado/sugestão: `app/api/admin/chamados/route.ts`
- **Regra crítica**: HTML de email NUNCA usa `display:flex` ou CSS Grid — apenas `<table>` (compatibilidade Gmail/Outlook)
- Remetente: `Menue+ <noreply@menue.com.br>` (env `RESEND_FROM`)
- Destino dos alertas: `SUPERADMIN_EMAIL=gsbrieldsm@gmail.com`

## Padrões de código
- Sempre usar `createServiceClient()` para queries server-side (bypassa RLS)
- Rotas da API retornam `NextResponse.json({ ok: true })` no sucesso
- Migrations SQL ficam em `supabase/migrations/` com prefixo numérico sequencial
- Nome da plataforma: sempre **Menuê+** (nunca "Meu Menu+", nunca "Menue+")
- Ícone da marca: **M+** (fundo `#1A9B8A`, texto branco)

## Variáveis de ambiente importantes
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://www.menue.com.br
RESEND_API_KEY          ← só no Vercel, comentado em .env.local
RESEND_FROM=Menue+ <noreply@menue.com.br>
ADMIN_PASSWORD
SUPERADMIN_PASSWORD
SUPERADMIN_EMAIL=gsbrieldsm@gmail.com
MP_ACCESS_TOKEN / MP_PUBLIC_KEY / MP_WEBHOOK_SECRET
NEXT_PUBLIC_ROOT_DOMAIN=menue.com.br
```

## Deploy
- Push para `main` → deploy automático no Vercel
- Migrations SQL: executar manualmente no **Supabase > SQL Editor**
- Depois de cada migration criar o arquivo em `supabase/migrations/` e commitar

## Pendências conhecidas
- [ ] RLS policies na tabela `chamados` (criada sem políticas de row-level security)
- [ ] `RESEND_API_KEY` não está no `.env.local` (só no Vercel) — testes locais de email não funcionam
- [ ] Downgrade de plano não remove mesas excedentes
- [ ] Cloudflare Worker: verificar se `x-tenant-slug` header é injetado corretamente em todos os paths
- [ ] `nome_autor` no widget de sugestão poderia auto-preencher com nome do usuário logado
