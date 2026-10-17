/**
 * Régénère les variantes 16:9 de toutes les photos depuis leurs originaux, avec le
 * recadrage enregistré. À lancer après un changement de tailles ou de qualité
 * (src/lib/media.ts). Idempotent, ne touche ni la base ni les originaux.
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/regenerate-variants.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { generateVariants } from '../src/lib/media'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL absente.')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function main() {
  const photos = await prisma.photo.findMany({ select: { id: true, fileKey: true, cropX: true, cropY: true, title: true } })
  let ok = 0
  for (const p of photos) {
    try {
      await generateVariants(p.fileKey, p.cropX, p.cropY)
      ok += 1
      console.log(`ok  ${p.fileKey}  ${p.title}`)
    } catch (error) {
      console.error(`KO  ${p.fileKey}  ${p.title}`, error instanceof Error ? error.message : error)
    }
  }
  console.log(`${ok}/${photos.length} photos régénérées.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
