/**
 * Sert les fichiers téléversés depuis UPLOADS_DIR (règle G1 : hors du dépôt).
 *
 * Écart documenté dans CLAUDE.md : sur ce projet les médias sont servis par Next lui-même
 * (cette route) et non par le serveur web, pour ne dépendre d'aucune configuration nginx
 * sur le VPS mutualisé. Ils restent hors de l'optimiseur d'images (règle B6, <img> + srcset).
 * Le préfixe /uploads est exclu du proxy i18n (src/proxy.ts).
 *
 * Seules les variantes générées sont servies : jamais l'original.
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { uploadsDir } from '@/lib/media'

const VARIANT = /^[a-z0-9-]+-(2560|1920|1280|640)\.webp$/

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params
  if (segments.length !== 1 || !VARIANT.test(segments[0])) {
    return new Response('Not found', { status: 404 })
  }
  const file = path.join(uploadsDir(), segments[0])
  try {
    const info = await stat(file)
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(info.size),
        // Les variantes sont régénérées sous la même clé après un recadrage : cache court
        // côté navigateur, le CDN n'existe pas sur ce projet.
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
