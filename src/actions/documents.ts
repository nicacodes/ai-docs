/**
 * Document Actions - Astro Server Actions for document management.
 *
 * Este módulo define las acciones del servidor para gestionar documentos y sus embeddings.
 * La lógica de base de datos está delegada a los repositorios en src/db/.
 */

import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

// Auth
import { auth } from '../lib/auth';

// Repositories
import {
  getDocumentBySlug,
  listDocuments,
  createDocument,
  updateDocument,
  documentExists,
  type DocumentRow,
} from '../db/documents';
import {
  upsertEmbeddings,
  validateEmbeddingDimensions,
  EMBEDDING_DIMENSIONS,
} from '../db/embeddings';
import { semanticSearch, getSearchSuggestions } from '../db/semantic-search';
import { pickDbError } from '../db/utils';
import { extractExcerpt } from '../lib/embedding-utils';

// ============================================================================
// Schemas (Zod validation)
// ============================================================================

const saveInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  title: z.string().min(1),
  rawMarkdown: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const embeddingItemSchema = z.object({
  chunkIndex: z.number().int().min(0),
  chunkText: z.string().min(1),
  embedding: z.array(z.number()),
  modelId: z.string().min(1),
  device: z.string().min(1),
  pooling: z.string().optional(),
  normalize: z.boolean().optional(),
});

const upsertEmbeddingsSchema = z.object({
  documentId: z.string().uuid(),
  items: z.array(embeddingItemSchema).min(1).max(32),
});

const listInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
  tagSlug: z.string().optional(),
});

const getBySlugSchema = z.object({
  slug: z.string().min(1),
});

const semanticSearchSchema = z.object({
  queryEmbedding: z.array(z.number()),
  limit: z.number().int().min(1).max(50).default(10),
  filters: z
    .object({
      tagSlugs: z.array(z.string()).optional(),
      authorId: z.string().optional(),
      dateFrom: z.string().optional(), // ISO date string
      dateTo: z.string().optional(), // ISO date string
      minSimilarity: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const suggestionsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).default(5),
});

// ============================================================================
// Helpers
// ============================================================================

function toDocumentWithExcerpt(doc: DocumentRow) {
  return {
    ...doc,
    excerpt: extractExcerpt(doc.rawMarkdown, 160),
  };
}

// ============================================================================
// Actions
// ============================================================================

export const documentsActions = {
  /**
   * Guarda un documento (crea nuevo o actualiza existente).
   * El authorId se obtiene automáticamente de la sesión del usuario.
   */
  save: defineAction({
    input: saveInputSchema,
    handler: async ({ id, slug, title, rawMarkdown, metadata }, context) => {
      // Obtener el usuario autenticado desde la sesión
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });
      const authorId = session?.user?.id ?? null;

      // Update existing document
      if (id) {
        const updated = await updateDocument(id, {
          title,
          rawMarkdown,
          metadata,
        });

        if (!updated) {
          throw new ActionError({
            code: 'NOT_FOUND',
            message: 'Documento no encontrado.',
          });
        }

        return updated;
      }

      // Create new document (incluye authorId)
      try {
        return await createDocument({
          slug,
          title,
          rawMarkdown,
          metadata,
          authorId,
        });
      } catch (err) {
        const dbErr = pickDbError(err);

        // Handle unique violation (slug already exists)
        if (dbErr.code === '23505') {
          throw new ActionError({
            code: 'CONFLICT',
            message: 'El slug ya existe. Intenta guardar de nuevo.',
          });
        }

        // Handle missing pgcrypto extension
        if (
          dbErr.code === '42883' &&
          dbErr.message?.includes('gen_random_uuid')
        ) {
          throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'La BD no tiene habilitada la extensión pgcrypto. Ejecuta `pnpm db:migrate`.',
          });
        }

        console.error('documents.save failed', err);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error guardando el documento.',
        });
      }
    },
  }),

  /**
   * Inserta o actualiza embeddings para un documento.
   */
  upsertEmbeddings: defineAction({
    input: upsertEmbeddingsSchema,
    handler: async ({ documentId, items }) => {
      // Verify document exists
      const exists = await documentExists(documentId);
      if (!exists) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Documento no encontrado para embeddings.',
        });
      }

      // Validate embedding dimensions
      for (const item of items) {
        if (!validateEmbeddingDimensions(item.embedding)) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: `Dimensión inválida del embedding. Esperado ${EMBEDDING_DIMENSIONS}, recibido ${item.embedding.length}.`,
          });
        }
      }

      const count = await upsertEmbeddings({ documentId, items });
      return { upserted: count };
    },
  }),

  /**
   * Lista documentos con paginación y búsqueda opcional.
   * Opcionalmente filtra por etiqueta (tagSlug).
   */
  list: defineAction({
    input: listInputSchema,
    handler: async ({ limit, offset, search, tagSlug }) => {
      const docs = await listDocuments({ limit, offset, search, tagSlug });
      return docs.map(toDocumentWithExcerpt);
    },
  }),

  /**
   * Obtiene un documento por su slug.
   */
  getBySlug: defineAction({
    input: getBySlugSchema,
    handler: async ({ slug }) => {
      const doc = await getDocumentBySlug(slug);

      if (!doc) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Documento no encontrado.',
        });
      }

      return doc;
    },
  }),

  /**
   * Realiza búsqueda semántica usando embeddings.
   * Soporta filtros opcionales: tags, autor, rango de fechas.
   */
  semanticSearch: defineAction({
    input: semanticSearchSchema,
    handler: async ({ queryEmbedding, limit, filters }) => {
      if (!validateEmbeddingDimensions(queryEmbedding)) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: `Dimensión inválida del embedding. Esperado ${EMBEDDING_DIMENSIONS}, recibido ${queryEmbedding.length}.`,
        });
      }

      try {
        // Convertir fechas de string ISO a Date
        const parsedFilters = filters
          ? {
              ...filters,
              dateFrom: filters.dateFrom
                ? new Date(filters.dateFrom)
                : undefined,
              dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
            }
          : undefined;

        return await semanticSearch(queryEmbedding, limit, parsedFilters);
      } catch (err) {
        console.error('semanticSearch failed', err);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error realizando búsqueda semántica.',
        });
      }
    },
  }),

  /**
   * Obtiene sugerencias de autocompletado basadas en títulos.
   */
  getSuggestions: defineAction({
    input: suggestionsSchema,
    handler: async ({ query, limit }) => {
      try {
        return await getSearchSuggestions(query, limit);
      } catch (err) {
        console.error('getSuggestions failed', err);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error obteniendo sugerencias.',
        });
      }
    },
  }),

  /**
   * Elimina un documento.
   * Solo el autor puede eliminar su propio documento.
   */
  delete: defineAction({
    input: z.object({
      id: z.string().uuid(),
    }),
    handler: async ({ id }, context) => {
      // Verificar autenticación
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user?.id) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión para eliminar documentos.',
        });
      }

      try {
        const { deleteDocumentByAuthor } = await import('../db/documents');
        const deleted = await deleteDocumentByAuthor(id, session.user.id);

        if (!deleted) {
          throw new ActionError({
            code: 'NOT_FOUND',
            message: 'Documento no encontrado o no tienes permiso para eliminarlo.',
          });
        }

        return { success: true };
      } catch (err) {
        if (err instanceof ActionError) throw err;
        console.error('delete document failed', err);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error eliminando el documento.',
        });
      }
    },
  }),
};
