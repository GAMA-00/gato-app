#!/usr/bin/env bash
# Corre los tests de integración del simulador en 1 comando: `npm test`
# Se encarga de verificar Docker + levantar Supabase local si hace falta.
set -e
SUPABASE="$HOME/.local/share/supabase/supabase"

echo "🔍 Verificando Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker no está corriendo. Abrí Docker Desktop (open -a Docker), esperá ~1 min y reintentá."
  exit 1
fi

echo "🔍 Verificando Supabase local..."
if ! curl -s -o /dev/null "http://127.0.0.1:54321/rest/v1/" 2>/dev/null; then
  echo "⏳ Levantando Supabase local..."
  (cd "$(dirname "$0")" && "$SUPABASE" start >/dev/null 2>&1) || { echo "❌ No pude levantar Supabase"; exit 1; }
fi

echo "🧪 Corriendo suite de integración..."
node "$(dirname "$0")/tests/integration.mjs"
