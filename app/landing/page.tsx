import type { Metadata } from 'next'
import LandingClient from './LandingClient'
import { I18nProvider } from '@/lib/i18n'
import { getLocale, getMessages } from '@/lib/locale'

export const metadata: Metadata = {
  title: 'Menuê+ — Cardápio digital, pedidos e delivery para restaurantes',
  description: 'Cardápio digital via QR code, pedidos em tempo real para cozinha e bar, módulo de delivery integrado e gestão completa. Sem app, sem filas, sem erro. Trial de 7 dias grátis.',
}

export default async function LandingPage() {
  const locale = await getLocale()
  const messages = await getMessages(locale)

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <LandingClient />
    </I18nProvider>
  )
}
