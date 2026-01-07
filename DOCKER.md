# 🐳 Docker - AI Docs

Guía para ejecutar AI Docs con Docker.

## Requisitos Previos

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

## Inicio Rápido

### 1. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.docker.example .env

# Editar con tus valores (especialmente BETTER_AUTH_SECRET en producción)
nano .env
```

### 2. Iniciar servicios

```bash
# Construir e iniciar todo
docker compose up -d

# O usar el Makefile
make up
```

### 3. Acceder a la aplicación

Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

## Comandos Útiles

| Comando                                                  | Descripción                |
| -------------------------------------------------------- | -------------------------- |
| `docker compose up -d`                                   | Inicia todos los servicios |
| `docker compose down`                                    | Detiene los servicios      |
| `docker compose logs -f app`                             | Ver logs de la aplicación  |
| `docker compose logs -f postgres`                        | Ver logs de PostgreSQL     |
| `docker compose exec app sh`                             | Shell en el contenedor     |
| `docker compose exec postgres psql -U aidocs -d ai_docs` | Acceso a PostgreSQL        |

### Con Makefile

```bash
make help      # Ver todos los comandos
make up        # Iniciar servicios
make down      # Detener servicios
make logs      # Ver logs de la app
make db-shell  # Acceso a PostgreSQL
make rebuild   # Reconstruir todo
make clean     # Limpiar todo (⚠️ borra datos)
```

## Estructura de Archivos

```
├── Dockerfile              # Imagen de la aplicación
├── docker-compose.yml      # Orquestación de servicios
├── docker-entrypoint.sh    # Script de inicio (migraciones)
├── .dockerignore           # Archivos excluidos del build
├── .env.docker.example     # Variables de entorno de ejemplo
├── Makefile                # Comandos de ayuda
└── docker/
    └── init-db.sql         # Script de inicialización de PostgreSQL
```

## Configuración

### Variables de Entorno

| Variable             | Descripción                          | Default                  |
| -------------------- | ------------------------------------ | ------------------------ |
| `POSTGRES_USER`      | Usuario de PostgreSQL                | `aidocs`                 |
| `POSTGRES_PASSWORD`  | Contraseña de PostgreSQL             | `aidocs_secret`          |
| `POSTGRES_DB`        | Nombre de la base de datos           | `ai_docs`                |
| `DB_PORT`            | Puerto expuesto de PostgreSQL        | `5432`                   |
| `APP_PORT`           | Puerto expuesto de la app            | `4321`                   |
| `BETTER_AUTH_URL`    | URL base de la aplicación            | `http://localhost:4321`  |
| `BETTER_AUTH_SECRET` | Secret para tokens JWT               | ⚠️ Cambiar en producción |
| `TRUSTED_ORIGINS`    | IPs permitidas (separadas por comas) | (vacío)                  |

### Acceso desde Red Local

Para acceder desde otros dispositivos en tu red local:

1. Obtén la IP de tu máquina: `ipconfig` (Windows) o `ip addr` (Linux)
2. Agrega la IP a `.env`:
   ```bash
   TRUSTED_ORIGINS=http://192.168.1.100:4321,http://10.11.15.80:4321
   ```
3. Reinicia los contenedores:
   ```bash
   docker compose down && docker compose up -d
   ```
4. Accede desde otro dispositivo: `http://TU_IP:4321`

## Embeddings Server-Side

**IMPORTANTE:** Los embeddings se generan en el servidor (no en el navegador),
lo que es **mucho más rápido** especialmente para red local.

### Cómo funciona:

1. **Primera inicialización (~10-30s)**: El servidor descarga el modelo de
   embeddings (~100MB) y lo cachea
2. **Requests siguientes (~100-500ms)**: El modelo ya está en memoria,
   respuestas rápidas
3. **Persistencia**: El modelo se almacena en un volumen Docker (`model_cache`)
   y no se descarga de nuevo

### Beneficios vs Navegador:

| Aspecto              | Servidor (Docker)         | Navegador (WASM)      |
| -------------------- | ------------------------- | --------------------- |
| Primera carga        | 10-30s (solo una vez)     | 10-60s (cada cliente) |
| Requests siguientes  | 100-500ms                 | 5-10s                 |
| Uso de red           | Una vez (servidor)        | Cada cliente descarga |
| Dispositivos móviles | ✅ Funciona perfecto      | ❌ Muy lento          |
| Múltiples usuarios   | ✅ Comparten mismo modelo | ❌ Cada uno descarga  |

### Verificar estado del modelo:

```bash
# Ver si el modelo está listo
curl http://localhost:4321/api/embeddings

# Respuesta:
# {"ready":true,"model":"Xenova/multilingual-e5-small","dimensions":384}
```

### Generar Secret Seguro

```bash
openssl rand -base64 32
```

## Desarrollo vs Producción

### Desarrollo Local (sin Docker)

```bash
pnpm install
pnpm dev
```

### Producción con Docker

1. Configura `.env` con valores seguros
2. Ejecuta `docker compose up -d`
3. Configura un reverse proxy (nginx/caddy) para HTTPS

## Volúmenes y Persistencia

Los datos de PostgreSQL se almacenan en un volumen Docker llamado
`postgres_data`.

```bash
# Ver volúmenes
docker volume ls | grep ai-docs

# Backup de la base de datos
docker compose exec postgres pg_dump -U aidocs ai_docs > backup.sql

# Restaurar backup
docker compose exec -T postgres psql -U aidocs ai_docs < backup.sql
```

## Troubleshooting

### La app no conecta a la base de datos

```bash
# Verificar que postgres esté healthy
docker compose ps

# Ver logs de postgres
docker compose logs postgres

# Reiniciar servicios
docker compose restart
```

### Errores de migración

```bash
# Ejecutar migraciones manualmente
docker compose exec app npx drizzle-kit migrate

# Ver estado de la BD
docker compose exec postgres psql -U aidocs -d ai_docs -c "\dt"
```

### Reconstruir desde cero

```bash
# ⚠️ Esto borra todos los datos
make clean
make up
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │                 │         │                         │   │
│  │   PostgreSQL    │◄───────►│      AI Docs App        │   │
│  │   (pgvector)    │  :5432  │      (Node.js)          │   │
│  │                 │         │                         │   │
│  └─────────────────┘         └─────────────────────────┘   │
│         │                              │                    │
└─────────┼──────────────────────────────┼────────────────────┘
          │                              │
          ▼                              ▼
    localhost:5432                 localhost:4321
    (opcional)                      (browser)
```
