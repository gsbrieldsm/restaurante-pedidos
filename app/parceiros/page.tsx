import type { Metadata } from 'next'
import ParceirosClient from './ParceirosClient'
import { I18nProvider } from '@/lib/i18n'
import { getLocale, getMessages } from '@/lib/locale'

export const metadata: Metadata = {
  title: 'Parceiros Menuê+ — Ganhe comissão indicando restaurantes',
  description: 'Programa de parceiros Menuê+. Indique restaurantes, ganhe 30% na implementação e até 30% de recorrente todo mês.',
}

export default async function ParceirosPage() {
  const locale = await getLocale()
  const messages = await getMessages(locale)

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <ParceirosClient />
    </I18nProvider>
  )
}
