import { cookies } from 'next/headers'
import type { Locale } from './i18n'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const val = store.get('locale')?.value
  if (val === 'en' || val === 'es') return val
  return 'pt'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMessages(locale: Locale): Promise<Record<string, any>> {
  const msgs = await import(`@/messages/${locale}.json`)
  return msgs.default
}
