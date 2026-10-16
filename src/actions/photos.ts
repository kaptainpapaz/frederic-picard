'use server'

import { z } from 'zod'
import { requireAdmin } from '@/actions/admin-guard'
import { guard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { deleteFiles, generateVariants, isAllowedImage, newFileKey, storeOriginal } from '@/lib/media'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { revalidatePublic } from '@/lib/revalidate'
import { fieldErrors } from '@/validations/public'

const MAX_BYTES = 40 * 1024 * 1024


/**
 * Téléverse un ou plusieurs fichiers dans une série (serieId) ou hors série (null :
 * hero, atelier). Chaque fichier : original conservé, trois variantes 16:9 générées.
 */
export async function uploadPhotos(serieId: string | null, _prev: unknown, formData: FormData): Promise<ActionResult<{ ids: string[] }>> {
  return guard(async () => {
    await requireAdmin()
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    if (files.length === 0) return err(ERRORS.validation, { fields: { files: 'forms.errors.required' } })
    for (const f of files) {
      if (!isAllowedImage(f.type)) return err('errors.unsupportedFile', { fields: { files: 'errors.unsupportedFile' } })
      if (f.size > MAX_BYTES) return err('errors.fileTooLarge', { fields: { files: 'errors.fileTooLarge' } })
    }
    const last = await prisma.photo.aggregate({ where: { serieId }, _max: { order: true } })
    let order = last._max.order ?? 0
    const ids: string[] = []
    for (const f of files) {
      const fileKey = newFileKey()
      const buffer = Buffer.from(await f.arrayBuffer())
      const { width, height } = await storeOriginal(fileKey, buffer, f.type)
      await generateVariants(fileKey, 0.5, 0.5)
      order += 1
      const photo = await prisma.photo.create({
        data: { serieId, fileKey, originalWidth: width, originalHeight: height, order, title: titleFromName(f.name) },
      })
      ids.push(photo.id)
    }
    revalidatePublic()
    return ok({ ids })
  })
}

function titleFromName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 80)
}

const photoSchema = z.object({
  title: z.string().trim().max(120, 'forms.errors.tooLong'),
  place: z.string().trim().max(120, 'forms.errors.tooLong'),
  wide: z.string().optional(),
  cropX: z.coerce.number().min(0).max(1),
  cropY: z.coerce.number().min(0).max(1),
})

export async function updatePhoto(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = photoSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
    const d = parsed.data
    const before = await prisma.photo.findUnique({ where: { id } })
    if (!before) return err(ERRORS.notFound)
    await prisma.photo.update({ where: { id }, data: { title: d.title, place: d.place, wide: !!d.wide, cropX: d.cropX, cropY: d.cropY } })
    if (before.cropX !== d.cropX || before.cropY !== d.cropY) await generateVariants(before.fileKey, d.cropX, d.cropY)
    revalidatePublic()
    return ok()
  })
}

export async function deletePhoto(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const photo = await prisma.photo.findUnique({ where: { id } })
    if (!photo) return err(ERRORS.notFound)
    await prisma.photo.delete({ where: { id } })
    await deleteFiles(photo.fileKey)
    revalidatePublic()
    return ok()
  })
}

export async function movePhoto(id: string, direction: 'up' | 'down'): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const photo = await prisma.photo.findUnique({ where: { id } })
    if (!photo) return err(ERRORS.notFound)
    const all = await prisma.photo.findMany({ where: { serieId: photo.serieId }, orderBy: { order: 'asc' }, select: { id: true } })
    const i = all.findIndex((p) => p.id === id)
    const j = direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= all.length) return ok()
    ;[all[i], all[j]] = [all[j], all[i]]
    await prisma.$transaction(all.map((p, index) => prisma.photo.update({ where: { id: p.id }, data: { order: index + 1 } })))
    revalidatePublic()
    return ok()
  })
}
