'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { srcSet, variantUrl } from '@/lib/media-urls'

export type LightboxItem = { fileKey: string; title: string; caption?: string }

/**
 * Photo en plein écran avec navigation : flèches à l'écran, flèches du clavier, balayage
 * au doigt, Échap ou clic hors de l'image pour fermer. Demande de Flo du 2026-10-17
 * (lot 8), pour les séries et la boutique.
 *
 * Le composant ne garde aucun état : l'index vit chez le parent, qui décide quoi afficher
 * sous la photo (`children`, par exemple le bouton de demande d'un tirage).
 * Les voisins sont préchargés pour que les flèches répondent sans attente.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onChange,
  children,
}: {
  items: LightboxItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
  children?: ReactNode
}) {
  const t = useTranslations('lightbox')
  const touchX = useRef<number | null>(null)
  const count = items.length
  const item = items[index]
  const prev = useCallback(() => onChange((index - 1 + count) % count), [index, count, onChange])
  const next = useCallback(() => onChange((index + 1) % count), [index, count, onChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && count > 1) prev()
      else if (e.key === 'ArrowRight' && count > 1) next()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, prev, next, count])

  // Préchargement des voisins (la variante 1920 suffit pour la plupart des écrans).
  useEffect(() => {
    if (count < 2) return
    for (const i of [(index - 1 + count) % count, (index + 1) % count]) {
      const img = new Image()
      img.src = variantUrl(items[i].fileKey, 1920)
    }
  }, [index, items, count])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex h-dvh flex-col bg-[oklch(0.13_0.01_60)] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current
        touchX.current = null
        if (start === null || count < 2) return
        const delta = (e.changedTouches[0]?.clientX ?? start) - start
        if (delta > 50) prev()
        else if (delta < -50) next()
      }}
    >
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] text-xs tracking-[0.14em] uppercase">
        <span className="text-white/60">{count > 1 ? t('counter', { n: index + 1, total: count }) : ''}</span>
        <button type="button" onClick={onClose} className="px-2 py-2 text-white/80 hover:text-white" aria-label={t('close')}>
          {t('close')} ×
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {/* key : l'image précédente ne reste pas affichée pendant le chargement de la suivante */}
        <img
          key={item.fileKey}
          src={variantUrl(item.fileKey, 2560)}
          srcSet={srcSet(item.fileKey)}
          sizes="100vw"
          alt={item.title}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
        {count > 1 ? (
          <>
            <Arrow side="left" label={t('prev')} onClick={prev} />
            <Arrow side="right" label={t('next')} onClick={next} />
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs tracking-[0.04em]">
        <div className="grid gap-0.5">
          <b className="font-display text-base font-normal tracking-normal">{item.title}</b>
          {item.caption ? <span className="text-white/60">{item.caption}</span> : null}
        </div>
        {children}
      </div>
    </div>
  )
}

function Arrow({ side, label, onClick }: { side: 'left' | 'right'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 px-3 py-6 text-3xl leading-none text-white/70 transition-colors hover:text-white md:px-6 ${side === 'left' ? 'left-0' : 'right-0'}`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  )
}
