/**
 * SLOT AUTHENTIFICATION — branché le 2026-10-16 pour ce projet.
 *
 * Arbitrage ouvert du socle (Better Auth ou Auth.js v5, aucune défaillante en prod).
 * Choix ici : AUCUNE bibliothèque. Un seul compte (Fred), connexion par email et mot de
 * passe, session dans un cookie signé HMAC-SHA256 avec AUTH_SECRET. Raison : zéro
 * dépendance, zéro budget, un seul utilisateur ; les trois fonctions du slot suffisent.
 * Critère de réouverture : un second rôle ou une connexion externe (magic link, OAuth).
 *
 * Règle E1, à faire au déploiement quelle que soit la méthode :
 *   1. AUTH_URL = URL publique     2. AUTH_TRUST_HOST=true     3. X-Forwarded-Proto relayé
 *   Recette obligatoire : se déconnecter, pas seulement se connecter.
 *
 * Règle E2 : l'identité vient du jeton (cookie), jamais de l'URL.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  /** Permissions résolues depuis les rôles. Voir rbac.ts. */
  permissions: readonly string[]
}

export type Session = {
  user: SessionUser
  expiresAt: Date
}

const COOKIE = 'fp_session'
const TTL_SECONDS = 60 * 60 * 24 * 14 // 14 jours

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET absente ou trop courte (32 caractères minimum).')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function encode(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

function decode(token: string | undefined): { userId: string; expiresAt: number } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, exp, sig] = parts
  const expected = sign(`${userId}.${exp}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const expiresAt = Number(exp)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  return { userId, expiresAt }
}

function isSecure(): boolean {
  return (process.env.AUTH_URL ?? '').startsWith('https://')
}

/** Lit la session courante. Retourne null si non authentifié. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const parsed = decode(store.get(COOKIE)?.value)
  if (!parsed) return null
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  })
  if (!user) return null
  const permissions = [...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)))]
  return { user: { id: user.id, email: user.email, name: user.name, permissions }, expiresAt: new Date(parsed.expiresAt) }
}

/** Règle E2 : l'identité vient du jeton, jamais de l'URL. */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

/** Pose le cookie de session. À appeler après vérification du mot de passe. */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + TTL_SECONDS * 1000
  const store = await cookies()
  store.set(COOKIE, encode(userId, expiresAt), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

export async function signOut(): Promise<void> {
  const store = await cookies()
  store.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: isSecure(), path: '/', maxAge: 0 })
}
