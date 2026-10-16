'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSession, getSession, signOut } from '@/lib/auth-slot'
import { clientIp } from '@/lib/client-ip'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { fieldErrors } from '@/validations/public'

const loginSchema = z.object({
  email: z.string().trim().email('forms.errors.email'),
  password: z.string().min(1, 'forms.errors.required'),
})

/** Limite : 10 échecs par email sur 15 minutes. */
async function lockedOut(email: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000)
  const failures = await prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } })
  return failures >= 10
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
  const email = parsed.data.email.toLowerCase()
  const ip = clientIp(await headers())

  if (await lockedOut(email)) return err('errors.tooMany')

  const user = await prisma.user.findUnique({ where: { email } })
  const success = !!user && verifyPassword(parsed.data.password, user.passwordHash)
  await prisma.loginAttempt.create({ data: { email, success, ip } })
  if (!success || !user) return err('errors.badCredentials')

  await createSession(user.id)
  redirect('/admin')
}

export async function logout(): Promise<void> {
  await signOut()
  redirect('/admin/connexion')
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'forms.errors.required'),
    next: z.string().min(10, 'errors.passwordTooShort'),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: 'errors.passwordMismatch', path: ['confirm'] })

export async function changePassword(_prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return err(ERRORS.unauthorized)
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !verifyPassword(parsed.data.current, user.passwordHash)) return err('errors.badPassword', { fields: { current: 'errors.badPassword' } })
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(parsed.data.next) } })
  return ok()
}

const accountSchema = z.object({
  email: z.string().trim().email('forms.errors.email'),
  name: z.string().trim().max(80, 'forms.errors.tooLong'),
})

export async function updateAccount(_prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return err(ERRORS.unauthorized)
  const parsed = accountSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
  await prisma.user.update({ where: { id: session.user.id }, data: { email: parsed.data.email.toLowerCase(), name: parsed.data.name || null } })
  return ok()
}
