'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/actions/admin-guard'
import { guard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { revalidatePublic } from '@/lib/revalidate'
import { fieldErrors } from '@/validations/public'

const tirageSchema = z.object({
  photoId: z.string().min(1, 'forms.errors.required'),
  format: z.string().trim().min(1, 'forms.errors.required').max(60, 'forms.errors.tooLong'),
  paper: z.string().trim().max(160, 'forms.errors.tooLong'),
  editionSize: z.coerce.number().int().min(1, 'forms.errors.required').max(1000),
  editionNumber: z.coerce.number().int().min(1, 'forms.errors.required').max(1000),
  price: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, 'forms.errors.required')
    .transform((v) => Math.round(Number(v.replace(',', '.')) * 100)),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN']),
  note: z.string().trim().max(200, 'forms.errors.tooLong'),
})


export async function createTirage(_prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = tirageSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
    const d = parsed.data
    const last = await prisma.tirage.aggregate({ _max: { order: true } })
    await prisma.tirage.create({
      data: { photoId: d.photoId, format: d.format, paper: d.paper, editionSize: d.editionSize, editionNumber: d.editionNumber, priceCents: d.price, status: d.status, note: d.note, order: (last._max.order ?? 0) + 1 },
    })
    revalidatePublic()
    redirect('/admin/tirages')
  })
}

export async function updateTirage(id: string, _prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = tirageSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return err(ERRORS.validation, { fields: fieldErrors(parsed.error) })
    const d = parsed.data
    await prisma.tirage.update({
      where: { id },
      data: { photoId: d.photoId, format: d.format, paper: d.paper, editionSize: d.editionSize, editionNumber: d.editionNumber, priceCents: d.price, status: d.status, note: d.note },
    })
    revalidatePublic()
    return ok()
  })
}

export async function deleteTirage(id: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    await prisma.tirage.delete({ where: { id } })
    revalidatePublic()
    redirect('/admin/tirages')
  })
}
