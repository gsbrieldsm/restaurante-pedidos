interface KpiCard {
  label: string
  value: string | number
  sublabel?: string
  alerta?: boolean   // destaca em coral
  destaque?: boolean // destaca em teal claro
}

interface Props {
  secao: string          // label pequeno acima (ex: "FATURAMENTO")
  titulo: string         // texto grande à esquerda
  metricaLabel: string   // label da métrica principal (direita)
  metricaValor: string   // valor da métrica principal
  metricaDestaque?: boolean // se true, valor fica em teal
  kpis: KpiCard[]
  loading?: boolean
}

export function PainelHero({
  secao, titulo, metricaLabel, metricaValor,
  metricaDestaque = true, kpis, loading = false,
}: Props) {
  return (
    <>
      {/* Topo: título + métrica principal */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-1">{secao}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{titulo}</h1>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-400 mb-0.5">{metricaLabel}</p>
          <p className={`text-xl sm:text-2xl font-black ${metricaDestaque ? 'text-teal-600' : 'text-slate-800'}`}>
            {loading ? '—' : metricaValor}
          </p>
        </div>
      </div>

      {/* Painel hero com gradiente */}
      <div
        className="rounded-2xl p-4 sm:p-6"
        style={{
          background: 'linear-gradient(135deg, #0a2420 0%, #0f3d35 40%, #1A9B8A 100%)',
        }}
      >
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {kpis.map(({ label, value, sublabel, alerta, destaque }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-2.5 shrink-0 min-w-[88px]"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <p
                  className={`font-black leading-tight mb-1 whitespace-nowrap ${
                    String(value).length > 8 ? 'text-sm' : 'text-lg sm:text-xl'
                  }`}
                  style={{
                    color: alerta ? '#F05A4F' : destaque ? '#5eead4' : 'white',
                  }}
                >
                  {value}
                </p>
                <p className="text-[11px] text-white/60 leading-tight">{label}</p>
                {sublabel && (
                  <p className="text-[11px] text-white/35 leading-tight mt-0.5">{sublabel}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
