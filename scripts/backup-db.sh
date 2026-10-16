#!/usr/bin/env bash
#
# Sauvegarde de la base ET des volumes de donnees.
#
# Ce script est VERSIONNE et arrive sur le serveur par le meme canal que le code
# (regle D4). Un script « a creer a la main sur le serveur » n'est ni teste, ni
# sauvegarde, ni reproductible, et son absence ne se voit pas.
#
# Installation dans la crontab de ROOT, pas celle de l'utilisateur de deploiement
# (regle D5) : ce script appelle sudo docker, et sous cron personne n'est la pour
# taper un mot de passe. La sauvegarde echouerait chaque nuit, sans bruit.
#
#   sudo crontab -e
#   15 3 * * *  /var/docker-sites/<projet>/app/scripts/backup-db.sh
#
# Chemins en dur : le script doit fonctionner depuis n'importe quel repertoire courant
# (regle I3).

set -uo pipefail

PROJECT="${PROJECT_NAME:?PROJECT_NAME non defini}"
SITE_DIR="/var/docker-sites/${PROJECT}"
BACKUP_DIR="${SITE_DIR}/backups"
LOG="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=14
MIN_SIZE_BYTES=10240   # 10 Ko. En dessous, l'archive n'est pas credible.

STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="${BACKUP_DIR}/db-${STAMP}.sql.gz"
UPLOADS="${BACKUP_DIR}/uploads-${STAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

log "--- debut"

# 1. Base
if ! docker compose -f "${SITE_DIR}/docker-compose.yml" exec -T db \
     pg_dump -U "${POSTGRES_USER:-app}" "${POSTGRES_DB:-app}" | gzip > "$DUMP"; then
  log "ECHEC pg_dump"
  mv "$DUMP" "${DUMP}.invalide" 2>/dev/null || true
  log "--- fin en echec, AUCUNE purge effectuee"
  exit 1
fi

# 2. Uploads.
#    Regle D1 : le perimetre de sauvegarde se revise a CHAQUE ajout de stockage
#    persistant. La base n'est pas la seule donnee irremplacable. Sur ostraveiro, les
#    images televersees depuis le 04/08/2026 n'ont jamais ete couvertes.
if [ -d "${SITE_DIR}/uploads" ]; then
  tar czf "$UPLOADS" -C "${SITE_DIR}" uploads || log "AVERTISSEMENT tar uploads en echec"
fi

# 3. Controle de vraisemblance.
#    Regle D3 : une archive anormalement petite est traitee comme un ECHEC, pas comme un
#    avertissement. Rien, dans la liste des fichiers, ne doit la faire passer pour une
#    sauvegarde valide.
SIZE="$(stat -c%s "$DUMP" 2>/dev/null || echo 0)"
if [ "$SIZE" -lt "$MIN_SIZE_BYTES" ]; then
  mv "$DUMP" "${DUMP}.invalide"
  log "ECHEC sauvegarde tronquee (${SIZE} octets), renommee en .invalide"
  log "--- fin en echec, AUCUNE purge effectuee"
  exit 1
fi

log "OK db=${SIZE} octets"

# 4. Purge, UNIQUEMENT apres une sauvegarde reussie.
#    Regle D3 : une rotation inconditionnelle transforme une panne de sauvegarde en
#    perte de l'historique. Le `&&` d'un one-liner protege du cas « tar echoue », pas du
#    cas « tar produit une archive vide » : c'est pourquoi le controle ci-dessus existe.
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete

log "--- fin OK"

# Rappel affiche dans le journal, pour qu'il soit lu un jour.
# Regle D2 : une sauvegarde non restauree n'est pas une sauvegarde. Trimestriellement,
# restaurer sur un Postgres jetable et controler une valeur METIER attendue, pas un
# compte non nul.
