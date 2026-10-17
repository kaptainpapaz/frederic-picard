# Déploiement — photo.florianracine.com

Même flux que florianracine.com : monorepo local → GitHub (`kaptainpapaz/frederic-picard`, subtree split) → `git pull` sur le VPS principal → `docker compose up -d --build`.
Dossier sur le VPS : `/var/docker-sites/frederic-picard`.

## 0. Une seule fois

1. **GitHub** : créer le dépôt `frederic-picard` (public, vide, sans README) sur github.com/kaptainpapaz.
2. **DNS** (zone florianracine.com) : enregistrement `A`, nom `photo`, valeur `76.13.142.180`, TTL 3600.
3. **Monorepo** (PowerShell, à la racine de vps-infrastructure) :
   ```
   git add servers/vps-principal/sites/frederic-picard
   git commit -m "feat(frederic-picard): site photographe, lots 1 à 3"
   git remote add frederic-picard https://github.com/kaptainpapaz/frederic-picard.git
   ```
4. **VPS, clone et .env** :
   ```
   ssh vps "sudo git clone https://github.com/kaptainpapaz/frederic-picard.git /var/docker-sites/frederic-picard"
   ssh vps "sudo nano /var/docker-sites/frederic-picard/.env"
   ```
   Contenu du `.env` (valeurs réelles, jamais dans git) :
   ```
   PROJECT_NAME=frederic-picard
   DOMAIN=photo.florianracine.com
   LETSENCRYPT_EMAIL=contact@florianracine.com
   POSTGRES_USER=app
   POSTGRES_PASSWORD=<mot de passe base, long>
   POSTGRES_DB=fp
   AUTH_SECRET=<32 caractères minimum>
   ADMIN_INITIAL_EMAIL=<email de connexion de Fred>
   ADMIN_INITIAL_PASSWORD=<mot de passe initial, Fred le change ensuite>
   EMAIL_PROVIDER=log
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASSWORD=
   EMAIL_FROM=site@photo.florianracine.com
   NEXT_PUBLIC_SITE_URL=https://photo.florianracine.com
   ```
   `EMAIL_PROVIDER=log` tant qu'un SMTP n'est pas branché : les messages restent lisibles dans l'admin, aucun email ne part.
5. **Limite de téléversement du proxy** (règle G4) :
   ```
   ssh vps "sudo docker cp /var/docker-sites/frederic-picard/deploy/vhost.photo.florianracine.com nginx-proxy:/etc/nginx/vhost.d/photo.florianracine.com && sudo docker exec nginx-proxy nginx -s reload"
   ```

## 1. Déployer (à chaque lot)

```
git subtree split --prefix=servers/vps-principal/sites/frederic-picard -b tmp-fp
git push frederic-picard tmp-fp:main --force
git branch -D tmp-fp
ssh vps "cd /var/docker-sites/frederic-picard && sudo git pull && sudo docker compose up -d --build --force-recreate"
```

Premier déploiement seulement, après `Ready` :
```
ssh vps "cd /var/docker-sites/frederic-picard && sudo docker compose exec web node node_modules/tsx/dist/cli.mjs prisma/seed.ts"
```

## 2. Vérifier (signaux positifs, règle J3)

```
ssh vps "sudo docker ps --format '{{.Names}} {{.Status}}' | grep frederic"
ssh vps "cd /var/docker-sites/frederic-picard && sudo docker compose logs web --tail 30"
ssh vps "ss -tlnp | grep 5432"
```
- `frederic-picard` et `frederic-picard-db` en `Up`.
- Dans les logs : la ligne des migrations (« migrations applied » ou « No pending migrations ») **avant** `✓ Ready`.
- `ss` ne retourne **rien** : la base n'est pas exposée.
- https://photo.florianracine.com/fr répond, certificat valide (quelques minutes après le premier démarrage pour Let's Encrypt).
- Recette E1 : se connecter sur /admin, **puis se déconnecter** : on doit revenir sur https://photo.florianracine.com/admin/connexion, pas sur localhost.

## 3. Sauvegarde

Le volume `frederic-picard_uploads` contient les originaux des photos : à ajouter au périmètre de sauvegarde avec `pgdata` (règle D1), via `scripts/backup-db.sh` du projet et le cron du VPS.

## 4. Régénérer les variantes d'images

Après un changement de tailles ou de qualité dans `src/lib/media.ts`, une fois le conteneur redéployé :
```
ssh vps "cd /var/docker-sites/frederic-picard && sudo docker compose exec web node node_modules/tsx/dist/cli.mjs scripts/regenerate-variants.ts"
```
