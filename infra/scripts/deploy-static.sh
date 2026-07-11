#!/usr/bin/env bash

set -euo pipefail

readonly REPO_URL="https://github.com/joymagic/TATA-H5.git"
readonly REPO_DIR="/srv/tata-h5/repo"
readonly TEST_DIR="/srv/tata-h5/test"
readonly PRODUCTION_DIR="/srv/tata-h5/production"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  install -d -m 0755 "$(dirname "${REPO_DIR}")"
  git clone "${REPO_URL}" "${REPO_DIR}"
fi

cd "${REPO_DIR}"
git checkout main
git pull --ff-only origin main

pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build:deploy

install -d -m 0755 \
  "${TEST_DIR}/h5" \
  "${TEST_DIR}/admin" \
  "${PRODUCTION_DIR}/h5" \
  "${PRODUCTION_DIR}/admin"

# --delete intentionally clears stale static files in the isolated test and production targets.
rsync -a --delete apps/h5/dist/testing/ "${TEST_DIR}/h5/"
rsync -a --delete apps/admin/dist/testing/ "${TEST_DIR}/admin/"
rsync -a --delete apps/h5/dist/production/ "${PRODUCTION_DIR}/h5/"
rsync -a --delete apps/admin/dist/production/ "${PRODUCTION_DIR}/admin/"

install -m 0644 infra/nginx/tata-static-security.conf /etc/nginx/snippets/tata-static-security.conf
install -m 0644 infra/nginx/tata-static-routes.conf /etc/nginx/snippets/tata-static-routes.conf
install -m 0644 infra/nginx/tata-static.conf /etc/nginx/sites-available/tata-h5.conf
ln -sfn /etc/nginx/sites-available/tata-h5.conf /etc/nginx/sites-enabled/tata-h5.conf

nginx -t
systemctl reload nginx

git rev-parse HEAD
