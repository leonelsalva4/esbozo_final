#!/bin/bash
# Inicio de desarrollo. Requiere conexión y datos preparados según SETUP.md.
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

[ -d node_modules ]         || npm ci
[ -d backend/node_modules ] || (cd backend && npm ci)
[ -d desktop/node_modules ] || (cd desktop && npm ci)
[ -f backend/.env ]         || cp backend/.env.example backend/.env

npm run dev
