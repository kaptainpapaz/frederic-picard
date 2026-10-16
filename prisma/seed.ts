/**
 * SEED IDEMPOTENT. Regle C4.
 *
 * Ce fichier ne fait QUE des upsert de donnees de reference. Il peut etre relance en
 * production autant de fois que necessaire sans rien detruire, et il DOIT l'etre a
 * chaque deploiement qui ajoute une permission (regle E3).
 *
 * Si un jour un seed de demonstration destructif devient necessaire, il vit dans un
 * fichier SEPARE nomme seed-demo.ts, et la premiere ligne de ce fichier dit qu'il
 * efface des donnees. Sur espaceimmobilier, un seed destructif aurait efface les biens
 * a chaque passage : c'est ce contraste qui a produit la regle.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { DEFAULT_ROLES, PERMISSIONS } from '../src/lib/rbac'
import { CONTENT, DEFAULTS } from '../src/lib/content'
import { hashPassword } from '../src/lib/password'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL absente.')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function main() {
  // 1. Les permissions, depuis le catalogue du code. Source d'autorite unique.
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { domain: p.domain, labelKey: p.labelKey },
      create: { key: p.key, domain: p.domain, labelKey: p.labelKey },
    })
  }
  console.log(`${PERMISSIONS.length} permissions synchronisees.`)

  // 2. Les roles et leurs permissions.
  for (const [key, permissionKeys] of Object.entries(DEFAULT_ROLES)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { labelKey: `roles.${key}` },
      create: { key, labelKey: `roles.${key}` },
    })

    for (const permissionKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permissionKey },
      })
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
    console.log(`Role ${key} : ${permissionKeys.length} permissions.`)
  }

  // 3. Le compte administrateur initial, seulement s'il n'existe pas.
  //    Le mot de passe vient d'une variable d'environnement, jamais du code ni de
  //    l'historique shell.
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL?.toLowerCase()
  if (adminEmail) {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: { email: adminEmail },
    })
    // Le mot de passe initial n'est posé que si le compte n'en a pas encore : Fred le
    // change ensuite dans l'admin et le seed ne l'écrase jamais (idempotent, règle C4).
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD
    if (!admin.passwordHash && initialPassword) {
      await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(initialPassword) } })
      console.log('Mot de passe initial posé.')
    }
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'admin' } })
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    })
    console.log(`Administrateur ${adminEmail} present.`)
  }

  // 4. Les textes par défaut des pages, seulement s'ils n'existent pas encore.
  //    Jamais d'écrasement : ce que Fred a saisi dans l'admin fait foi.
  for (const key of Object.keys(CONTENT) as (keyof typeof CONTENT)[]) {
    const existing = await prisma.siteContent.findUnique({ where: { key } })
    if (!existing) {
      await prisma.siteContent.create({ data: { key, value: DEFAULTS[key] } })
      console.log(`Contenu ${key} initialisé.`)
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
