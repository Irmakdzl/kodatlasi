#!/usr/bin/env sh
# KodAtlası - macOS / Linux için başlatma betiği
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[HATA] Node.js bulunamadi. https://nodejs.org adresinden kurun."
  exit 1
fi

node server.js --open
