'use server'

import { z } from 'zod'
import { requireAdmin } from '@/actions/admin-guard'
import { guard } from '@/lib/action-guard'
import { CONTENT, DEFAULTS, setContent, type ContentKey } from '@/lib/content'
import { prisma } from '@/lib/db'
import { ERRORS, err, ok, type ActionResult } from '@/lib/result'
import { revalidatePublic } from '@/lib/revalidate'


const str = (fd: FormData, key: string) => String(fd.get(key) ?? '')

/** Lit les champs d'un formulaire et reconstruit l'objet de contenu de la clé donnée. */
function fromForm(key: ContentKey, fd: FormData): unknown {
  switch (key) {
    case 'identity':
      return Object.fromEntries(Object.keys(DEFAULTS.identity).map((k) => [k, str(fd, k)]))
    case 'home':
      return {
        heroPhotoId: str(fd, 'heroPhotoId') || null,
        heroFocusX: str(fd, 'heroFocusX') || 0.5,
        heroFocusY: str(fd, 'heroFocusY') || 0.5,
        heroText: str(fd, 'heroText'),
        heroCta: str(fd, 'heroCta'),
        introStrong: str(fd, 'introStrong'),
        introBody: str(fd, 'introBody'),
        atelierPhotoId: str(fd, 'atelierPhotoId') || null,
        atelierCaption: str(fd, 'atelierCaption'),
        printsTitle: str(fd, 'printsTitle'),
        printsText: str(fd, 'printsText'),
        values: [0, 1, 2]
          .map((i) => ({ mark: str(fd, `values.${i}.mark`), title: str(fd, `values.${i}.title`), text: str(fd, `values.${i}.text`) }))
          .filter((v) => v.title || v.text),
        inviteTitle: str(fd, 'inviteTitle'),
        inviteText: str(fd, 'inviteText'),
      }
    case 'contact':
      return {
        title: str(fd, 'title'),
        text: str(fd, 'text'),
        subjects: str(fd, 'subjects')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    case 'shop':
      return { lead: str(fd, 'lead'), orderNote: str(fd, 'orderNote') }
    case 'legal':
      return { mentions: str(fd, 'mentions'), cgv: str(fd, 'cgv'), privacy: str(fd, 'privacy') }
  }
}

export async function saveContent(key: ContentKey, _prev: unknown, formData: FormData): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin('settings.site.write')
    const parsed = CONTENT[key].safeParse(fromForm(key, formData))
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) fields[String(issue.path.join('.'))] = 'forms.errors.tooLong'
      return err(ERRORS.validation, { fields })
    }
    await setContent(key, parsed.data as z.infer<(typeof CONTENT)[typeof key]>)
    revalidatePublic()
    return ok()
  })
}

const statusSchema = z.enum(['NEW', 'ANSWERED', 'ARCHIVED'])

export async function setMessageStatus(id: string, status: string): Promise<ActionResult<void>> {
  return guard(async () => {
    await requireAdmin()
    const parsed = statusSchema.safeParse(status)
    if (!parsed.success) return err(ERRORS.validation)
    await prisma.message.update({ where: { id }, data: { status: parsed.data } })
    return ok()
  })
}
