# Image de production.
#
# Regle I4 : build et runtime partagent la MEME libc. Debian (glibc) et non Alpine
# (musl), parce que sharp, argon2, bcrypt et better-sqlite3 embarquent du binaire
# compile : compile sous musl, un module refuse de se charger sous glibc et
# reciproquement. Le choix d'Alpine se paie plus tard, pas au moment ou on l'ecrit.
#
# Regle I5 : l'outillage a des dependances systeme que l'application n'a pas.
# `prisma migrate deploy` a besoin d'OpenSSL, l'application non (elle utilise
# l'adaptateur PostgreSQL en JavaScript pur). Les paquets sont nommes explicitement :
# on doit pouvoir relire cette ligne dans six mois et savoir ce qu'elle a touche.

FROM node:22-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regle B1 : le build ne parle a AUCUN service exterieur.
# DATABASE_URL est volontairement absente ici. Si un `next build` echoue faute de base,
# c'est le comportement voulu : la garde de src/lib/db.ts leve une erreur explicite.
# Ne JAMAIS ajouter DATABASE_URL a cette etape pour « faire passer le build ».
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Outillage d'exploitation (règle I6) : prisma (migrate deploy) et tsx (seed) doivent
# exister dans l'image qui tourne, avec TOUTES leurs dépendances. Les copier à la pièce
# depuis le builder a cassé deux fois le 2026-10-16 (.bin symlink, puis `effect` absent) :
# on installe donc les dépendances de production entières, prisma et tsx y étant déclarés
# en `dependencies`. L'image est plus lourde, mais elle démarre.
FROM base AS tooling
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=tooling /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ce que le seed et les migrations lisent à l'exécution.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/src/generated ./src/generated

# Le volume des médias (règle G1) doit appartenir à l'utilisateur qui écrit.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
