'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Lightbox } from '@/components/site/Lightbox'
import { Picture } from '@/components/site/Picture'

export type GalleryPhoto = { id: string; fileKey: string; title: string; place: string; wide: boolean; hasPrint: boolean }

/** Grille des photos d'une série ; un clic ouvre la photo en plein écran (Lightbox). */
export function SerieGallery({ photos }: { photos: GalleryPhoto[] }) {
  const t = useTranslations('serie')
  const [open, setOpen] = useState<number | null>(null)

  return (
    <>
      <section className="mx-auto grid max-w-[1360px] gap-x-8 gap-y-12 px-6 pt-2 pb-24 md:grid-cols-2">
        {photos.map((p, i) => (
          <figure key={p.id} className={`m-0 ${p.wide ? 'md:col-span-2' : ''}`}>
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in text-left" aria-label={t('open', { title: p.title })}>
              <Picture fileKey={p.fileKey} alt={p.title} sizes={p.wide ? '(max-width: 1360px) 100vw, 1360px' : '(max-width: 768px) 100vw, 50vw'} />
            </button>
            <figcaption className="mt-2.5 flex justify-between gap-3 text-xs tracking-[0.04em] text-muted-foreground">
              <b className="font-normal text-foreground">{p.title}</b>
              <span>
                {p.place}
                {p.hasPrint ? (
                  <>
                    {p.place ? ' · ' : ''}
                    <Link href="/tirages" className="text-accent">
                      {t('printAvailable')}
                    </Link>
                  </>
                ) : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </section>

      {open !== null ? (
        <Lightbox items={photos.map((p) => ({ fileKey: p.fileKey, title: p.title, caption: p.place || undefined }))} index={open} onClose={() => setOpen(null)} onChange={setOpen} />
      ) : null}
    </>
  )
}
