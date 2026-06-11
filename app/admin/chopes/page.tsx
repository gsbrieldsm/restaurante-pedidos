'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { EstoqueTab } from '@/components/admin/chopes/EstoqueTab'
import { ChopesTab } from '@/components/admin/chopes/ChopesTab'
import { RelatoriosTab } from '@/components/admin/chopes/RelatoriosTab'
import type { Chope } from '@/lib/chopes/estoque'

const TABS = [
  { id: 'estoque', label: 'Controle de Estoque' },
  { id: 'chopes', label: 'Chopes' },
  { id: 'relatorios', label: 'Relatórios' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function ChopesAdminPage() {
  const [tab, setTab] = useState<TabId>('estoque')
  const [chopes, setChopes] = useState<Chope[]>([])
  const [importacoes, setImportacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [resChopes, resImportacoes] = await Promise.all([
      fetch('/api/admin/chopes'),
      fetch('/api/admin/chopes/relatorios'),
    ])
    if (resChopes.ok) setChopes(await resChopes.json())
    if (resImportacoes.ok) setImportacoes(await resImportacoes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2b2420]">Chopes — Schornstein</h1>
          <p className="text-slate-500 text-sm">Controle de estoque das torneiras de chope</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[#2b2420] text-[#f0a830]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'estoque' && <EstoqueTab chopes={chopes} onChanged={carregar} />}
          {tab === 'chopes' && <ChopesTab chopes={chopes} onChanged={carregar} />}
          {tab === 'relatorios' && (
            <RelatoriosTab chopes={chopes} importacoes={importacoes} onChanged={carregar} />
          )}
        </>
      )}

      <div className="pt-6 pb-2 text-center">
        <p className="text-xs text-slate-400">
          Powered by <span className="font-semibold text-[#1A9B8A]">Menuê+</span>
        </p>
      </div>
    </div>
  )
}
