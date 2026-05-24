/**
 * Gera um HTMLAudioElement com um beep WAV sintetizado.
 * Funciona em todos os browsers, incluindo Safari (iOS e Mac).
 *
 * @param freqs      Array de frequências em Hz (uma por bip)
 * @param duracao    Duração de cada bip em segundos
 * @param pausaMs    Pausa entre bips em milissegundos (default 80)
 */
export function criarBeep(
  freqs: number | number[],
  duracao: number,
  pausaMs = 80,
): HTMLAudioElement {
  const SAMPLE_RATE = 44100
  const fArr     = Array.isArray(freqs) ? freqs : [freqs]
  const nBip     = Math.floor(SAMPLE_RATE * duracao)
  const nPausa   = Math.floor(SAMPLE_RATE * pausaMs / 1000)
  const N        = nBip * fArr.length + nPausa * (fArr.length - 1)

  const buf  = new ArrayBuffer(44 + N * 2)
  const view = new DataView(buf)
  const str  = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }

  // WAV header
  str(0, 'RIFF'); view.setUint32(4, 36 + N * 2, true)
  str(8, 'WAVE'); str(12, 'fmt ')
  view.setUint32(16, 16, true)          // chunk size
  view.setUint16(20, 1,  true)          // PCM
  view.setUint16(22, 1,  true)          // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2,  true)          // block align
  view.setUint16(34, 16, true)          // bits per sample
  str(36, 'data'); view.setUint32(40, N * 2, true)

  // PCM data
  let off = 44
  for (let r = 0; r < fArr.length; r++) {
    const freq = fArr[r]
    for (let i = 0; i < nBip; i++) {
      // Envelope: ataque rápido (5%) + decaimento suave até o fim
      const env = i < nBip * 0.05
        ? i / (nBip * 0.05)
        : Math.pow(1 - i / nBip, 0.5)
      const sample = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE) * env * 0.5 * 32767
      view.setInt16(off, sample | 0, true)
      off += 2
    }
    // Silêncio entre bips
    if (r < fArr.length - 1) {
      for (let i = 0; i < nPausa; i++) { view.setInt16(off, 0, true); off += 2 }
    }
  }

  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
  return new Audio(url)
}

/**
 * Desbloqueia um HTMLAudioElement no Safari tocando-o silenciosamente
 * dentro de um gesto do usuário. Após isso, .play() funciona a qualquer momento.
 */
export async function desbloquearAudio(el: HTMLAudioElement): Promise<void> {
  el.volume = 0
  try {
    await el.play()
    el.pause()
    el.currentTime = 0
  } catch { /* ignora */ }
  el.volume = 1
}
