import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL, StatusEstoque } from '@/lib/chopes/estoque'

const STATUS_CLASS: Record<StatusEstoque, string> = {
  OK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ALERTA: 'bg-amber-100 text-amber-800 border-amber-200',
  CRITICO: 'bg-orange-100 text-orange-800 border-orange-300',
  ESGOTADO: 'bg-red-100 text-red-800 border-red-300',
}

export function StatusBadge({ status }: { status: StatusEstoque }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
