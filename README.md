# frederic-picard

Site de Frédéric Picard, photographe : séries, tirages, contact, administration.
Règles et contexte : `CLAUDE.md`. Cadrage : vault Flo-Brain, projet « Site Frédéric Picard photographe ».

## Lancer en local

```
cp .env.example .env        # puis remplir DATABASE_URL, AUTH_SECRET, ADMIN_INITIAL_*
npm install
npm run db:generate
npm run db:deploy           # ou db:migrate en développement
npm run db:seed             # permissions, compte admin, textes par défaut (idempotent)
npm run dev                 # http://localhost:3000/fr  et  /admin
```

## Vérifier un lot

```
npm run verify              # typecheck + tests + build + tableau des routes
```

## Déployer (VPS principal)

Voir `CLAUDE.md`, section Déploiement, et `_socle/CHECKLIST-Deploiement.md`.
