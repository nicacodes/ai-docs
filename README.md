<p align="center">
  <h1 align="center">✨ AI Blog</h1>
  <p align="center">
    <strong>Blog potenciado por IA con búsqueda semántica y editor Markdown avanzado</strong>
  </p>
  <p align="center">
    <a href="#características">Características</a> •
    <a href="#tecnologías">Tecnologías</a> •
    <a href="#instalación">Instalación</a> •
    <a href="#uso">Uso</a> •
    <a href="#arquitectura">Arquitectura</a>
  </p>
</p>

<br />

<p align="center">
  <img src="https://img.shields.io/badge/Astro-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

## 🚀 Descripción

**AI Blog** es una plataforma de blogging moderna que integra inteligencia artificial para ofrecer una experiencia única de escritura y búsqueda. Utiliza embeddings semánticos generados directamente en el navegador para permitir búsquedas inteligentes que entienden el contexto y significado de tus consultas.

### ¿Por qué AI Blog?

- 🧠 **Búsqueda Semántica**: No solo busca palabras clave, entiende el significado de tu consulta
- ⚡ **IA en el Navegador**: Los embeddings se generan localmente usando WebAssembly, sin enviar datos a servidores externos
- ✍️ **Editor Rico**: Milkdown ofrece una experiencia de edición Markdown fluida y moderna
- 🌙 **Dark Mode**: Soporte completo para modo oscuro con transiciones suaves

---

## ✨ Características

### 🔍 Búsqueda Semántica con IA

- Búsqueda inteligente usando el modelo **Xenova/multilingual-e5-small**
- Embeddings generados directamente en el navegador (WebAssembly)
- Similitud vectorial con pg_vector en PostgreSQL
- Sin dependencias de APIs externas de IA

### 📝 Editor Markdown Avanzado

- Powered by **Milkdown** - editor WYSIWYG moderno
- Soporte para código, tablas, listas y más
- Auto-guardado con sincronización a la base de datos
- Generación automática de embeddings al escribir

### 🎨 Diseño Moderno

- Interfaz responsive con **Tailwind CSS v4**
- Componentes UI con **Radix UI** y **shadcn/ui**
- Animaciones fluidas con **Motion** (Framer Motion)
- Header con transparencia dinámica al hacer scroll

### 🗄️ Persistencia y Base de Datos

- **Drizzle ORM** para type-safety completo
- Esquema optimizado con índices para búsqueda vectorial
- Cache de embeddings en IndexedDB para rendimiento
- Migraciones automáticas

---

## 🛠️ Tecnologías

| Categoría         | Tecnología                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Framework**     | [Astro](https://astro.build) (SSR con Node adapter)                                      |
| **UI Library**    | [React 19](https://react.dev)                                                            |
| **Styling**       | [Tailwind CSS v4](https://tailwindcss.com)                                               |
| **Editor**        | [Milkdown](https://milkdown.dev)                                                         |
| **Database**      | [PostgreSQL](https://postgresql.org) + [pg_vector](https://github.com/pgvector/pgvector) |
| **ORM**           | [Drizzle](https://orm.drizzle.team)                                                      |
| **AI/ML**         | [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js)              |
| **State**         | [Nanostores](https://github.com/nanostores/nanostores)                                   |
| **UI Components** | [Radix UI](https://radix-ui.com) + [shadcn/ui](https://ui.shadcn.com)                    |
| **Animations**    | [Motion](https://motion.dev)                                                             |
| **Icons**         | [Lucide React](https://lucide.dev)                                                       |

---

## 📦 Instalación

### Prerrequisitos

- **Node.js** 18+
- **pnpm** (recomendado)
- **PostgreSQL** con extensión **pgvector**

### Pasos

1. **Clona el repositorio**

   ```bash
   git clone https://github.com/tu-usuario/ai-blog.git
   cd ai-blog
   ```

2. **Instala dependencias**

   ```bash
   pnpm install
   ```

3. **Configura las variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Edita `.env` con tu configuración:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/ai_blog
   ```

4. **Configura la base de datos**

   ```bash
   # Genera las migraciones
   pnpm db:generate

   # Ejecuta las migraciones
   pnpm db:migrate
   ```

5. **Inicia el servidor de desarrollo**

   ```bash
   pnpm dev
   ```

   Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

---

## 📖 Uso

### Comandos Disponibles

| Comando            | Descripción                                       |
| ------------------ | ------------------------------------------------- |
| `pnpm dev`         | Inicia servidor de desarrollo en `localhost:4321` |
| `pnpm build`       | Compila el sitio para producción en `./dist/`     |
| `pnpm preview`     | Preview de la build de producción                 |
| `pnpm db:generate` | Genera migraciones de Drizzle                     |
| `pnpm db:migrate`  | Ejecuta migraciones pendientes                    |
| `pnpm db:studio`   | Abre Drizzle Studio para gestionar la DB          |

### Flujo de Trabajo

1. **Crear un Post**: Haz clic en "Nuevo Post" desde la página principal
2. **Escribir**: Usa el editor Markdown para redactar tu contenido
3. **Guardar**: El auto-guardado sincroniza tu trabajo automáticamente
4. **Buscar**: Usa la búsqueda semántica para encontrar posts relacionados

---

## 🏗️ Arquitectura

```
src/
├── actions/           # Server actions (Astro Actions)
├── components/        # Componentes React
│   ├── ui/           # Componentes base (shadcn/ui)
│   ├── GlobalHeader  # Header con búsqueda
│   ├── PostList      # Lista de posts
│   └── SearchResults # Resultados de búsqueda semántica
├── db/               # Configuración de base de datos
│   ├── schema.ts     # Esquema Drizzle (documents, embeddings)
│   └── client.ts     # Cliente de PostgreSQL
├── lib/              # Utilidades
│   ├── editor-actions.ts  # Acciones del editor
│   └── embedding-utils.ts # Utilidades para embeddings
├── pages/            # Rutas de Astro
│   ├── index.astro   # Página principal
│   ├── new/          # Crear nuevo post
│   ├── post/         # Vista/edición de post
│   └── search.astro  # Página de búsqueda
├── scripts/          # Web Workers y lógica de AI
│   ├── ai-embeddings.ts    # API de embeddings
│   ├── embeddings-store.ts # Cache IndexedDB
│   └── worker-rpc.ts       # Comunicación con Worker
├── store/            # Estado global (Nanostores)
└── styles/           # Estilos globales
```

### Flujo de Embeddings

```mermaid
sequenceDiagram
    participant User
    participant Editor
    participant Worker as Web Worker
    participant Model as E5 Model
    participant DB as PostgreSQL

    User->>Editor: Escribe contenido
    Editor->>Editor: Debounce (2s)
    Editor->>Worker: Solicita embedding
    Worker->>Model: Genera embedding (WASM)
    Model-->>Worker: Vector 384d
    Worker-->>Editor: Embedding generado
    Editor->>DB: Guarda post + embedding
```

---

## 🔧 Configuración Avanzada

### Modelo de Embeddings

Por defecto se usa `Xenova/multilingual-e5-small` (384 dimensiones). Puedes cambiarlo en `src/scripts/ai-embeddings.ts`:

```typescript
const DEFAULT_MODEL: EmbeddingModelConfig = {
  modelId: "Xenova/multilingual-e5-small",
  device: "wasm", // o 'webgpu' si tu navegador lo soporta
};
```

### PostgreSQL con pgvector

Asegúrate de tener la extensión pgvector instalada:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  Hecho con ❤️ y ✨ AI
</p>
