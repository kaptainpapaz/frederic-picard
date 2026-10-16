'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/actions/admin-guard'
import { guard, slugify } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { deleteFiles } from '@/lib/media'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { revalidatePublic } from '@/lib/revalidate'
import { fieldErrors } from '@/validations/public'

const serieSchema = z.object({
  title: z.string().trim().min(1, 'forms.errors.required').max(120, 'forms.errors.tooLong'),
  slug: z
    .string()
    .trim()
    .max(80, 'forms.errors.tooLong')
    .regex(/^[a-z0-9-]*$/, 'forms.errors.required'),
  year: z.string().trim().regex(/^\d{0,4}$/, 'forms.errors.required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ONGOING']),
  intro: z.string().trim().max(1000, 'forms.errors.tooLong'),
  featured: z.string().optional(),
  coverPhotoId: z.string().optional(),
})



export async function createSerie(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = serieSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
    const d = parsed.data
    const slug = d.slug || slugify(d.title) || `serie-${Date.now().toString(36)}`
    if (await prisma.serie.findUnique({ where: { slug } })) return err('errors.slugTaken', { fields: { slug: 'errors.slugTaken' } })
    const last = await prisma.serie.aggregate({ _max: { order: true } })
    const serie = await prisma.$transaction(async (tx) => {
      if (d.featured) await tx.serie.updateMany({ data: { featured: false } })
      return tx.serie.create({
        data: { title: d.title, slug, year: d.year ? Number(d.year) : null, status: d.status, intro: d.intro, featured: !!d.featured, order: (last._max.order ?? 0) + 1 },
      })
    })
    revalidatePublic()
    redirect(`/admin/series/${serie.id}`)
  })
}

export async function updateSerie(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = serieSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
    const d = parsed.data
    const slug = d.slug || slugify(d.title)
    const clash = await prisma.serie.findFirst({ where: { slug, NOT: { id } } })
    if (clash) return err('errors.slugTaken', { fields: { slug: 'errors.slugTaken' } })
    await prisma.$transaction(async (tx) => {
      if (d.featured) await tx.serie.updateMany({ where: { NOT: { id } }, data: { featured: false } })
      await tx.serie.update({
        where: { id },
        data: { title: d.title, slug, year: d.year ? Number(d.year) : null, status: d.status, intro: d.intro, featured: !!d.featured, coverPhotoId: d.coverPhotoId || null },
      })
    })
    revalidatePublic()
    return ok()
  })
}

export async function deleteSerie(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const photos = await prisma.photo.findMany({ where: { serieId: id }, select: { fileKey: true } })
    await prisma.serie.delete({ where: { id } })
    await Promise.all(photos.map((p) => deleteFiles(p.fileKey)))
    revalidatePublic()
    redirect('/admin/series')
  })
}

export async function moveSerie(id: string, direction: 'up' | 'down'): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const all = await prisma.serie.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }], select: { id: true } })
    const i = all.findIndex((s) => s.id === id)
    const j = direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= all.length) return ok()
    ;[all[i], all[j]] = [all[j], all[i]]
    await prisma.$transaction(all.map((s, index) => prisma.serie.update({ where: { id: s.id }, data: { order: index + 1 } })))
    revalidatePublic()
    return ok()
  })
}
