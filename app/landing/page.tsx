import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: 'Menuê+ — Cardápio digital, pedidos e delivery para restaurantes',
  description: 'Cardápio digital via QR code, pedidos em tempo real para cozinha e bar, módulo de delivery integrado e gestão completa. Sem app, sem filas, sem erro. Trial de 7 dias grátis.',
}

export default function LandingPage() {
  return <LandingClient />
}
