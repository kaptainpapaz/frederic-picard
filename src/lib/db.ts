/**
 * Client Prisma, avec la garde de build.
 *
 * Regle B1 : le build ne parle a aucun service exterieur. Le conteneur de build tourne
 * sans reseau vers PostgreSQL et sans DATABASE_URL. Une requete pendant le build passe
 * en local et ECHOUE au deploiement.
 *
 * Regle B2 : et on ne resout jamais ce probleme en fournissant une base de substitution
 * (dev.db commite), qui transforme un echec bruyant en pages publiques servant des
 * donnees de demonstration figees.
 *
 * La garde ci-dessous rend l'erreur immediate et explicite au lieu de la laisser
 * apparaitre au premier deploiement.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

function buildPhaseGuard(): never {
  throw new Error(
    [
      'Acces a la base pendant le build (regle B1).',
      '',
      'Le conteneur de build de production n a ni reseau vers PostgreSQL ni DATABASE_URL.',
      'Ce code passerait en local et ferait echouer le deploiement.',
      '',
      'Corriger en sortant la page de generateStaticParams : elle se construira a la',
      'premiere visite puis restera en cache (ISR). Ne PAS fournir une base de',
      'substitution au build, ce qui rendrait la dependance invisible au lieu de la lever.',
    ].join('\n'),
  )
}

function createClient(): PrismaClient {
  if (isBuildPhase) {
    return new Proxy({} as PrismaClient, { get: buildPhaseGuard, apply: buildPhaseGuard })
  }
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL absente au demarrage.')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/**
 * Instanciation PARESSEUSE, volontairement.
 *
 * Importer ce module ne doit jamais ouvrir de connexion ni exiger DATABASE_URL : sinon
 * un simple import en cascade (un test unitaire qui importe locks.ts, un script, un
 * fichier de configuration) reclame une base qu'il n'utilisera pas. C'est la meme
 * famille de probleme que la regle B1 : une dependance a un service exterieur qui
 * apparait la ou personne ne l'attendait.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    globalForPrisma.prisma ??= createClient()
    const value = Reflect.get(globalForPrisma.prisma, property, receiver)
    return typeof value === 'function' ? value.bind(globalForPrisma.prisma) : value
  },
})
