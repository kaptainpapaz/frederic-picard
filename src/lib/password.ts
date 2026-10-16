/**
 * Hachage des mots de passe avec scrypt (Node natif, aucune dépendance binaire).
 *
 * Un seul compte sur ce site. argon2 ou bcrypt ajouteraient un module compilé
 * (règle I4) pour un gain nul à cette échelle.
 * Format stocké : scrypt$<sel hex>$<hash hex>.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}
