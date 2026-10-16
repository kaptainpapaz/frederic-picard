'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { requestTirage } from '@/actions/public'
import { Field } from '@/components/site/ContactForm'
import { srcSet, variantUrl } from '@/lib/media-urls'
import type { ActionResult } from '@/lib/result'

export type TirageCard = {
  id: string
  title: string
  serie: string
  fileKey: string
  format: string
  paper: string
  edition: string
  price: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD'
  note: string
}

/**
 * Boutique : grille des tirages et panneau de demande (un tirage = une demande par email).
 * Pas de panier, pas de paiement : décision du 2026-10-16.
 */
export function TirageGrid({ items, series, orderNote }: { items: TirageCard[]; series: string[]; orderNote: string }) {
  const t = useTranslations('shop')
  const [filter, setFilter] = useState<string>('all')
  const [open, setOpen] = useState<TirageCard | null>(null)
  const shown = items.filter((i) => filter === 'all' || i.serie === filter)

  return (
    <>
      {series.length > 1 ? (
        <div className="flex flex-wrap gap-2.5 pb-8">
          {[['all', t('all')], ...series.map((s) => [s, s])].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`border px-3.5 py-1.5 text-xs tracking-[0.08em] ${filter === key ? 'border-foreground text-foreground' : 'border-border text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length === 0 ? <p className="py-12 text-muted-foreground">{t('empty')}</p> : null}

      <div className="grid gap-x-8 gap-y-10 pb-24 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => item.status === 'AVAILABLE' && setOpen(item)}
            className="grid gap-2.5 text-left disabled:cursor-default"
            disabled={item.status !== 'AVAILABLE'}
          >
            <div className="frame">
              <img src={variantUrl(item.fileKey, 1280)} srcSet={srcSet(item.fileKey)} sizes="(max-width: 768px) 100vw, 33vw" alt={item.title} loading="lazy" />
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-2xl">{item.title}</h3>
              <span className="whitespace-nowrap">{item.price}</span>
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
              <span>{item.serie}</span>
              <span>{item.format}</span>
              <span>{item.edition}</span>
              <span className={`text-[10px] tracking-[0.14em] uppercase ${item.status === 'AVAILABLE' ? 'text-accent' : 'text-destructive'}`}>
                {t(`status.${item.status}`)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {open ? <OrderPanel item={open} orderNote={orderNote} onClose={() => setOpen(null)} /> : null}
    </>
  )
}

function OrderPanel({ item, orderNote, onClose }: { item: TirageCard; orderNote: string; onClose: () => void }) {
  const t = useTranslations()
  const form = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult<{ id: string }> | null>(null)
  const fields = result && !result.success ? (result.error.fields ?? {}) : {}

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const submit = () => {
    if (!form.current) return
    const data = new FormData(form.current)
    start(async () => setResult(await requestTirage(null, data)))
  }

  return (
    <div className="fixed inset-0 z-(--z-modal) flex justify-end bg-black/35" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="flex h-full w-full max-w-[460px] flex-col gap-5 overflow-y-auto bg-background p-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-foreground">
        <button type="button" className="self-end text-xs tracking-[0.1em] text-muted-foreground" onClick={onClose}>
          {t('shop.close')} ×
        </button>
        <div className="frame">
          <img src={variantUrl(item.fileKey, 1280)} srcSet={srcSet(item.fileKey)} sizes="460px" alt={item.title} />
        </div>
        <h4 id="order-title" className="font-display text-3xl leading-none">
          {item.title}
        </h4>
        <div className="grid gap-1 text-sm text-muted-foreground">
          <span>{item.serie}</span>
          <span>
            {item.format} · {item.edition}
          </span>
          {item.paper ? <span>{item.paper}</span> : null}
          {item.note ? <span>{item.note}</span> : null}
          <span className="text-base text-foreground">{item.price}</span>
        </div>

        {result?.success ? (
          <p className="font-display text-2xl" role="status">
            {t('shop.requested')}
          </p>
        ) : (
          <form ref={form} className="grid gap-4" noValidate>
            <input type="hidden" name="tirageId" value={item.id} />
            <Field label={t('forms.name')} error={fields.name}>
              <input id="o-name" name="name" type="text" className="field" autoComplete="name" aria-invalid={!!fields.name} />
            </Field>
            <Field label={t('forms.email')} error={fields.email}>
              <input id="o-email" name="email" type="email" className="field" autoComplete="email" aria-invalid={!!fields.email} />
            </Field>
            <Field label={t('forms.messageOptional')} error={fields.message}>
              <textarea id="o-message" name="message" className="field min-h-[80px]" />
            </Field>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {result && !result.success && !result.error.fields ? <p className="text-sm text-destructive">{t(result.error.key)}</p> : null}
            <button type="button" className="btn" onClick={submit} disabled={pending} aria-busy={pending}>
              {pending ? t('forms.sending') : t('shop.request')}
            </button>
            <p className="text-xs text-muted-foreground">{orderNote}</p>
          </form>
        )}
      </div>
    </div>
  )
}
