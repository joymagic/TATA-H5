#!/usr/bin/env bash

set -euo pipefail

readonly PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly TARGET_ROOT="/srv/tata-h5/tcfzyq"
readonly RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
readonly RELEASE_DIR="${TARGET_ROOT}/releases/${RELEASE_ID}"
readonly EXPECTED_IP="${EXPECTED_IP:-82.157.98.16}"
readonly ALLOW_PENDING_DNS="${ALLOW_PENDING_DNS:-0}"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Run this deployment script as root.\n' >&2
  exit 1
fi

install_dependencies() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl nginx certbot python3-certbot-nginx rsync
  elif command -v dnf >/dev/null 2>&1; then
    dnf --disableexcludes=all install -y ca-certificates curl nginx certbot python3-certbot-nginx rsync
  else
    printf 'Unsupported package manager. Install nginx, certbot, curl, and rsync first.\n' >&2
    exit 1
  fi
}

install_node() {
  local major=0
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  fi
  if (( major >= 22 )); then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
    dnf install -y nodejs
  fi

  node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
}

ensure_service_user() {
  if ! getent group www-data >/dev/null; then
    groupadd --system www-data
  fi
  if ! id -u www-data >/dev/null 2>&1; then
    useradd --system --gid www-data --no-create-home --home-dir /nonexistent --shell /sbin/nologin www-data
  fi
}

install_dependencies
install_node
ensure_service_user

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

rsync -a --delete "${PACKAGE_ROOT}/h5/" "${RELEASE_DIR}/h5/"
rsync -a --delete "${PACKAGE_ROOT}/admin/" "${RELEASE_DIR}/admin/"
install -m 0644 "${PACKAGE_ROOT}/apps/api/src/server.mjs" "${RELEASE_DIR}/apps/api/src/server.mjs"
install -m 0644 "${PACKAGE_ROOT}/data/coupons/coupons.json" "${RELEASE_DIR}/data/coupons/coupons.json"
install -m 0644 "${PACKAGE_ROOT}/BUILD_INFO" "${RELEASE_DIR}/BUILD_INFO"
ln -sfn "${RELEASE_DIR}" "${TARGET_ROOT}/current"

install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-static-security.conf" /etc/nginx/snippets/tata-static-security.conf
install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-tcfzyq-routes.conf" /etc/nginx/snippets/tata-tcfzyq-routes.conf
install -m 0644 "${PACKAGE_ROOT}/deploy/nginx/tata-tcfzyq.conf" /etc/nginx/sites-available/tata-tcfzyq.conf
if grep -q 'sites-enabled' /etc/nginx/nginx.conf; then
  rm -f /etc/nginx/conf.d/tata-tcfzyq.conf
  ln -sfn /etc/nginx/sites-available/tata-tcfzyq.conf /etc/nginx/sites-enabled/tata-tcfzyq.conf
else
  rm -f /etc/nginx/sites-enabled/tata-tcfzyq.conf
  ln -sfn /etc/nginx/sites-available/tata-tcfzyq.conf /etc/nginx/conf.d/tata-tcfzyq.conf
fi

if [[ ! -f /etc/tata-tcfzyq-api.env ]]; then
  printf '%s\n' 'FAT_ADMIN_PASSWORD=TATA2026' > /etc/tata-tcfzyq-api.env
  chmod 0600 /etc/tata-tcfzyq-api.env
fi

install -m 0644 "${PACKAGE_ROOT}/deploy/systemd/tata-tcfzyq-api.service" /etc/systemd/system/tata-tcfzyq-api.service
systemctl daemon-reload
systemctl enable tata-tcfzyq-api
systemctl restart tata-tcfzyq-api

for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8788/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:8788/api/v1/health >/dev/null

nginx -t
systemctl enable --now nginx
systemctl reload nginx

dns_ready=1
for domain in tcfzyq.online admin.tcfzyq.online; do
  if ! getent ahostsv4 "${domain}" | awk '{print $1}' | grep -qx "${EXPECTED_IP}"; then
    printf '%s does not resolve to %s yet.\n' "${domain}" "${EXPECTED_IP}" >&2
    dns_ready=0
  fi
done

if [[ "${dns_ready}" -ne 1 ]]; then
  if [[ "${ALLOW_PENDING_DNS}" == "1" ]]; then
    printf 'HTTP/API deployment is ready. Re-run deploy.sh after DNS points both domains to %s to enable HTTPS.\n' "${EXPECTED_IP}"
    exit 0
  fi
  exit 1
fi

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect \
  --cert-name tcfzyq.online \
  -d tcfzyq.online \
  -d admin.tcfzyq.online

nginx -t
systemctl reload nginx

curl -fsS https://tcfzyq.online/api/v1/health >/dev/null
curl -fsSI https://tcfzyq.online/ >/dev/null
curl -fsSI https://admin.tcfzyq.online/ >/dev/null

printf 'Deployment complete:\n'
printf '  H5: https://tcfzyq.online/\n'
printf '  Admin: https://admin.tcfzyq.online/\n'
