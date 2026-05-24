/**
 * Utilitários de cor para branding dinâmico por restaurante.
 * Usado nas páginas do cliente (cardápio, confirmação, conta).
 */

/** Escurece um hex pelo fator dado (0–1). */
export function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`
}

/** Retorna "r,g,b" para uso em rgba(). */
export function hexToRgbParts(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

/** Gradiente escuro de header a partir da cor primária do restaurante. */
export function headerGradient(cor: string): string {
  return `linear-gradient(135deg, ${darkenHex(cor, 0.10)} 0%, ${darkenHex(cor, 0.28)} 50%, ${cor} 100%)`
}

/** Fundo muito claro (equivalente a bg-teal-50). */
export function corFundoClaro(rgb: string): string {
  return `rgba(${rgb}, 0.08)`
}

/** Fundo médio (equivalente a bg-teal-100). */
export function corFundoMedio(rgb: string): string {
  return `rgba(${rgb}, 0.14)`
}

/** Borda suave (equivalente a border-teal-200). */
export function corBorda(rgb: string): string {
  return `rgba(${rgb}, 0.30)`
}
