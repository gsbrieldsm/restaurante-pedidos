import Link from 'next/link'
import { ChefHat, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#F0FAFA' }}
    >
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat className="w-5 h-5 text-teal-600" />
          <span className="text-sm font-black tracking-widest uppercase text-teal-600">Menuê+</span>
        </div>

        {/* 404 */}
        <p className="text-8xl font-black text-teal-100 leading-none mb-2 select-none">404</p>
        <h1 className="text-xl font-black text-slate-800 mb-2">Página não encontrada</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          O endereço que você acessou não existe ou foi movido.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0f3d35, #1A9B8A)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

      </div>
    </div>
  )
}
