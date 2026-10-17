/**
 * URLs des variantes d'image. Sans dépendance Node : importable par les composants client.
 * La génération des fichiers vit dans src/lib/media.ts (serveur seulement, sharp).
 */
import { UPLOADS_PREFIX } from '@/lib/uploads'

export const VARIANT_WIDTHS = [2560, 1920, 1280, 640] as const
export type VariantWidth = (typeof VARIANT_WIDTHS)[number]

export function variantUrl(fileKey: string, width: VariantWidth): string {
  return `${UPLOADS_PREFIX}${fileKey}-${width}.webp`
}

export function srcSet(fileKey: string): string {
  return VARIANT_WIDTHS.map((w) => `${variantUrl(fileKey, w)} ${w}w`).join(', ')
}
