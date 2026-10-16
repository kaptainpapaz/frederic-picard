@REGLES-TRANSVERSES.md

# CLAUDE.md — frederic-picard

> Les règles transverses importées ci-dessus valent pour tous les projets du monorepo et ne se répètent pas ici.
> Ce fichier ne contient que ce qui est **propre à ce projet**.

---

## Contexte

Site de Frédéric Picard, photographe : ses séries (sessions de travail), une boutique de tirages déjà imprimés, un contact, et une administration où il publie seul. Né de l'atelier du 2026-10-16 (maquettes validées avec Fred), monté le même jour depuis le starter du socle.

**Client / porteur** : Frédéric Picard (ami de Flo). Budget 0, pas de maintenance contractuelle : c'est une idée qu'on fait exister.
**Typologie** : Vitrine premium + admin léger (chaîne allégée « Création Web & SEO »)
**Statut** : en développement, lots 1 à 3 livrés le 2026-10-16, jamais déployé
**URL de production** : https://photo.florianracine.com (prévue, VPS principal)

---

## Stack

Le socle commun est acquis. Écarts et ajouts :

| Slot | Choix de ce projet | Raison de l'écart s'il y en a un |
|---|---|---|
| Authentification | **Aucune bibliothèque** : email + mot de passe (scrypt natif), cookie signé HMAC `fp_session`, 14 jours. `src/lib/auth-slot.ts`, `src/lib/password.ts` | Un seul compte, zéro budget, zéro dépendance. Critère de réouverture : un second rôle ou une connexion externe |
| Email | nodemailer SMTP ou `log` (console), `src/lib/email/setup.ts` | Fournisseur = configuration (arbitrage n°6) |
| Stockage de fichiers | Volume local `UPLOADS_DIR` (`/app/uploads` en prod), variantes 16:9 par sharp, **servies par Next** (`src/app/uploads/[...path]/route.ts`) | Pas de configuration nginx à maintenir sur le VPS mutualisé. Règle B6 respectée : `<img>` + srcset, jamais `next/image` |
| i18n | mono-langue `fr`, next-intl dans le socle | |
| Paiement | **Aucun.** Une demande de tirage = un message (kind ORDER) + email à Fred | Décision Flo 2026-10-16 : « boutique très simple, échange de mail » |
| Polices | auto-hébergées `src/fonts/` (Cormorant Garamond, Figtree), `next/font/local` | Règle B1 : pas de réseau au build, donc pas de `next/font/google` |

**Dépendances notables ajoutées** : `sharp` (variantes 16:9 au téléversement), `nodemailer` (SMTP).

---

## Structure

```
src/app/[locale]/        site public : accueil, series, series/[slug], tirages, contact, mentions-legales, cgv, confidentialite
src/app/admin/           connexion (publique) et (protected)/ : accueil, series, tirages, pages/[tab], informations, messages, compte
src/app/uploads/         route qui sert les variantes d'images depuis UPLOADS_DIR
src/actions/             public.ts (contact, demande de tirage), auth.ts, series.ts, photos.ts, tirages.ts, content.ts
src/lib/content.ts       textes des pages et informations (JSON validé Zod dans SiteContent), défauts posés par le seed
src/lib/media.ts         stockage, recadrage 16:9, variantes 1920/1280/640 webp ; media-urls.ts = URLs seules (client)
src/lib/queries.ts       lectures du site public
src/lib/revalidate.ts    invalidation ISR, un seul point (règle F5)
src/components/site/     en-tête (transparent sur le hero), Picture 16:9, formulaires publics
src/components/admin/    ActionForm (onClick, jamais onSubmit), PhotoManager, formulaires série et tirage
prisma/                  schéma et migrations ; seed idempotent
```

**Conventions propres à ce projet**
- Toute image du site est en 16:9. Le recadrage est un centre (cropX, cropY) appliqué à l'original ; changer le recadrage régénère les trois variantes sous la même clé.
- Les textes de contenu (hero, présentation, démarche, pages légales, coordonnées) sont du contenu client dans `SiteContent`, pas des libellés : ils ne passent pas par `messages/fr.json`. Les libellés d'interface, eux, y passent tous (règle H3).
- Les pages publiques exportent `revalidate = 3600` et un `generateStaticParams` vide : rien n'est pré-rendu au build, tout se construit à la première visite et se cache. L'admin invalide via `revalidatePublic()`.
- Montants en centimes (`priceCents`), jamais en flottant.

---

## Règles métier critiques

1. Une seule série est « mise en avant » (`featured`) à la fois : l'action qui en coche une décoche les autres dans la même transaction.
2. Une série est visible sur le site si son statut est `PUBLISHED` ou `ONGOING`. Un tirage est visible en boutique si son statut n'est pas `HIDDEN` **et** si la série de sa photo est visible. Un tirage `SOLD` reste affiché comme vendu, c'est voulu.
3. Une demande de tirage ne se fait que sur un tirage `AVAILABLE`. Elle crée un `Message` de kind `ORDER` lié au tirage et notifie Fred. Elle ne change pas le statut du tirage : c'est Fred qui le passe à « réservé » ou « vendu » après l'échange par email.
4. Les emails automatiques ne partent **qu'à Fred** (`identity.notifyEmail`). Aucun email ne part vers un visiteur tant que Fred n'a pas validé un texte (règle F2). La confirmation au visiteur est affichée à l'écran.
5. Le formulaire de contact et la demande de tirage sont limités à 5 messages par IP et par heure (`clientIp`, règle E6) et portent un champ piège `website` qui doit rester vide.
6. Le seed ne pose le mot de passe initial que si le compte n'en a pas. Il ne réécrit jamais un contenu existant dans `SiteContent`.
7. Les fichiers originaux ne sont jamais servis : seules les variantes `-1920/-1280/-640.webp` sortent par `/uploads/`.

---

## Points de déclaration multiples

| Notion | Où la déclarer, dans l'ordre | Symptôme si une étape manque |
|---|---|---|
| Permission | 1. `src/lib/rbac.ts` — 2. `npm run db:seed` — 3. clé dans `messages/fr.json` | Le bouton n'apparaît pour personne / libellé brut |
| Clé d'erreur | 1. `ERRORS` dans `src/lib/result.ts` ou clé `errors.*` — 2. `messages/fr.json` section `errors` | La clé s'affiche telle quelle |
| Modèle d'email | 1. `registerTransition()` dans `src/lib/email/setup.ts` — 2. sujet dans `SUBJECTS` de `src/actions/public.ts` et `messages/fr.json` | Aucun envoi, et c'est voulu |
| Clé de contenu de page | 1. schéma + défauts dans `src/lib/content.ts` — 2. `fromForm()` dans `src/actions/content.ts` — 3. champ dans `src/app/admin/(protected)/pages/[tab]/page.tsx` — 4. affichage dans la page publique | Le champ se sauve mais ne s'affiche pas, ou s'affiche mais ne se sauve pas |
| Statut de série ou de tirage | 1. enum Prisma — 2. `queries.ts` (visibilité) — 3. `messages/fr.json` `admin.series.status` / `admin.prints.status` / `shop.status` | Libellé brut à l'écran, ou élément invisible sans raison |

---

## Zones irrécupérables de ce projet

Les trois par défaut (site public, données, emails), plus :

- **Le dossier `uploads`** : les originaux des photos de Fred n'existent que là (volume Docker). Il entre dans `scripts/backup-db.sh` dès le premier déploiement (règle D1).

---

## Déploiement

- VPS principal, derrière nginx-proxy + acme-companion, `DOMAIN=photo.florianracine.com`.
- `.env` de production d'après `.env.example` : `AUTH_SECRET` (32+ caractères), `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD`, SMTP, `UPLOADS_DIR=/app/uploads`.
- Règle G4 : `client_max_body_size` du proxy ≥ 200m (téléversements de photos HD, plusieurs à la fois).
- Après `migrate deploy`, lancer **une fois** `node node_modules/tsx/dist/cli.mjs prisma/seed.ts` dans le conteneur (permissions, compte, textes par défaut). Le seed est idempotent.
- Recette E1 : se connecter à l'admin, **puis se déconnecter**, et vérifier qu'on revient sur `/admin/connexion` du domaine public.

---

## Arbitrages ouverts

1. **Images servies par Next** et non par le serveur web (voir Stack). Critère de réouverture : une charge qui le justifie, ou un CDN.
2. **Tout le dictionnaire part au client** (`NextIntlClientProvider` sans filtre) : les libellés admin sont dans le bundle public. Sans conséquence fonctionnelle. Critère de réouverture : si le poids du dictionnaire dépasse quelques dizaines de ko.
3. **Pas de tests ajoutés** au-delà de ceux du starter : les zones irrécupérables propres à ce projet (visibilité, demande de tirage) sont couvertes par le test de bout en bout manuel du 2026-10-16, pas par Vitest. À revoir si une régression coûte plus de trente minutes.

---

## Règles apprises

- **2026-10-16, revalidation ISR** : `revalidatePath('/fr', 'layout')` n'invalide pas les pages d'un segment dynamique ; il faut le motif `revalidatePath('/[locale]', 'layout')`. Symptôme : la boutique restait sur sa version en cache après l'ajout d'un tirage, sans erreur. Corrigé dans `src/lib/revalidate.ts`.
- **2026-10-16, `output: 'standalone'` en local** : le serveur standalone ne sert pas `.next/static` ni `public/` s'ils ne sont pas copiés à côté (`.next/standalone/.next/static`, `.next/standalone/public`). Sans eux, les composants client ne s'hydratent pas et aucun bouton `onClick` ne réagit, sans erreur serveur. Le `Dockerfile` fait ces copies ; en local, `npm run start` les évite.
- **2026-10-16, outillage dans l'image Docker** : copier `prisma` et `tsx` à la pièce depuis le builder casse au démarrage, deux fois de suite (`COPY` d'un symlink `.bin/prisma` → `Cannot find module './cli.js'` ; puis `@prisma/config` → `Cannot find module 'effect'`). Prisma 7.10 a un arbre de dépendances profond. Correction : étape `tooling` avec `npm ci --omit=dev`, prisma et tsx déclarés en `dependencies`, et les CLI appelés par leur chemin réel (`node node_modules/prisma/build/index.js`, `node node_modules/tsx/dist/cli.mjs`). Coût : image plus lourde (~1 Go). À remonter dans le starter du socle.
- **2026-10-16, `.gitignore` et dossier de code homonyme** : la ligne `uploads/` (sans slash initial) ignorait aussi `src/app/uploads/`, la route qui sert les images. Le site local marchait (fichier sur le disque), la production clonée depuis GitHub renvoyait la 404 de Next sur chaque image, sans aucune erreur de build ni de démarrage. Règle : un motif de `.gitignore` visant un dossier de données porte un slash initial (`/uploads/`), et le premier déploiement vérifie une image, pas seulement la page.
