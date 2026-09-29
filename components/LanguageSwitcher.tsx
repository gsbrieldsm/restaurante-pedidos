'use client'

import { useI18n, LOCALES, type Locale } from '@/lib/i18n'

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LOCALES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLocale(code as Locale)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all"
          style={{
            background: locale === code ? 'rgba(26,155,138,0.25)' : 'transparent',
            color: locale === code ? '#5EEAD4' : 'rgba(255,255,255,0.4)',
            border: locale === code ? '1px solid rgba(26,155,138,0.4)' : '1px solid transparent',
          }}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
