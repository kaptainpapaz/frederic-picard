'use client'

import { useEffect, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type NavItem = { href: '/series' | '/tirages' | '/contact'; label: string }

/**
 * En-tête fixe. Sur l'accueil, transparent en lettres blanches tant que le hero est à
 * l'écran, puis blanc opaque dès qu'on défile (demande de Fred, atelier du 2026-10-16).
 * Le hero porte l'id "hero" ; sa hauteur donne le seuil de bascule.
 */
export function SiteHeader({
  name,
  tagline,
  items,
  overHero = false,
}: {
  name: string
  tagline: string
  items: NavItem[]
  overHero?: boolean
}) {
  const pathname = usePathname()
  const [over, setOver] = useState(overHero)

  useEffect(() => {
    if (!overHero) {
      setOver(false)
      return
    }
    const update = () => {
      const hero = document.getElementById('hero')
      const headerHeight = 78
      setOver(!!hero && window.scrollY < hero.offsetHeight - headerHeight)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [overHero])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-(--z-sticky) border-b transition-colors duration-300',
        over ? 'border-transparent bg-transparent text-white' : 'border-border bg-background text-foreground',
      )}
    >
      <div className="mx-auto flex min-h-[78px] max-w-[1360px] flex-col items-start gap-2 px-6 py-3 md:flex-row md:items-center md:justify-between md:py-4">
        <Link href="/" className="flex items-center no-underline">
          <span className="font-display text-2xl leading-none tracking-wide">
            {name}
            <small className={cn('mt-1 block font-sans text-[10px] tracking-[0.26em] uppercase', over ? 'text-white/70' : 'text-muted-foreground')}>
              {tagline}
            </small>
          </span>
        </Link>
        <nav className="flex max-w-full gap-6 overflow-x-auto text-xs tracking-[0.14em] uppercase whitespace-nowrap [scrollbar-width:none]">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors',
                  over ? (active ? 'text-white' : 'text-white/75 hover:text-white') : active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
