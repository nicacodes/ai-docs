#!/bin/sh
set -e

echo "🚀 Iniciando AI Docs..."

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a PostgreSQL..."
until nc -z ${DB_HOST:-postgres} ${DB_PORT:-5432}; do
  echo "   PostgreSQL no disponible, reintentando en 2s..."
  sleep 2
done
echo "✅ PostgreSQL disponible"

# Ejecutar migraciones de base de datos
echo "📦 Ejecutando migraciones de base de datos..."
npx drizzle-kit migrate

echo "✅ Migraciones completadas"
echo "🌐 Iniciando servidor en puerto ${PORT:-4321}..."

# Ejecutar el comando pasado
exec "$@"
