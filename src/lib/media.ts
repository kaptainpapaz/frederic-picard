/**
 * Médias : stockage et variantes 16:9.
 *
 * Règle G1 : les fichiers vivent dans UPLOADS_DIR (volume Docker en production), jamais
 * dans le dépôt. Règle B6 : ils sont servis hors de l'optimiseur Next, par la route
 * src/app/uploads/[...path]/route.ts, et affichés avec <img> + srcset (jamais next/image).
 *
 * Convention de fichiers, pour une clé K :
 *   K-orig.<ext>     l'original tel que reçu (jamais modifié, sert à recadrer à nouveau)
 *   K-2560.webp      variante 16:9, 2560 × 1440 (écrans Retina, hero mobile agrandi par la hauteur)
 *   K-1920.webp      variante 16:9, 1920 × 1080
 *   K-1280.webp      variante 16:9, 1280 × 720
 *   K-640.webp       variante 16:9, 640 × 360
 * Le recadrage (cropX, cropY, centre de 0 à 1) est appliqué sur l'original à chaque
 * (re)génération. Toutes les photos du site sont en 16:9 : décision d'atelier du 2026-10-16.
 */
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { VARIANT_WIDTHS } from '@/lib/media-urls'
export { VARIANT_WIDTHS, srcSet, variantUrl, type VariantWidth } from '@/lib/media-urls'

export function uploadsDir(): string {
  // turbopackIgnore : le dossier est hors du projet (volume), rien à tracer dans le build.
  return path.resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR ?? './uploads')
}

export function newFileKey(): string {
  return `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`
}


const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/tiff', 'tif'],
])

export function isAllowedImage(mime: string): boolean {
  return ALLOWED_MIME.has(mime)
}

/** Enregistre l'original et retourne ses dimensions. */
export async function storeOriginal(
  fileKey: string,
  buffer: Buffer,
  mime: string,
): Promise<{ width: number; height: number; ext: string }> {
  const ext = ALLOWED_MIME.get(mime)
  if (!ext) throw new Error('UNSUPPORTED_MIME')
  const dir = uploadsDir()
  await mkdir(dir, { recursive: true })
  const meta = await sharp(buffer).rotate().metadata()
  if (!meta.width || !meta.height) throw new Error('UNREADABLE_IMAGE')
  // L'original est enregistré après correction d'orientation EXIF, pour que le recadrage
  // raisonne sur l'image telle qu'elle est vue.
  const normalized = await sharp(buffer).rotate().toBuffer()
  await writeFile(path.join(dir, `${fileKey}-orig.${ext}`), normalized)
  return { width: meta.width, height: meta.height, ext }
}

async function readOriginal(fileKey: string): Promise<Buffer> {
  const dir = uploadsDir()
  for (const ext of ALLOWED_MIME.values()) {
    try {
      return await readFile(path.join(dir, `${fileKey}-orig.${ext}`))
    } catch {
      /* essayer l'extension suivante */
    }
  }
  throw new Error('ORIGINAL_NOT_FOUND')
}

/**
 * Génère les variantes 16:9 depuis l'original, centrées sur (cropX, cropY). Jamais
 * d'agrandissement : un original plus petit que la variante donne un fichier à sa taille
 * native (agrandir n'ajoute que des octets, pas de netteté).
 * Relançable à volonté : un nouveau recadrage écrase les variantes précédentes.
 */
export async function generateVariants(fileKey: string, cropX = 0.5, cropY = 0.5): Promise<void> {
  const original = await readOriginal(fileKey)
  const base = sharp(original)
  const meta = await base.metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) throw new Error('UNREADABLE_IMAGE')

  // Plus grand rectangle 16:9 contenu dans l'original.
  let cw = W
  let ch = Math.round((W * 9) / 16)
  if (ch > H) {
    ch = H
    cw = Math.round((H * 16) / 9)
  }
  const left = clamp(Math.round(W * cropX - cw / 2), 0, W - cw)
  const top = clamp(Math.round(H * cropY - ch / 2), 0, H - ch)

  const dir = uploadsDir()
  for (const width of VARIANT_WIDTHS) {
    const height = Math.round((width * 9) / 16)
    const out = await sharp(original)
      .extract({ left, top, width: cw, height: ch })
      .resize(width, height, { fit: 'fill', withoutEnlargement: true })
      .webp({ quality: width >= 1920 ? 86 : 82 })
      .toBuffer()
    await writeFile(path.join(dir, `${fileKey}-${width}.webp`), out)
  }
}

export async function deleteFiles(fileKey: string): Promise<void> {
  const dir = uploadsDir()
  const names = [
    ...VARIANT_WIDTHS.map((w) => `${fileKey}-${w}.webp`),
    ...[...ALLOWED_MIME.values()].map((ext) => `${fileKey}-orig.${ext}`),
  ]
  await Promise.all(names.map((n) => rm(path.join(/* turbopackIgnore: true */ dir, n), { force: true })))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}
