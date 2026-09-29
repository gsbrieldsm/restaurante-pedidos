'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

export type Locale = 'pt' | 'en' | 'es'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Messages = Record<string, any>

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, fallback?: string) => string
  tArr: (key: string) => string[]
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'pt',
  setLocale: () => {},
  t: (k) => k,
  tArr: () => [],
})

function getNestedValue(obj: Messages, key: string): unknown {
  return key.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? (acc as Messages)[k] : undefined), obj)
}

export function I18nProvider({ children, initialMessages, initialLocale }: {
  children: ReactNode
  initialMessages: Messages
  initialLocale: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Messages>(initialMessages)

  const setLocale = useCallback(async (newLocale: Locale) => {
    // Salva no cookie (30 dias)
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`

    // Carrega as mensagens dinamicamente
    const msgs = await import(`@/messages/${newLocale}.json`)
    setMessages(msgs.default)
    setLocaleState(newLocale)
  }, [])

  const t = useCallback((key: string, fallback?: string): string => {
    const val = getNestedValue(messages, key)
    if (typeof val === 'string') return val
    return fallback ?? key
  }, [messages])

  const tArr = useCallback((key: string): string[] => {
    const val = getNestedValue(messages, key)
    if (Array.isArray(val)) return val as string[]
    return []
  }, [messages])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tArr }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
