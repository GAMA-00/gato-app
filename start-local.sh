#!/usr/bin/env bash
# Enciende TODO el simulador en un comando: base local + app.
# Uso:  bash start-local.sh   (o:  npm run start:local)
set -e
cd "$(dirname "$0")"
SUPABASE="$HOME/.local/share/supabase/supabase"

echo "🔍 1/4 Verificando Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "   Docker no está corriendo. Lo abro..."
  open -a Docker 2>/dev/null || true
  echo "   ⏳ Esperando a que Docker arranque (puede tardar ~1 min)..."
  until docker info >/dev/null 2>&1; do sleep 3; done
fi
echo "   ✅ Docker listo"

echo "🔍 2/4 Levantando base de datos local (Supabase)..."
"$SUPABASE" start >/dev/null 2>&1 || true
echo "   ✅ Base local lista"

# Sembrar datos demo la primera vez (sin requerir psql en tu compu: usa el contenedor)
DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
if [ -n "$DB_CONTAINER" ]; then
  HAS_DEMO="$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -tAc "select 1 from users where slug='demo'" 2>/dev/null | tr -d '[:space:]')"
  if [ "$HAS_DEMO" != "1" ]; then
    echo "   🌱 Cargando datos demo (primera vez)..."
    docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < supabase/rebuild/seed_demo.sql >/dev/null 2>&1 || true
    echo "   ✅ Datos demo cargados"
  fi
fi

echo "🔍 3/4 Configurando conexión del frontend (.env.local)..."
if [ ! -f .env.local ]; then
  {
    echo "VITE_SUPABASE_URL=http://127.0.0.1:54321"
    "$SUPABASE" status -o env | grep '^ANON_KEY=' | sed 's/^ANON_KEY=/VITE_SUPABASE_ANON_KEY=/' | tr -d '"'
  } > .env.local
  echo "   ✅ .env.local creado"
else
  echo "   ✅ .env.local ya existe"
fi

echo "🔍 4/4 Iniciando la app..."
echo ""
echo "   👉 Abrí en el navegador: http://localhost:8080"
echo "   👉 Booking demo:        http://localhost:8080/demo"
echo "   👉 Ver la base (Studio): http://127.0.0.1:54323"
echo ""
echo "   (Dejá esta ventana abierta. Para apagar: Ctrl+C)"
echo ""
npm run dev
