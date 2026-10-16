'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { sendContact } from '@/actions/public'
import type { ActionResult } from '@/lib/result'

/**
 * Formulaire de contact. Arbitrage ouvert du socle : jamais de onSubmit, le bouton
 * déclenche l'action par onClick (dette standalone / onSubmit, voir CLAUDE.md).
 * Règle H2 : état de chargement visible, bouton désactivé pendant l'envoi.
 */
export function ContactForm({ subjects }: { subjects: string[] }) {
  const t = useTranslations()
  const form = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult<{ id: string }> | null>(null)
  const fields = result && !result.success ? (result.error.fields ?? {}) : {}

  const submit = () => {
    if (!form.current) return
    const data = new FormData(form.current)
    start(async () => {
      const r = await sendContact(null, data)
      setResult(r)
      if (r.success) form.current?.reset()
    })
  }

  if (result?.success) {
    return (
      <p className="font-display text-2xl" role="status">
        {t('contact.sent')}
      </p>
    )
  }

  return (
    <form ref={form} className="grid gap-5" noValidate>
      <Field label={t('forms.name')} error={fields.name}>
        <input id="c-name" name="name" type="text" className="field" autoComplete="name" aria-invalid={!!fields.name} />
      </Field>
      <Field label={t('forms.email')} error={fields.email}>
        <input id="c-email" name="email" type="email" className="field" autoComplete="email" aria-invalid={!!fields.email} />
      </Field>
      <Field label={t('forms.subject')} error={fields.subject}>
        <select id="c-subject" name="subject" className="field" defaultValue={subjects[0]}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('forms.message')} error={fields.message}>
        <textarea id="c-message" name="message" className="field min-h-[120px]" aria-invalid={!!fields.message} />
      </Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {result && !result.success && !result.error.fields ? <p className="text-sm text-destructive">{t(result.error.key)}</p> : null}
      <button type="button" className="btn justify-self-start" onClick={submit} disabled={pending} aria-busy={pending}>
        {pending ? t('forms.sending') : t('forms.send')}
      </button>
    </form>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const t = useTranslations()
  return (
    <label className="grid gap-1.5 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
      {label}
      {children}
      {error ? <span className="text-xs tracking-normal text-destructive normal-case">{t(error)}</span> : null}
    </label>
  )
}
