import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rota desativada — era apenas para diagnóstico em desenvolvimento
export async function GET() {
  return NextResponse.json({ error: 'Rota não disponível' }, { status: 404 })
}
