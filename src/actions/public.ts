'use server'

/**
 * Actions publiques : message de contact, demande de tirage.
 *
 * Règle F1 : le message est enregistré, PUIS Fred est notifié, PUIS l'issue est
 * journalisée. Un SMTP en panne n'annule pas la demande.
 * Règle E6 : l'IP vient de clientIp(), jamais de la tête de X-Forwarded-For.
 */
import { headers } from 'next/headers'
import { commitThen } from '@/lib/after-commit'
import { clientIp } from '@/lib/client-ip'
import { getContent } from '@/lib/content'
import { prisma } from '@/lib/db'
import { sendForTransition } from '@/lib/email'
import { ensureEmailConfigured } from '@/lib/email/setup'
import { formatPrice } from '@/lib/queries'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { contactSchema, fieldErrors, orderSchema } from '@/validations/public'

const SUBJECTS: Record<string, string> = {
  'emails.messageReceived.subject': 'Nouveau message depuis le site',
  'emails.orderRequested.subject': 'Nouvelle demande de tirage',
}
/** Les emails partent à Fred, en français : pas de locale visiteur à propager. */
const translate = (key: string) => SUBJECTS[key] ?? key

function adminUrl(path: string): string {
  return `${process.env.AUTH_URL ?? ''}${path}`
}

/** Limite de débit minimale : 5 messages par IP et par heure. */
async function tooMany(ip: string | null): Promise<boolean> {
  if (!ip) return false
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const count = await prisma.message.count({ where: { ip, createdAt: { gte: since } } })
  return count >= 5
}

export async function sendContact(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
  const ip = clientIp(await headers())
  if (await tooMany(ip)) return err('errors.tooMany')

  ensureEmailConfigured()
  const identity = await getContent('identity')
  const { name, email, subject, message } = parsed.data

  const saved = await commitThen(
    () => prisma.message.create({ data: { kind: 'CONTACT', name, email, subject, body: message, ip } }),
    (m) => [
      {
        name: 'email:message.received',
        run: async () => {
          await sendForTransition(
            'message.received',
            { to: identity.notifyEmail, locale: 'fr', data: { name, email, subject, body: message, adminUrl: adminUrl(`/admin/messages?focus=${m.id}`) } },
            translate,
          )
        },
      },
    ],
  )
  return ok({ id: saved.id })
}

export async function requestTirage(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = orderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
  const ip = clientIp(await headers())
  if (await tooMany(ip)) return err('errors.tooMany')

  const tirage = await prisma.tirage.findFirst({ where: { id: parsed.data.tirageId, status: 'AVAILABLE' }, include: { photo: true } })
  if (!tirage) return err(ERRORS.notFound)

  ensureEmailConfigured()
  const identity = await getContent('identity')
  const { name, email, message } = parsed.data
  const tirageLabel = `${tirage.photo.title || 'Photographie'} · ${tirage.format} · n° ${tirage.editionNumber}/${tirage.editionSize}`
  const subject = `Demande de tirage : ${tirageLabel}`

  const saved = await commitThen(
    () => prisma.message.create({ data: { kind: 'ORDER', name, email, subject, body: message, tirageId: tirage.id, ip } }),
    (m) => [
      {
        name: 'email:order.requested',
        run: async () => {
          await sendForTransition(
            'order.requested',
            {
              to: identity.notifyEmail,
              locale: 'fr',
              data: { name, email, body: message, tirageLabel, price: formatPrice(tirage.priceCents), adminUrl: adminUrl(`/admin/messages?focus=${m.id}`) },
            },
            translate,
          )
        },
      },
    ],
  )
  return ok({ id: saved.id })
}
