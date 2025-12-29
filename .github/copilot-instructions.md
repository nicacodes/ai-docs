# Instrucciones para Agentes AI (ai-blog)

> **Objetivo**: Mantener contexto completo sobre diseño, arquitectura, idea general, archivos y tecnologías del proyecto.

---

## 🎯 Visión del Proyecto

**AI Blog** es una plataforma de blogging moderna con IA integrada que permite:

- Escribir posts con un editor Markdown avanzado (Milkdown)
- Búsqueda semántica usando embeddings generados en el navegador
- Experiencia de usuario premium con dark mode y animaciones fluidas

La **propuesta de valor única** es que **toda la IA corre localmente en el navegador** usando WebAssembly, sin enviar datos a servidores externos.

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │   Astro     │   │   React     │   │     Web Worker          ││
│  │   Islands   │◄──┤  Components │◄──┤  (embeddings-worker.js) ││
│  │   (SSR)     │   │  (Islands)  │   │  + Transformers.js      ││
│  └─────────────┘   └──────┬──────┘   └───────────┬─────────────┘│
│                           │                       │              │
│                    ┌──────▼──────┐         ┌─────▼─────┐        │
│                    │ Nanostores  │         │ IndexedDB │        │
│                    │ (Global     │         │ (Cache de │        │
│                    │  State)     │         │ Embeddings)│       │
│                    └─────────────┘         └───────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Astro Actions   │
                    │   (Server RPCs)   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL      │
                    │   + pgvector      │
                    │   (Drizzle ORM)   │
                    └───────────────────┘
```

---

## 📁 Estructura de Archivos Clave

### 🌐 Páginas (Astro SSR)

| Archivo                       | Descripción                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `src/pages/index.astro`       | **Home page** - Lista de posts con SSR, componente `<PostList>` |
| `src/pages/new/index.astro`   | Crear nuevo post                                                |
| `src/pages/post/[slug].astro` | Vista/edición de un post existente                              |
| `src/pages/search.astro`      | Página de búsqueda semántica                                    |

### 🧩 Componentes React (Islands)

| Archivo                            | Descripción                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/components/GlobalHeader.tsx`  | Header global con búsqueda, home y mode toggle. Tiene animación de borde cónico cuando busca. |
| `src/components/editor-header.tsx` | Header específico del editor con menubar y acciones                                           |
| `src/components/PostList.tsx`      | Lista de posts con estado local de búsqueda                                                   |
| `src/components/PostCard.tsx`      | Card de post para la lista principal                                                          |
| `src/components/PostItem.tsx`      | Item de post para resultados de búsqueda                                                      |
| `src/components/SearchResults.tsx` | Componente de búsqueda semántica con fases                                                    |
| `src/components/NewPostButton.tsx` | Botón para crear nuevo post                                                                   |
| `src/components/btn-save-doc.tsx`  | Botón de guardado con estados                                                                 |
| `src/components/document-info.tsx` | Info del documento (embeddings, etc.)                                                         |

### 🎨 Componentes UI (shadcn/ui style)

| Archivo                               | Descripción                |
| ------------------------------------- | -------------------------- |
| `src/components/ui/button.tsx`        | Botón con variantes (CVA)  |
| `src/components/ui/card.tsx`          | Card container             |
| `src/components/ui/dropdown-menu.tsx` | Dropdown menu (Radix)      |
| `src/components/ui/menubar.tsx`       | Menubar del editor (Radix) |
| `src/components/ui/mode-toggle.tsx`   | Toggle dark/light mode     |
| `src/components/ui/progress.tsx`      | Barra de progreso          |
| `src/components/ui/skeleton.tsx`      | Skeleton loading           |
| `src/components/ui/spinner.tsx`       | Spinner animado            |

### 🤖 Sistema de Embeddings (IA)

| Archivo                           | Descripción                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `public/embeddings-worker.js`     | **Web Worker** - Carga Transformers.js y genera embeddings                          |
| `src/scripts/ai-embeddings.ts`    | **API principal** - `embedPost()`, `embedQuery()`, `subscribeDebouncedEmbeddings()` |
| `src/scripts/worker-rpc.ts`       | Cliente RPC para comunicación con el worker                                         |
| `src/scripts/embeddings-store.ts` | Cache de embeddings en IndexedDB                                                    |

### 💾 Base de Datos

| Archivo            | Descripción                                        |
| ------------------ | -------------------------------------------------- |
| `src/db/schema.ts` | Schema Drizzle: `documents` y `documentEmbeddings` |
| `src/db/client.ts` | Cliente PostgreSQL singleton (con cache HMR)       |
| `drizzle/`         | Migraciones SQL                                    |

### ⚡ Astro Actions (Server)

| Archivo                    | Descripción                                                |
| -------------------------- | ---------------------------------------------------------- |
| `src/actions/documents.ts` | CRUD de documentos + `upsertEmbeddings` + `semanticSearch` |

### 🗃️ Estado Global (Nanostores)

| Archivo                     | Descripción                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `src/store/editor-store.ts` | Estado del editor: `$lastMarkdownSnapshot`, etc.                   |
| `src/store/search-store.ts` | Estado de búsqueda: `$searchPhase`, `$searchQuery`, `$isSearching` |
| `src/store/draft-store.ts`  | Borradores locales                                                 |

### 🎨 Estilos

| Archivo                 | Descripción                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `src/styles/global.css` | **CSS principal** - Tailwind v4 + tema OKLCH + estilos Milkdown dark mode |

---

## 🛠️ Stack Tecnológico

| Capa              | Tecnología      | Versión/Notas                                   |
| ----------------- | --------------- | ----------------------------------------------- |
| **Framework**     | Astro           | v5+ con SSR (`output: 'server'`) + adapter Node |
| **UI**            | React           | v19 (Islands architecture)                      |
| **Styling**       | Tailwind CSS    | **v4** con `@theme inline` y colores OKLCH      |
| **Editor**        | Milkdown Crepe  | Editor Markdown WYSIWYG                         |
| **Database**      | PostgreSQL      | Con extensión **pgvector**                      |
| **ORM**           | Drizzle         | Type-safe con migraciones                       |
| **State**         | Nanostores      | Estado global cross-island                      |
| **AI Model**      | Transformers.js | `Xenova/multilingual-e5-small` (384 dims)       |
| **Animations**    | Motion (Framer) | Animaciones de UI                               |
| **UI Components** | Radix UI        | Primitivos accesibles                           |
| **Icons**         | Lucide React    | Iconos SVG                                      |

---

## 🎨 Sistema de Diseño

### Colores (OKLCH)

- Definidos en `src/styles/global.css` con variables CSS
- Soporte completo de **dark mode** via clase `.dark` en `<html>`
- Paleta neutral con acentos semánticos

### Tipografía

- Font principal: **Inter** (via `astro:assets` Font)
- Headers: `font-weight: 900` con `font-serif`

### Patrones de UI

- **Glassmorphism**: `bg-background/60 backdrop-blur-2xl`
- **Borders sutiles**: `border-border/40`
- **Transiciones suaves**: `transition-all duration-300 ease-out`
- **Header sticky con transparencia animada** al hacer scroll

### Dark Mode

- Detección automática + persistencia en `localStorage`
- Script inline en `layout.astro` para evitar flash
- Estilos específicos para Milkdown/CodeMirror

---

## 🔄 Flujos Principales

### 1. Guardar Post + Generar Embeddings

```
Usuario escribe → Debounce (2s) → embedPost() → Worker genera vector
                                              → Cache en IndexedDB
                                              → Subir a server via Action
                                              → Guardar en document_embeddings
```

### 2. Búsqueda Semántica

```
Usuario busca → embedQuery("query: ...") → Vector de búsqueda
                                         → Action semanticSearch()
                                         → pgvector similarity search
                                         → Resultados con % similitud
```

### 3. Estados de Búsqueda (search-store.ts)

```
idle → loading-model → generating-embedding → searching → done/error
```

El `GlobalHeader` muestra animación de borde cónico durante `$isSearching`.

---

## ⚙️ Configuración

### Variables de Entorno

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_blog
```

### Comandos

```bash
pnpm dev          # Dev server (localhost:4321)
pnpm build        # Build producción
pnpm db:generate  # Generar migraciones
pnpm db:migrate   # Aplicar migraciones
pnpm db:studio    # UI de Drizzle
```

---

## 📏 Convenciones de Código

### Imports

- Usar alias `@/*` → `src/*` (configurado en `tsconfig.json`)

### Server Actions

- Definir con `defineAction` + validación Zod
- Usar `ActionError` con códigos semánticos (`NOT_FOUND`, `CONFLICT`, etc.)
- En producción, no filtrar detalles de errores de DB

### Base de Datos

- **Siempre** usar `getDb()` de `src/db/client.ts`
- Nunca crear clients Postgres fuera de ese módulo

### Embeddings

- Modelo E5 requiere prefijos:
  - `passage: ...` para contenido de posts
  - `query: ...` para búsquedas
- Dimensiones: **384** (definido en `EMBEDDING_DIMENSIONS`)

### Estado

- Usar Nanostores para estado cross-component
- Hook `useStore()` de `@nanostores/react`

### Componentes UI

- Estilo shadcn/ui con CVA (class-variance-authority)
- Usar `cn()` de `@/lib/utils` para combinar clases

---

## ⚠️ Cosas a NO Romper

1. **Worker de embeddings** (`public/embeddings-worker.js`):

   - Es ESM y usa CDN de Transformers.js
   - Mantener `new Worker(url, { type: 'module' })`

2. **Dimensiones de embeddings**:

   - Si cambias el modelo, actualizar `EMBEDDING_DIMENSIONS` en schema + nueva migración

3. **Dark mode**:

   - Script inline en `layout.astro` evita flash
   - Los estilos de Milkdown están fuera de `@layer` para override

4. **Flujo de búsqueda**:

   - El estado en `search-store.ts` controla la UI del header
   - No romper la secuencia de fases

5. **SSR**:
   - `index.astro` tiene `export const prerender = false`
   - Los datos iniciales se pasan como props a los islands

---

## 🔍 Dónde Mirar Primero

| Necesidad         | Archivos                                                          |
| ----------------- | ----------------------------------------------------------------- |
| UI principal      | `src/pages/index.astro`, `src/components/PostList.tsx`            |
| Header/navegación | `src/components/GlobalHeader.tsx`                                 |
| Editor            | `src/pages/post/[slug].astro`, `src/components/editor-header.tsx` |
| Búsqueda          | `src/pages/search.astro`, `src/components/SearchResults.tsx`      |
| Embeddings        | `src/scripts/ai-embeddings.ts`, `public/embeddings-worker.js`     |
| Estado            | `src/store/search-store.ts`, `src/store/editor-store.ts`          |
| DB/Actions        | `src/actions/documents.ts`, `src/db/schema.ts`                    |
| Estilos           | `src/styles/global.css`                                           |

---

## 🎯 Decisiones de Diseño Importantes

1. **IA en el navegador**: Privacidad + sin costos de API + funciona offline después de cachear modelo

2. **Astro Islands**: Solo hidratar lo interactivo, mejor performance

3. **Nanostores**: Estado ligero que funciona en Astro Islands sin Context

4. **Tailwind v4**: Nuevo sistema de temas con `@theme inline` y OKLCH

5. **E5 Multilingual**: Modelo pequeño (384 dims) que funciona bien en español/inglés

6. **IndexedDB cache**: Evita regenerar embeddings para contenido ya procesado

---

## 📝 Notas para Futuras Mejoras

- [ ] Considerar WebGPU para embeddings más rápidos (si el browser lo soporta)
- [ ] Añadir paginación infinita en la lista de posts
- [ ] Implementar SSG para posts antiguos (híbrido SSR/SSG)
- [ ] Añadir categorías/tags a los posts
