/**
 * Branchement du fournisseur et registre des transitions de ce projet.
 *
 * Fournisseur : SMTP via nodemailer, ou `log` (console) hors production. Arbitrage n°6 :
 * le fournisseur est un détail de configuration.
 *
 * Règle F2 : seules les transitions dont le texte est validé sont enregistrées ici.
 * Les deux modèles ci-dessous sont des NOTIFICATIONS INTERNES à Fred (le client du site),
 * validées en atelier le 2026-10-16. Aucun email ne part vers un visiteur ou un acheteur
 * tant que Fred n'a pas validé le texte : la confirmation au demandeur est affichée à
 * l'écran, pas envoyée.
 */
import nodemailer from 'nodemailer'
import { registerTransition, setEmailProvider, type EmailProvider } from '@/lib/email'
import { prisma } from '@/lib/db'
import { setSideEffectJournal } from '@/lib/after-commit'

let configured = false

export function ensureEmailConfigured(): void {
  if (configured) return
  configured = true

  setSideEffectJournal(async (outcome) => {
    await prisma.sideEffectLog.create({
      data: {
        name: outcome.name,
        status: outcome.status,
        error: outcome.error ? String(outcome.error).slice(0, 2000) : null,
      },
    })
  })

  setEmailProvider(providerFromEnv())

  registerTransition<{ name: string; email: string; subject: string; body: string; adminUrl: string }>('message.received', {
    subjectKey: 'emails.messageReceived.subject',
    body: (d) => [
      { type: 'heading', text: `Nouveau message de ${d.name}` },
      { type: 'paragraph', text: `Sujet : ${d.subject}` },
      { type: 'paragraph', text: `De : ${d.name} <${d.email}>` },
      { type: 'paragraph', text: d.body },
      { type: 'button', text: 'Ouvrir dans l\'administration', href: d.adminUrl },
    ],
  })

  registerTransition<{
    name: string
    email: string
    body: string
    tirageLabel: string
    price: string
    adminUrl: string
  }>('order.requested', {
    subjectKey: 'emails.orderRequested.subject',
    body: (d) => [
      { type: 'heading', text: `Demande de tirage : ${d.tirageLabel}` },
      { type: 'paragraph', text: `Prix affiché : ${d.price}` },
      { type: 'paragraph', text: `De : ${d.name} <${d.email}>` },
      { type: 'paragraph', text: d.body || '(sans message)' },
      { type: 'button', text: 'Ouvrir dans l\'administration', href: d.adminUrl },
    ],
  })
}

function providerFromEnv(): EmailProvider {
  const kind = process.env.EMAIL_PROVIDER ?? 'log'
  const from = process.env.EMAIL_FROM ?? 'site@localhost'
  if (kind === 'smtp') {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    })
    return {
      name: 'smtp',
      async send(m) {
        await transport.sendMail({ from, to: m.to, subject: m.subject, html: m.html, text: m.text })
      },
    }
  }
  return {
    name: 'log',
    async send(m) {
      console.info(`[email:log] to=${m.to} subject=${m.subject}\n${m.text}`)
    },
  }
}
