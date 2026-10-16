// Prisma 7 : la configuration vit a la racine, plus dans prisma/. Regle A1.
//
// Rupture Prisma 7 rencontree au montage de ce starter, et qui illustre exactement
// la regle A1 : la propriete `url` n'est PLUS acceptee dans le bloc datasource du
// schema. L'URL de connexion se declare ici pour les commandes de migration, et
// l'application la passe au constructeur PrismaClient via son adaptateur.
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  // Utilisee par prisma migrate / db / studio uniquement.
  // L'application, elle, passe par @prisma/adapter-pg (voir src/lib/db.ts).
  //
  // Volontairement `process.env.DATABASE_URL ?? ''` et NON le helper `env()` de Prisma,
  // qui leve des le chargement du fichier si la variable est absente.
  // Regle B1 : `prisma generate` tourne dans le conteneur de build, qui n'a ni reseau
  // vers PostgreSQL ni DATABASE_URL. Exiger la variable ici ferait echouer le build de
  // production alors qu'il passe en local, ce qui est exactement la panne que ce
  // starter est cense rendre impossible.
  // Les commandes qui ont VRAIMENT besoin de l'URL (migrate, studio) echouent d'elles-
  // memes avec un message clair si elle est vide.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },

  migrations: {
    // Regle C4 : ce seed est IDEMPOTENT. Il fait des upsert de donnees de reference
    // et peut etre relance en production sans rien detruire. Un seed destructif, s'il
    // devient necessaire, vit dans un fichier separe nomme seed-demo.ts.
    seed: 'tsx prisma/seed.ts',
  },
})
