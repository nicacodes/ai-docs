# AI Docs - Contexto para Agentes AI

## Qué es este proyecto

Blog con **búsqueda semántica por IA** que se ejecuta en el servidor Docker. El
usuario escribe posts en Markdown y puede buscarlos por significado, no solo
palabras clave. Los embeddings se generan en el servidor usando
@huggingface/transformers en Node.js.

## Stack principal

- **Astro 5** SSR + React 19 islands en modo standalone (Node.js)
- **Tailwind CSS v4** (usar `@theme inline`, colores OKLCH)
- **Milkdown** editor Markdown WYSIWYG
- **PostgreSQL + pgvector** para vectores
- **Drizzle ORM** type-safe
- **Nanostores** estado global cross-islands
- **@huggingface/transformers** modelo `Xenova/multilingual-e5-small` (384 dims)
  en servidor

## Estructura de archivos clave

```
src/
├── pages/
│   ├── index.astro             # Home - lista posts (SSR)
│   ├── search.astro            # Búsqueda semántica
│   ├── new/index.astro         # Crear post
│   ├── post/[slug].astro       # Ver/editar post
│   └── api/embeddings.ts       # API para generar embeddings
├── components/
│   ├── GlobalHeader.tsx        # Header con search + dark mode toggle
│   ├── PostList.tsx            # Lista de posts
│   ├── SearchResults.tsx       # Resultados con % similitud
│   └── ui/                     # Componentes shadcn-style
├── scripts/
│   ├── ai-embeddings.ts        # Cliente: embedPost(), embedQuery()
│   ├── embeddings-api-client.ts # Cliente HTTP para /api/embeddings
│   └── embeddings-store.ts     # Cache IndexedDB (opcional)
├── lib/
│   └── embeddings-server.ts    # Servidor: pipeline Transformers.js
├── store/
│   ├── search-store.ts         # $searchPhase, $isSearching
│   └── editor-store.ts         # $lastMarkdownSnapshot
├── db/
│   ├── schema.ts               # documents + documentEmbeddings
│   └── client.ts               # getDb() singleton con pooling
├── actions/documents.ts         # save, upsertEmbeddings, semanticSearch
└── styles/global.css            # Tema + dark mode + Milkdown styles
```

## Reglas de código

### Imports

Usar alias `@/*` → `src/*`

### Base de datos

- Siempre usar `getDb()` de `src/db/client.ts`
- Nunca crear clients Postgres fuera de ese módulo
- Pool configurado con max: 20 conexiones, idle_timeout: 20s

### Embeddings (Servidor)

- **TODO corre en el servidor Docker** - NO en el navegador
- Modelo E5 requiere prefijos:
  - `passage: {texto}` para posts
  - `query: {texto}` para búsquedas
- Dimensiones: 384 (constante `EMBEDDING_DIMENSIONS`)
- API endpoint: `POST /api/embeddings` (texto → vector)
- Cache del modelo en `/app/.cache` (volumen Docker persistente)
- Usar `device: 'server'` en metadatos de embeddings

### Estado

- Usar Nanostores + `useStore()` de `@nanostores/react`
- Estados de búsqueda: `idle → generating-embedding → searching → done`

### UI/Estilos

- Componentes estilo shadcn con CVA
- Usar `cn()` de `@/lib/utils` para clases
- Dark mode con clase `.dark` en `<html>`

## Comandos

```bash
pnpm dev          # localhost:4321
pnpm db:generate  # Migraciones
pnpm db:migrate   # Aplicar
pnpm db:studio    # UI Drizzle
docker compose up # Servidor con PostgreSQL + modelo AI
```

## NO romper

1. El modelo se carga SOLO en el servidor - NO en el navegador
2. Si cambias modelo, actualizar `EMBEDDING_DIMENSIONS` + migración
3. Script de dark mode en `layout.astro` evita flash
4. Estilos Milkdown están fuera de `@layer` para override
5. PostgreSQL max_connections=200, pool client max=20

## Flujo principal de búsqueda

```
Usuario busca → embedQuery() → POST /api/embeddings → Servidor genera vector
              → Action semanticSearch() → pgvector similarity
              → Resultados con % similitud
```

## Flujo de guardado

```
Escribir → Debounce 2s → embedPost() → POST /api/embeddings
                       → Cache IndexedDB (opcional)
                       → Action upsertEmbeddings() → DB
```
