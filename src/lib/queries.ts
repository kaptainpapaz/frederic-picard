/**
 * Lectures du site public. Toutes passent par ici pour que les pages restent
 * des composants serveur simples, rendus à la demande puis mis en cache (ISR, règle B1).
 */
import { prisma } from '@/lib/db'

export const PUBLIC_SERIE_STATUS = ['PUBLISHED', 'ONGOING'] as const

export function publishedSeries() {
  return prisma.serie.findMany({
    where: { status: { in: [...PUBLIC_SERIE_STATUS] } },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: { photos: { orderBy: { order: 'asc' }, include: { tirages: { where: { status: 'AVAILABLE' }, select: { id: true } } } } },
  })
}

export function serieBySlug(slug: string) {
  return prisma.serie.findFirst({
    where: { slug, status: { in: [...PUBLIC_SERIE_STATUS] } },
    include: { photos: { orderBy: { order: 'asc' }, include: { tirages: { where: { status: 'AVAILABLE' }, select: { id: true } } } } },
  })
}

export function featuredSerie() {
  return prisma.serie.findFirst({
    where: { featured: true, status: { in: [...PUBLIC_SERIE_STATUS] } },
    include: { photos: { orderBy: { order: 'asc' } } },
  })
}

/** Tirages visibles en boutique : disponibles ou vendus (un vendu reste visible, règle d'atelier). */
export function shopTirages() {
  return prisma.tirage.findMany({
    where: { status: { in: ['AVAILABLE', 'RESERVED', 'SOLD'] }, photo: { serie: { status: { in: [...PUBLIC_SERIE_STATUS] } } } },
    orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
    include: { photo: { include: { serie: { select: { id: true, slug: true, title: true } } } } },
  })
}

export function availableTirage(id: string) {
  return prisma.tirage.findFirst({ where: { id, status: 'AVAILABLE' }, include: { photo: true } })
}

export function photoById(id: string | null) {
  if (!id) return Promise.resolve(null)
  return prisma.photo.findUnique({ where: { id } })
}

/** Couverture d'une série : la photo désignée, sinon la première. */
export function coverOf<T extends { coverPhotoId: string | null; photos: { id: string }[] }>(serie: T): T['photos'][number] | null {
  return serie.photos.find((p) => p.id === serie.coverPhotoId) ?? serie.photos[0] ?? null
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100)
}
