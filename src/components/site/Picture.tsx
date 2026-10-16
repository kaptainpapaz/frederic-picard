import { srcSet, variantUrl } from '@/lib/media-urls'
import { cn } from '@/lib/utils'

/**
 * Photo 16:9 servie depuis /uploads (règle B6 : hors optimiseur Next, <img> + srcset).
 * `sizes` décrit la largeur affichée pour que le navigateur choisisse la variante.
 */
export function Picture({
  fileKey,
  alt,
  sizes = '100vw',
  priority = false,
  className,
}: {
  fileKey: string | null | undefined
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
}) {
  return (
    <div className={cn('frame', className)}>
      {fileKey ? (
        <img
          src={variantUrl(fileKey, 1280)}
          srcSet={srcSet(fileKey)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      ) : null}
    </div>
  )
}
