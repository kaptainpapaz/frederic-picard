import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Picture } from '@/components/site/Picture'
import { SiteShell } from '@/components/site/SiteShell'
import { getContent } from '@/lib/content'
import { srcSet, variantUrl } from '@/lib/media-urls'
import { coverOf, featuredSerie, formatPrice, photoById, shopTirages } from '@/lib/queries'

/** ISR : rendu à la première visite, cache 1 h, invalidé par l'admin (src/lib/revalidate.ts). */
export const revalidate = 3600

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const [home, identity, featured, tirages] = await Promise.all([getContent('home'), getContent('identity'), featuredSerie(), shopTirages()])
  const [hero, atelier] = await Promise.all([photoById(home.heroPhotoId), photoById(home.atelierPhotoId)])
  const featuredCover = featured ? coverOf(featured) : null
  const featuredSecond = featured?.photos.find((p) => p.id !== featuredCover?.id) ?? null
  const prints = tirages.filter((x) => x.status === 'AVAILABLE').slice(0, 3)

  return (
    <SiteShell overHero>
      {/* Hero pleine largeur, sous l'en-tête transparent. L'id "hero" sert de seuil à l'en-tête. */}
      {/* Hauteur réduite sur mobile (écran vertical) pour couper moins la photo 16:9 ; le point d'intérêt choisi dans l'admin fixe ce qui reste visible. */}
      <section id="hero" className="relative h-[clamp(420px,72vh,720px)] bg-[oklch(0.3_0.02_60)] text-white md:h-[clamp(480px,88vh,920px)]">
        {hero ? (
          <img
            src={variantUrl(hero.fileKey, 2560)}
            srcSet={srcSet(hero.fileKey)}
            // Sur mobile le hero est plus haut que large : la photo 16:9 est agrandie par la
            // hauteur, soit ~2,8 fois la largeur de l'écran. Sans ce sizes, le navigateur
            // choisit une variante trop petite et l'image est floue.
            sizes="(max-width: 768px) 280vw, 100vw"
            alt={hero.title}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `${Math.round(home.heroFocusX * 100)}% ${Math.round(home.heroFocusY * 100)}%` }}
            fetchPriority="high"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-transparent to-black/55" />
        <div className="absolute inset-x-0 bottom-0 z-(--z-base) mx-auto max-w-[1360px] px-6 pb-14">
          <p className="font-display max-w-[22ch] text-[clamp(28px,3.6vw,54px)] leading-[1.12] text-balance">{home.heroText}</p>
          <Link href="/series" className="cta mt-5 text-white">
            {home.heroCta}
          </Link>
        </div>
      </section>

      {/* Présentation */}
      <section className="mx-auto grid max-w-[1360px] gap-10 px-6 py-20 md:grid-cols-2 md:gap-16 md:py-24">
        <p className="font-display m-0 max-w-[26ch] text-[clamp(26px,2.8vw,40px)] leading-[1.3]">{home.introStrong}</p>
        <div>
          <div className="eyebrow mb-3.5">{identity.displayName}</div>
          {home.introBody.split(/\n\n+/).map((p, i) => (
            <p key={i} className="mb-5 max-w-[44ch] text-muted-foreground">
              {p}
            </p>
          ))}
          <Link href="/contact" className="cta">
            {t('contactMe')}
          </Link>
        </div>
      </section>

      {/* Atelier */}
      {atelier ? (
        <section className="mx-auto max-w-[1360px] px-6 pb-24">
          <Picture fileKey={atelier.fileKey} alt={home.atelierCaption} sizes="(max-width: 1360px) 100vw, 1360px" />
          <div className="mt-2.5 text-xs tracking-[0.04em] text-muted-foreground">{home.atelierCaption}</div>
        </section>
      ) : null}

      {/* Dernière série */}
      {featured && featuredCover ? (
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-[1360px] items-end justify-between gap-6 px-6 pt-18 pb-8">
            <div>
              <div className="eyebrow">{t('latestSerie')}</div>
              <h2 className="font-display mt-2 text-[clamp(32px,3.6vw,52px)] leading-[1.05]">{featured.title}</h2>
              {featured.intro ? <p className="mt-1.5 max-w-[46ch] text-muted-foreground">{featured.intro}</p> : null}
            </div>
            <Link href="/series" className="cta shrink-0">
              {t('allSeries')}
            </Link>
          </div>
          <div className="mx-auto grid max-w-[1360px] items-end gap-8 px-6 pb-24 md:grid-cols-[7fr_5fr]">
            <Link href={`/series/${featured.slug}`} className="block">
              <Picture fileKey={featuredCover.fileKey} alt={featuredCover.title} sizes="(max-width: 768px) 100vw, 58vw" />
            </Link>
            <div className="grid gap-3.5 pb-1.5">
              {featuredSecond ? (
                <Link href={`/series/${featured.slug}`} className="block">
                  <Picture fileKey={featuredSecond.fileKey} alt={featuredSecond.title} sizes="(max-width: 768px) 100vw, 40vw" />
                </Link>
              ) : null}
              <p className="m-0 max-w-[40ch] text-muted-foreground">
                {t('serieMeta', { year: featured.year ?? '', count: featured.photos.length })}
              </p>
              <Link href={`/series/${featured.slug}`} className="cta">
                {t('viewSerie')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tirages */}
      {prints.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto flex max-w-[1360px] items-end justify-between gap-6 px-6 pt-18 pb-8">
            <div>
              <div className="eyebrow">{t('prints')}</div>
              <h2 className="font-display mt-2 text-[clamp(32px,3.6vw,52px)] leading-[1.05] text-balance">{home.printsTitle}</h2>
              <p className="mt-1.5 max-w-[46ch] text-muted-foreground">{home.printsText}</p>
            </div>
            <Link href="/tirages" className="cta shrink-0">
              {t('allPrints')}
            </Link>
          </div>
          <div className="mx-auto grid max-w-[1360px] gap-8 px-6 pb-24 md:grid-cols-3">
            {prints.map((p) => (
              <Link key={p.id} href="/tirages" className="grid gap-2.5">
                <Picture fileKey={p.photo.fileKey} alt={p.photo.title} sizes="(max-width: 768px) 100vw, 33vw" />
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[22px]">{p.photo.title}</h3>
                  <span className="whitespace-nowrap">{formatPrice(p.priceCents)}</span>
                </div>
                <div className="flex flex-wrap gap-x-3.5 text-xs text-muted-foreground">
                  <span>{p.format}</span>
                  <span>
                    {t('edition', { n: p.editionNumber, size: p.editionSize })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Démarche */}
      {home.values.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1360px] px-6 pt-18 pb-8">
            <div className="eyebrow">{t('approach')}</div>
          </div>
          <div className="mx-auto grid max-w-[1360px] gap-12 px-6 pb-24 md:grid-cols-3 md:gap-8">
            {home.values.map((v, i) => (
              <div key={i}>
                <span className="font-display mb-3.5 block text-[13px] tracking-[0.2em] text-accent">{v.mark}</span>
                <h3 className="font-display mb-2 text-[28px]">{v.title}</h3>
                <p className="m-0 max-w-[34ch] text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Invitation */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-6 pt-20 pb-28 md:grid-cols-2">
          <h2 className="font-display m-0 text-[clamp(34px,4vw,60px)] leading-none text-balance">{home.inviteTitle}</h2>
          <div className="grid justify-items-start gap-4">
            <p className="m-0 max-w-[40ch] text-muted-foreground">{home.inviteText}</p>
            <Link href="/contact" className="cta">
              {t('write')}
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
