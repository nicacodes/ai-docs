# AI Blog - Contexto para Agentes AI

## Qué es este proyecto

Blog con **búsqueda semántica por IA** que corre 100% en el navegador (WebAssembly). El usuario escribe posts en Markdown y puede buscarlos por significado, no solo palabras clave.

## Stack principal

- **Astro 5** SSR + React 19 islands
- **Tailwind CSS v4** (usar `@theme inline`, colores OKLCH)
- **Milkdown** editor Markdown WYSIWYG
- **PostgreSQL + pgvector** para vectores
- **Drizzle ORM** type-safe
- **Nanostores** estado global cross-islands
- **Transformers.js** modelo `Xenova/multilingual-e5-small` (384 dims)

## Estructura de archivos clave

```
src/
├── pages/
│   ├── index.astro         # Home - lista posts (SSR)
│   ├── search.astro         # Búsqueda semántica
│   ├── new/index.astro      # Crear post
│   └── post/[slug].astro    # Ver/editar post
├── components/
│   ├── GlobalHeader.tsx     # Header con search + dark mode toggle
│   ├── PostList.tsx         # Lista de posts
│   ├── SearchResults.tsx    # Resultados con % similitud
│   └── ui/                  # Componentes shadcn-style
├── scripts/
│   ├── ai-embeddings.ts     # API: embedPost(), embedQuery()
│   ├── worker-rpc.ts        # Comunicación con worker
│   └── embeddings-store.ts  # Cache IndexedDB
├── store/
│   ├── search-store.ts      # $searchPhase, $isSearching
│   └── editor-store.ts      # $lastMarkdownSnapshot
├── db/
│   ├── schema.ts            # documents + documentEmbeddings
│   └── client.ts            # getDb() singleton
├── actions/documents.ts      # save, upsertEmbeddings, semanticSearch
└── styles/global.css         # Tema + dark mode + Milkdown styles

public/
└── embeddings-worker.js      # Web Worker con Transformers.js
```

## Reglas de código

### Imports

Usar alias `@/*` → `src/*`

### Base de datos

- Siempre usar `getDb()` de `src/db/client.ts`
- Nunca crear clients Postgres fuera de ese módulo

### Embeddings

- Modelo E5 requiere prefijos:
  - `passage: {texto}` para posts
  - `query: {texto}` para búsquedas
- Dimensiones: 384 (constante `EMBEDDING_DIMENSIONS`)

### Estado

- Usar Nanostores + `useStore()` de `@nanostores/react`
- Estados de búsqueda: `idle → loading-model → generating-embedding → searching → done`

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
```

## NO romper

1. `public/embeddings-worker.js` es ESM con `type: 'module'`
2. Si cambias modelo, actualizar `EMBEDDING_DIMENSIONS` + migración
3. Script de dark mode en `layout.astro` evita flash
4. Estilos Milkdown están fuera de `@layer` para override

## Flujo principal de búsqueda

```
Usuario busca → embedQuery("query: ...") → Worker genera vector WASM
              → Action semanticSearch() → pgvector similarity
              → Resultados con % similitud
```

## Flujo de guardado

```
Escribir → Debounce 2s → embedPost("passage: ...") → Cache IndexedDB
                       → Action upsertEmbeddings() → DB
```
