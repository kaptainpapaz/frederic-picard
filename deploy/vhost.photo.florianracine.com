# Copie de nginx/vhost.d/default du VPS principal + limite de corps relevée pour les
# téléversements de photos HD (règle G4). Un fichier par hôte REMPLACE `default` : on reprend tout.
# Installé dans le conteneur nginx-proxy sous /etc/nginx/vhost.d/photo.florianracine.com (voir DEPLOY.md).

# === Security Headers ===
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-XSS-Protection "1; mode=block" always;

# === Performance ===
server_tokens off;
client_max_body_size 200m;
client_body_timeout 60s;
client_header_timeout 10s;
