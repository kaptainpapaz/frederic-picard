/**
 * Couche email agnostique du fournisseur.
 *
 * Arbitrage n°6 : le fournisseur est le mauvais niveau de decision. Le parc a utilise
 * Brevo, Resend et Nodemailer, et le SMTP du client s'imposera regulierement (cas
 * ostraveiro). Ce qui se fige, c'est la discipline, pas le prestataire.
 *
 * Trois regles sont encodees ici, chacune issue d'une panne reelle :
 *
 *   F2 — On n'envoie automatiquement que des textes valides par le client.
 *        Le registre n'associe une transition a un modele QUE si le texte existe.
 *        En son absence, l'etat change quand meme, une note est journalisee, et
 *        l'interface previent que le destinataire ne sera pas averti.
 *        Pas de modele provisoire : un texte incomplet finit toujours par partir.
 *
 *   F3 — HTML et texte se produisent d'une meme source, sinon ils divergent.
 *
 *   H3 — Tout texte vu par un utilisateur passe par la couche de traduction.
 */

import type { Locale } from '@/i18n/routing'

export type EmailProvider = {
  name: string
  send(message: RenderedEmail): Promise<void>
}

export type RenderedEmail = {
  to: string
  subject: string
  html: string
  /** Regle F3 : produit de la meme source que le HTML, jamais ecrit separement. */
  text: string
}

export type EmailTemplate<P = Record<string, unknown>> = {
  /** Cle de traduction du sujet. */
  subjectKey: string
  /** Produit le corps. Le rendu HTML et texte derive de ce meme retour. Regle F3. */
  body: (params: P, locale: Locale) => EmailBlock[]
}

export type EmailBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'button'; text: string; href: string }
  | { type: 'list'; items: string[] }

/* ------------------------------------------------------------------ */
/* Registre transition -> modele                                       */
/* ------------------------------------------------------------------ */

/**
 * Regle F2. Une transition ABSENTE de ce registre ne declenche aucun envoi,
 * et ce n'est PAS un bug : c'est le comportement voulu tant que le client n'a pas
 * valide le texte. Ne jamais ajouter un modele « provisoire » pour combler un trou.
 */
const registry = new Map<string, EmailTemplate<never>>()

export function registerTransition<P>(transition: string, template: EmailTemplate<P>): void {
  registry.set(transition, template as EmailTemplate<never>)
}

export type TransitionOutcome =
  | { notified: true }
  /** L'etat a change, personne n'a ete prevenu. L'interface DOIT le signaler. */
  | { notified: false; reason: 'no-validated-template' }

export function hasValidatedTemplate(transition: string): boolean {
  return registry.has(transition)
}

/* ------------------------------------------------------------------ */
/* Envoi                                                               */
/* ------------------------------------------------------------------ */

let provider: EmailProvider | null = null

export function setEmailProvider(p: EmailProvider): void {
  provider = p
}

/**
 * A appeler UNIQUEMENT depuis commitThen (voir lib/after-commit.ts).
 * Jamais dans la meme transaction qu'un changement d'etat. Regle F1.
 */
export async function sendForTransition<P>(
  transition: string,
  params: { to: string; locale: Locale; data: P },
  translate: (key: string, values?: Record<string, unknown>) => string,
): Promise<TransitionOutcome> {
  const template = registry.get(transition)
  if (!template) return { notified: false, reason: 'no-validated-template' }
  if (!provider) throw new Error('Aucun fournisseur email configure.')

  const blocks = (template.body as (p: P, l: Locale) => EmailBlock[])(
    params.data,
    params.locale,
  )

  await provider.send({
    to: params.to,
    subject: translate(template.subjectKey),
    html: renderHtml(blocks),
    text: renderText(blocks),
  })

  return { notified: true }
}

/* ------------------------------------------------------------------ */
/* Rendu : une source, deux sorties. Regle F3.                         */
/* ------------------------------------------------------------------ */

export function renderHtml(blocks: readonly EmailBlock[]): string {
  const body = blocks.map(renderHtmlBlock).join('\n')
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:24px">\n${body}\n</body></html>`
}

export function renderText(blocks: readonly EmailBlock[]): string {
  return blocks.map(renderTextBlock).join('\n\n').trim()
}

function renderHtmlBlock(block: EmailBlock): string {
  switch (block.type) {
    case 'heading':
      return `<h2>${escapeHtml(block.text)}</h2>`
    case 'paragraph':
      return `<p>${escapeHtml(block.text)}</p>`
    case 'button':
      return `<p><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(block.text)}</a></p>`
    case 'list':
      return `<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
  }
}

function renderTextBlock(block: EmailBlock): string {
  switch (block.type) {
    case 'heading':
      // Le texte est repris VERBATIM, jamais transforme (pas de mise en capitales).
      // L'invariant teste est litteral : toute chaine de la source apparait telle quelle
      // dans les deux sorties. Une transformation cosmetique le briserait et rouvrirait
      // la porte a la divergence que la regle F3 ferme.
      return `${block.text}\n${'-'.repeat(block.text.length)}`
    case 'paragraph':
      return block.text
    case 'button':
      return `${block.text} : ${block.href}`
    case 'list':
      return block.items.map((i) => `- ${i}`).join('\n')
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
