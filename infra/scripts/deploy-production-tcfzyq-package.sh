#!/usr/bin/env bash

set -euo pipefail

readonly PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TARGET_ROOT="/srv/tata-h5/production"
readonly RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
readonly RELEASE_DIR="${TARGET_ROOT}/releases/${RELEASE_ID}"
readonly EXPECTED_IP="${EXPECTED_IP:-82.157.98.16}"
readonly ALLOW_PENDING_DNS="${ALLOW_PENDING_DNS:-0}"
readonly H5_DOMAIN="tata.tcfzyq.online"
readonly LEGACY_H5_DOMAIN="www.tata.tcfzyq.online"
readonly ADMIN_DOMAIN="tata-admin.tcfzyq.online"
readonly ACCOUNTS_PATH="/etc/tata-production-admin-accounts.json"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Run this deployment script as root.\n' >&2
  exit 1
fi

if [[ ! -s "${ACCOUNTS_PATH}" ]]; then
  printf 'Missing production Admin account configuration: %s\n' "${ACCOUNTS_PATH}" >&2
  exit 1
fi

install -d -m 0755 \
  "${RELEASE_DIR}/h5" \
  "${RELEASE_DIR}/admin" \
  "${RELEASE_DIR}/apps/api/src" \
  "${RELEASE_DIR}/data/coupons" \
  "${TARGET_ROOT}/data" \
  /etc/nginx/snippets \
  /etc/nginx/sites-available \
  /etc/nginx/sites-enabled
chown www-data:www-data "${TARGET_ROOT}/data"
chmod 0750 "${TARGET_ROOT}/data"
chown root:www-data "${ACCOUNTS_PATH}"
chmod 0640 "${ACCOUNTS_PATH}"

rsync -a --delete "${PACKAGE_ROOT}/h5/" "${RELEASE_DIR}/h5/"
rsync -a --delete "${PACKAGE_ROOT}/admin/" "${RELEASE_DIR}/admin/"
install -m 0644 "${PACKAGE_ROOT}/apps/api/src/server.mjs" "${RELEASE_DIR}/apps/api/src/server.mjs"
install -m 0644 "${PACKAGE_ROOT}/data/coupons/coupons.json" "${RELEASE_DIR}/data/coupons/coupons.json"
install -m 0644 "${PACKAGE_ROOT}/BUILD_INFO" "${RELEASE_DIR}/BUILD_INFO"
ln -sfn "${RELEASE_DIR}" "${TARGET_ROOT}/current"

install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-static-security.conf" /etc/nginx/snippets/tata-static-security.conf
install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-production-routes.conf" /etc/nginx/snippets/tata-production-routes.conf
install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-production.conf" /etc/nginx/sites-available/tata-production.conf
if grep -q 'sites-enabled' /etc/nginx/nginx.conf; then
  rm -f /etc/nginx/conf.d/tata-production.conf
  ln -sfn /etc/nginx/sites-available/tata-production.conf /etc/nginx/sites-enabled/tata-production.conf
else
  rm -f /etc/nginx/sites-enabled/tata-production.conf
  ln -sfn /etc/nginx/sites-available/tata-production.conf /etc/nginx/conf.d/tata-production.conf
fi

printf '%s\n' \
  'APP_ENV=production' \
  'ACTIVITY_ID=tata-silent-personality-2026' \
  'DB_PATH=/srv/tata-h5/production/data/tata.sqlite' \
  'ADMIN_ACCOUNTS_PATH=/etc/tata-production-admin-accounts.json' \
  > /etc/tata-production-api.env
chmod 0600 /etc/tata-production-api.env

install -m 0644 "${PACKAGE_ROOT}/deploy/systemd/tata-production-api.service" /etc/systemd/system/tata-production-api.service
systemctl daemon-reload
systemctl enable tata-production-api
systemctl restart tata-production-api

for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8789/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:8789/api/v1/health >/dev/null

nginx -t
systemctl enable --now nginx
systemctl reload nginx

dns_ready=1
for domain in "${H5_DOMAIN}" "${LEGACY_H5_DOMAIN}" "${ADMIN_DOMAIN}"; do
  if ! getent ahostsv4 "${domain}" | awk '{print $1}' | grep -qx "${EXPECTED_IP}"; then
    printf '%s does not resolve to %s yet.\n' "${domain}" "${EXPECTED_IP}" >&2
    dns_ready=0
  fi
done

if [[ "${dns_ready}" -ne 1 ]]; then
  if [[ "${ALLOW_PENDING_DNS}" == "1" ]]; then
    printf 'Production HTTP/API is ready. Add both DNS records, then re-run deploy.sh to enable HTTPS.\n'
    exit 0
  fi
  exit 1
fi

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect \
  --cert-name "${H5_DOMAIN}" \
  -d "${H5_DOMAIN}" \
  -d "${LEGACY_H5_DOMAIN}" \
  -d "${ADMIN_DOMAIN}"
systemctl enable --now certbot-renew.timer 2>/dev/null || true

nginx -t
systemctl reload nginx

curl -fsS "https://${H5_DOMAIN}/api/v1/health" >/dev/null
curl -fsSI "https://${H5_DOMAIN}/" >/dev/null
curl -fsSI "https://${ADMIN_DOMAIN}/" >/dev/null

printf 'Production deployment complete:\n'
printf '  H5: https://%s/\n' "${H5_DOMAIN}"
printf '  Admin: https://%s/\n' "${ADMIN_DOMAIN}"
