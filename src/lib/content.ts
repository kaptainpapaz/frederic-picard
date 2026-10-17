/**
 * Contenu éditable des pages fixes et informations du site.
 *
 * Stocké en JSON dans SiteContent (une ligne par clé), validé par Zod à l'écriture
 * comme à la lecture. Les valeurs par défaut ci-dessous sont celles posées par le seed :
 * ce sont des TEXTES PROVISOIRES à remplacer par Fred dans l'admin (questionnaire du 16/10).
 *
 * Règle H3 : ces textes sont du contenu client, pas des libellés d'interface ; ils ne
 * passent donc pas par les dictionnaires next-intl.
 */
import { z } from 'zod'
import { prisma } from '@/lib/db'

export const identitySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(80),
  city: z.string().trim().max(120),
  email: z.string().trim().email(),
  notifyEmail: z.string().trim().email(),
  phone: z.string().trim().max(40),
  instagram: z.string().trim().max(120),
  replyDelay: z.string().trim().max(80),
  shippingDelay: z.string().trim().max(80),
  shippingZones: z.string().trim().max(120),
  shippingFees: z.string().trim().max(120),
})
export type Identity = z.infer<typeof identitySchema>

export const homeSchema = z.object({
  heroPhotoId: z.string().nullable(),
  /** Point d'intérêt du hero (0 à 1), appliqué en object-position : décide ce qui reste visible quand l'écran coupe la photo (mobile). */
  heroFocusX: z.coerce.number().min(0).max(1).default(0.5),
  heroFocusY: z.coerce.number().min(0).max(1).default(0.5),
  heroText: z.string().trim().max(300),
  heroCta: z.string().trim().max(60),
  introStrong: z.string().trim().max(600),
  introBody: z.string().trim().max(2000),
  atelierPhotoId: z.string().nullable(),
  atelierCaption: z.string().trim().max(160),
  printsTitle: z.string().trim().max(120),
  printsText: z.string().trim().max(400),
  values: z
    .array(z.object({ mark: z.string().trim().max(20), title: z.string().trim().max(60), text: z.string().trim().max(300) }))
    .max(3),
  inviteTitle: z.string().trim().max(120),
  inviteText: z.string().trim().max(400),
})
export type HomeContent = z.infer<typeof homeSchema>

export const contactSchema = z.object({
  title: z.string().trim().max(80),
  text: z.string().trim().max(600),
  subjects: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
})
export type ContactContent = z.infer<typeof contactSchema>

export const shopSchema = z.object({
  lead: z.string().trim().max(600),
  orderNote: z.string().trim().max(400),
})
export type ShopContent = z.infer<typeof shopSchema>

export const legalSchema = z.object({
  mentions: z.string().trim().max(20000),
  cgv: z.string().trim().max(20000),
  privacy: z.string().trim().max(20000),
})
export type LegalContent = z.infer<typeof legalSchema>

export const CONTENT = {
  identity: identitySchema,
  home: homeSchema,
  contact: contactSchema,
  shop: shopSchema,
  legal: legalSchema,
} as const
export type ContentKey = keyof typeof CONTENT

export const DEFAULTS: { [K in ContentKey]: z.infer<(typeof CONTENT)[K]> } = {
  identity: {
    displayName: 'Frédéric Picard',
    tagline: 'Photographe',
    city: 'Paris · sur rendez-vous',
    email: 'contact@exemple.fr',
    notifyEmail: 'contact@exemple.fr',
    phone: '',
    instagram: '',
    replyDelay: 'sous deux jours',
    shippingDelay: 'sous 5 jours',
    shippingZones: 'France et Europe',
    shippingFees: 'à préciser',
  },
  home: {
    heroPhotoId: null,
    heroFocusX: 0.5,
    heroFocusY: 0.5,
    heroText:
      'Frédéric Picard photographie ce qui se passe quand on ne pose pas. Séries au long cours, tirages signés et numérotés.',
    heroCta: 'Découvrir les séries',
    introStrong:
      "Je photographie de dos, de loin, à l'heure où la lumière tombe. Les gens n'ont rien à faire : ils regardent la mer, ils marchent, ils courent. C'est ce moment-là que je garde.",
    introBody:
      "Photographe installé à Paris, je travaille par séries : un lieu, des personnes, plusieurs saisons. Chaque série se construit sur le temps long et se referme quand elle a dit ce qu'elle avait à dire.\n\nLes images sont tirées en petit nombre, sur papier baryté. Elles arrivent signées, numérotées, prêtes à encadrer.",
    atelierPhotoId: null,
    atelierCaption: "L'atelier",
    printsTitle: 'Une sélection imprimée, prête à partir.',
    printsText: 'Les photographies déjà tirées, signées et numérotées. Chaque demande se règle par un simple échange de mails.',
    values: [
      { mark: '16 : 9', title: 'Un seul format', text: 'Toutes les photographies sont cadrées en 16:9, à la prise de vue. Les tirages gardent ce rapport.' },
      { mark: '8 · 12', title: 'Éditions courtes', text: 'Huit ou douze exemplaires par image, jamais plus. Le numéro est inscrit au dos avec la signature.' },
      { mark: 'Baryté', title: 'Papier', text: 'Tirage pigmentaire sur papier baryté. Un rendu profond, stable, fait pour durer.' },
    ],
    inviteTitle: 'Une image vous retient ? Parlons-en.',
    inviteText: "Un format particulier, une photographie absente de la boutique, une séance ou une exposition : écrivez-moi.",
  },
  contact: {
    title: 'Écrivez-moi.',
    text: "Pour un tirage dans un autre format, une photographie qui n'est pas en boutique, une séance ou une exposition.",
    subjects: ['Un tirage', 'Une séance', 'Une exposition', 'Autre'],
  },
  shop: {
    lead: "Tirages déjà réalisés, signés et numérotés. Pour un autre format ou une autre photographie, écrivez-moi.",
    orderNote: 'Votre demande me parvient par email ; je vous réponds avec les modalités de paiement et d\'envoi.',
  },
  legal: { mentions: '', cgv: '', privacy: '' },
}

export async function getContent<K extends ContentKey>(key: K): Promise<z.infer<(typeof CONTENT)[K]>> {
  const row = await prisma.siteContent.findUnique({ where: { key } })
  const schema = CONTENT[key]
  if (!row) return DEFAULTS[key]
  const parsed = schema.safeParse(row.value)
  // Une valeur invalide en base (schéma qui a évolué) retombe sur les défauts, sans casser le site.
  return parsed.success ? (parsed.data as z.infer<(typeof CONTENT)[K]>) : DEFAULTS[key]
}

export async function setContent<K extends ContentKey>(key: K, value: z.infer<(typeof CONTENT)[K]>): Promise<void> {
  const data = CONTENT[key].parse(value)
  await prisma.siteContent.upsert({ where: { key }, update: { value: data }, create: { key, value: data } })
}
