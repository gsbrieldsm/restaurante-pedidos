import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Menuê+',
  description: 'Cardápio digital com pedidos via QR Code',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.className} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
