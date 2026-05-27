/**
 * Geocodificação de CEP e cálculo de distância Haversine.
 * Usa ViaCEP para complementar endereço + Nominatim para coordenadas.
 */

export interface EnderecoViaCEP {
  cep:         string
  logradouro:  string
  bairro:      string
  localidade:  string
  uf:          string
  erro?:       boolean
}

export interface Coordenadas {
  lat: number
  lng: number
}

/** Busca dados de um CEP via ViaCEP */
export async function buscarCEP(cep: string): Promise<EnderecoViaCEP | null> {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`, {
      next: { revalidate: 3600 }, // cache por 1h
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return data as EnderecoViaCEP
  } catch {
    return null
  }
}

/** Geocodifica um endereço usando Nominatim (OpenStreetMap) */
export async function geocodificar(
  logradouro: string,
  numero: string,
  cidade: string,
  uf: string,
  cep: string,
): Promise<Coordenadas | null> {
  // Primeira tentativa: busca pelo CEP diretamente
  try {
    const query   = encodeURIComponent(`${cep}, Brasil`)
    const url     = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`
    const res     = await fetch(url, {
      headers: { 'User-Agent': 'Menue+ Restaurant SaaS (noreply@menue.com.br)' },
      next:    { revalidate: 86400 }, // cache por 24h
    })
    if (res.ok) {
      const data = await res.json()
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      }
    }
  } catch { /* ignora, tenta por endereço */ }

  // Segunda tentativa: endereço completo
  try {
    const q   = encodeURIComponent(`${logradouro} ${numero}, ${cidade}, ${uf}, Brasil`)
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Menue+ Restaurant SaaS (noreply@menue.com.br)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

/**
 * Distância em km entre dois pontos via fórmula de Haversine.
 * Raio médio da Terra: 6371 km.
 */
export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2
  const c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number) {
  return deg * (Math.PI / 180)
}
