#!/bin/sh
set -e

export PORT="${PORT:-8080}"
APP_USER="${APP_USER:-appuser}"

echo "[MNK-TAX] Port HTTP : ${PORT}"

# Générer la configuration nginx depuis le template (substitution du port)
if [ -f /etc/nginx/conf.d/mnk-tax.template ]; then
    envsubst '${PORT}' < /etc/nginx/conf.d/mnk-tax.template > /etc/nginx/conf.d/mnk-tax.conf
fi

# Dossiers de stockage (quittances, documents, avatars)
mkdir -p /app/data/receipts /app/data/documents /app/data/avatars
chown -R "${APP_USER}:${APP_USER}" /app/data

echo "[MNK-TAX] Démarrage de nginx…"
nginx -g 'daemon off;' &

echo "[MNK-TAX] Démarrage du backend Spring Boot…"
exec runuser -u "${APP_USER}" -- java ${JAVA_OPTS} -jar /app/app.jar