import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

function readDatabaseUrl() {
  // En Astro server-side, `import.meta.env` es la vía recomendada.
  // En Node (drizzle-kit), seguirá siendo `process.env`.
  return (import.meta.env?.DATABASE_URL ?? process.env.DATABASE_URL) as
    | string
    | undefined;
}

function createDb(url: string): Db {
  const queryClient = postgres(url, {
    // En desarrollo, evitamos abrir demasiadas conexiones por HMR.
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
  });

  return drizzle(queryClient, { schema });
}

const globalForDb = globalThis as unknown as { __aiEditorDb?: Db };

export function getDb(): Db {
  if (globalForDb.__aiEditorDb) return globalForDb.__aiEditorDb;

  const url = readDatabaseUrl();
  if (!url) {
    throw new Error(
      'DATABASE_URL no está configurada. Crea un archivo .env con DATABASE_URL (server-only) o define la variable en tu entorno.',
    );
  }

  const db = createDb(url);

  // Cache global para evitar reconexiones por HMR.
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__aiEditorDb = db;
  }

  return db;
}
