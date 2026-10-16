'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { ActionResult } from '@/lib/result'

type Action = (prev: unknown, formData: FormData) => Promise<ActionResult<unknown>>

/**
 * Formulaire d'administration. Le bouton déclenche l'action par onClick, jamais par
 * onSubmit (arbitrage ouvert du socle, standalone / onSubmit). Règle H2 : état de
 * chargement visible. Après succès : message, rafraîchissement des données serveur,
 * redirection optionnelle.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  redirectTo,
  className = 'grid gap-5',
  extra,
}: {
  action: Action
  children: ReactNode
  submitLabel?: string
  redirectTo?: string
  className?: string
  /** Boutons additionnels, à gauche du bouton principal (ex. supprimer). */
  extra?: ReactNode
}) {
  const t = useTranslations('admin.common')
  const te = useTranslations()
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult<unknown> | null>(null)
  const fields = result && !result.success ? (result.error.fields ?? {}) : {}

  const submit = () => {
    if (!form.current) return
    const data = new FormData(form.current)
    start(async () => {
      const r = await action(null, data)
      setResult(r)
      if (r.success) {
        if (redirectTo) router.push(redirectTo)
        router.refresh()
      }
    })
  }

  return (
    <form ref={form} className={className} noValidate>
      <FieldErrorsContext.Provider value={fields}>{children}</FieldErrorsContext.Provider>
      <div className="sticky bottom-0 z-(--z-sticky) mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {result && !result.success && !result.error.fields ? <span className="mr-auto text-sm text-destructive">{te(result.error.key)}</span> : null}
        {result && !result.success && result.error.fields ? <span className="mr-auto text-sm text-destructive">{te('errors.validation')}</span> : null}
        {result?.success ? (
          <span className="mr-auto text-sm text-success" role="status">
            {t('saved')}
          </span>
        ) : null}
        {extra}
        <button type="button" className="btn" onClick={submit} disabled={pending} aria-busy={pending}>
          {pending ? t('saving') : (submitLabel ?? t('save'))}
        </button>
      </div>
    </form>
  )
}

const FieldErrorsContext = createContext<Record<string, string>>({})

/** Libellé + champ + erreur (clé de traduction résolue ici). */
export function Field({ label, name, hint, children, className }: { label: string; name: string; hint?: string; children: ReactNode; className?: string }) {
  const errors = useContext(FieldErrorsContext)
  const t = useTranslations()
  const error = errors[name]
  return (
    <label className={`grid gap-1.5 text-[10px] tracking-[0.16em] text-muted-foreground uppercase ${className ?? ''}`}>
      {label}
      {children}
      {hint && !error ? <span className="text-xs tracking-normal normal-case">{hint}</span> : null}
      {error ? <span className="text-xs tracking-normal text-destructive normal-case">{t(error)}</span> : null}
    </label>
  )
}

/** Bouton qui déclenche une action sans formulaire (statut, ordre, suppression). */
export function ActionButton({
  action,
  label,
  confirmLabel,
  className = 'btn btn-secondary btn-sm',
  redirectTo,
}: {
  action: () => Promise<ActionResult<unknown>>
  label: string
  /** Si présent, un premier clic arme le bouton, le second exécute. */
  confirmLabel?: string
  className?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const te = useTranslations()
  const [pending, start] = useTransition()
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    if (confirmLabel && !armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 4000)
      return
    }
    start(async () => {
      const r = await action()
      if (!r.success) setError(r.error.key)
      else {
        if (redirectTo) router.push(redirectTo)
        router.refresh()
      }
      setArmed(false)
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={`${className} ${armed ? 'btn-danger' : ''}`} onClick={run} disabled={pending} aria-busy={pending}>
        {armed ? confirmLabel : label}
      </button>
      {error ? <span className="text-xs text-destructive">{te(error)}</span> : null}
    </span>
  )
}
