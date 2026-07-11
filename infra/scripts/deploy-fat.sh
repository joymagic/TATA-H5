#!/usr/bin/env bash

set -euo pipefail

readonly REPO_DIR="/srv/tata-h5/fat/repo"
readonly FAT_DIR="/srv/tata-h5/fat"
readonly ARCHIVE="/tmp/tata-h5-fat-1.0.tar.gz"
readonly ARCHIVE_URL="https://codeload.github.com/joymagic/TATA-H5/tar.gz/refs/heads/fat"

rm -rf "${REPO_DIR}"
install -d -m 0755 "${REPO_DIR}" "${FAT_DIR}/h5" "${FAT_DIR}/admin"
install -d -o www-data -g www-data -m 0750 "${FAT_DIR}/data"
curl --http1.1 -L --retry 5 --retry-all-errors --connect-timeout 15 --max-time 240 \
  -o "${ARCHIVE}" "${ARCHIVE_URL}"
tar -xzf "${ARCHIVE}" --strip-components=1 -C "${REPO_DIR}"
test -f "${REPO_DIR}/pnpm-lock.yaml"

cd "${REPO_DIR}"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build:fat

# --delete clears only the isolated FAT static targets; prod is untouched.
rsync -a --delete apps/h5/dist/fat/ "${FAT_DIR}/h5/"
rsync -a --delete apps/admin/dist/fat/ "${FAT_DIR}/admin/"
printf 'fat branch: 1.0\n' > "${FAT_DIR}/BUILD_INFO"

install -d -m 0755 /etc/nginx/snippets /etc/nginx/sites-enabled
install -m 0644 infra/nginx/tata-static-security.conf /etc/nginx/snippets/tata-static-security.conf
install -m 0644 infra/nginx/tata-static-routes.conf /etc/nginx/snippets/tata-static-routes.conf
install -m 0644 infra/nginx/tata-fat-routes.conf /etc/nginx/snippets/tata-fat-routes.conf
test -f /etc/letsencrypt/live/fat-tata.cdbzzy.cn/fullchain.pem
install -m 0644 infra/nginx/tata-static.conf /etc/nginx/sites-available/tata-h5.conf
ln -sfn /etc/nginx/sites-available/tata-h5.conf /etc/nginx/sites-enabled/tata-h5.conf

if [[ ! -f /etc/tata-fat-api.env ]]; then
  printf '%s\n' 'FAT_ADMIN_PASSWORD=TATA2026' > /etc/tata-fat-api.env
  chmod 0600 /etc/tata-fat-api.env
fi

if [[ "${RESET_FAT_DATA:-0}" == "1" ]]; then
  systemctl stop tata-fat-api 2>/dev/null || true
  rm -f "${FAT_DIR}/data/tata-fat.sqlite" "${FAT_DIR}/data/tata-fat.sqlite-shm" "${FAT_DIR}/data/tata-fat.sqlite-wal"
fi

install -m 0644 infra/systemd/tata-fat-api.service /etc/systemd/system/tata-fat-api.service
systemctl daemon-reload
systemctl enable tata-fat-api
systemctl restart tata-fat-api

for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:8787/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS http://127.0.0.1:8787/api/v1/health >/dev/null

nginx -t
systemctl enable --now nginx
systemctl reload nginx

printf 'FAT 1.0 real-integration deployed\n'
