#!/usr/bin/env bash

set -euo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly OUTPUT_DIR="${ROOT_DIR}/deployment-packages"
readonly STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tata-tcfzyq-package.XXXXXX")"
readonly REVISION="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
readonly ARCHIVE="${OUTPUT_DIR}/tata-tcfzyq-${REVISION}.tar.gz"

cleanup() {
  rm -rf "${STAGING_DIR}"
}
trap cleanup EXIT

cd "${ROOT_DIR}"
pnpm build:tcfzyq

install -d -m 0755 \
  "${OUTPUT_DIR}" \
  "${STAGING_DIR}/h5" \
  "${STAGING_DIR}/admin" \
  "${STAGING_DIR}/apps/api/src" \
  "${STAGING_DIR}/data/coupons" \
  "${STAGING_DIR}/deploy/nginx" \
  "${STAGING_DIR}/deploy/systemd"

rsync -a \
  --exclude '.DS_Store' \
  --exclude 'assets/result-backgrounds/' \
  --exclude 'assets/figma/quiz-web.zip' \
  apps/h5/dist/tcfzyq/ "${STAGING_DIR}/h5/"
rsync -a --exclude '.DS_Store' apps/admin/dist/tcfzyq/ "${STAGING_DIR}/admin/"

install -m 0644 apps/api/src/server.mjs "${STAGING_DIR}/apps/api/src/server.mjs"
install -m 0644 data/coupons/coupons.json "${STAGING_DIR}/data/coupons/coupons.json"
install -m 0644 infra/nginx/tata-static-security.conf "${STAGING_DIR}/deploy/nginx/tata-static-security.conf"
install -m 0644 infra/nginx/tata-tcfzyq-routes.conf "${STAGING_DIR}/deploy/nginx/tata-tcfzyq-routes.conf"
install -m 0644 infra/nginx/tata-tcfzyq.conf "${STAGING_DIR}/deploy/nginx/tata-tcfzyq.conf"
install -m 0644 infra/systemd/tata-tcfzyq-api.service "${STAGING_DIR}/deploy/systemd/tata-tcfzyq-api.service"
install -m 0755 infra/scripts/deploy-tcfzyq-package.sh "${STAGING_DIR}/deploy.sh"

printf '%s\n' \
  "revision=${REVISION}" \
  "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "h5=https://tcfzyq.online/" \
  "admin=https://admin.tcfzyq.online/" \
  > "${STAGING_DIR}/BUILD_INFO"

COPYFILE_DISABLE=1 tar --no-xattrs -C "${STAGING_DIR}" -czf "${ARCHIVE}" .
shasum -a 256 "${ARCHIVE}" > "${ARCHIVE}.sha256"

printf 'Created %s\n' "${ARCHIVE}"
du -h "${ARCHIVE}"
