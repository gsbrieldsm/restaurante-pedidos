import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Gera o hash de uma senha usando scrypt (built-in do Node.js).
 * Formato armazenado: "<salt_hex>:<hash_hex>"
 */
export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(senha, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Compara uma senha em texto plano com o hash armazenado.
 * Usa timingSafeEqual para evitar timing attacks.
 */
export function verificarSenha(senha: string, armazenado: string): boolean {
  try {
    const [salt, hash] = armazenado.split(':')
    if (!salt || !hash) return false
    const hashBuffer   = Buffer.from(hash, 'hex')
    const derivedHash  = scryptSync(senha, salt, 64)
    return timingSafeEqual(hashBuffer, derivedHash)
  } catch {
    return false
  }
}
