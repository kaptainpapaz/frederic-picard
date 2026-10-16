import { getTranslations } from 'next-intl/server'
import { Field } from '@/components/admin/ActionForm'
import { Card } from '@/components/admin/PageHeader'
import { prisma } from '@/lib/db'
import { variantUrl } from '@/lib/media-urls'

type TirageValues = {
  photoId: string
  format: string
  paper: string
  editionSize: number
  editionNumber: number
  priceCents: number
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'HIDDEN'
  note: string
}

const FORMATS = ['40 × 22,5 cm', '60 × 33,75 cm', '90 × 50,6 cm']

export async function TirageFields({ values }: { values: TirageValues }) {
  const t = await getTranslations('admin.prints')
  const photos = await prisma.photo.findMany({ where: { serieId: { not: null } }, orderBy: [{ serie: { order: 'asc' } }, { order: 'asc' }], include: { serie: { select: { title: true } } } })
  const current = photos.find((p) => p.id === values.photoId) ?? photos[0]
  const known = FORMATS.includes(values.format) || !values.format

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card title={t('fields.photo')}>
        {photos.length === 0 ? <span className="text-sm text-muted-foreground">{t('noPhotos')}</span> : null}
        <Field label={t('fields.photo')} name="photoId">
          <select id="t-photo" name="photoId" defaultValue={current?.id ?? ''} className="field">
            {photos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.serie?.title} · {p.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="frame">{current ? <img src={variantUrl(current.fileKey, 1280)} alt="" /> : null}</div>
      </Card>
      <Card>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('fields.format')} name="format">
            <input id="t-format" name="format" list="formats" defaultValue={values.format || FORMATS[0]} className="field" />
            <datalist id="formats">
              {FORMATS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
          <Field label={t('fields.price')} name="price">
            <input id="t-price" name="price" inputMode="decimal" defaultValue={values.priceCents ? (values.priceCents / 100).toString().replace('.', ',') : ''} className="field" />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('fields.editionSize')} name="editionSize">
            <input id="t-size" name="editionSize" type="number" min={1} defaultValue={values.editionSize || 12} className="field" />
          </Field>
          <Field label={t('fields.editionNumber')} name="editionNumber">
            <input id="t-number" name="editionNumber" type="number" min={1} defaultValue={values.editionNumber || 1} className="field" />
          </Field>
        </div>
        <Field label={t('fields.paper')} name="paper">
          <input id="t-paper" name="paper" defaultValue={values.paper} className="field" />
        </Field>
        <Field label={t('fields.status')} name="status">
          <select id="t-status" name="status" defaultValue={values.status} className="field">
            {(['AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('fields.note')} name="note">
          <input id="t-note" name="note" defaultValue={values.note} className="field" />
        </Field>
        {!known ? null : null}
      </Card>
    </div>
  )
}
