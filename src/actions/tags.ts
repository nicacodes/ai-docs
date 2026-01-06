/**
 * Tags Actions - Astro Server Actions para etiquetas
 */

import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import {
  listTags,
  listTagsWithCount,
  getTagBySlug,
  searchTags,
  createTag,
  updateTag,
  deleteTag,
  getDocumentTags,
  setDocumentTagsByNames,
} from '../db/tags';

// ============================================================================
// Schemas
// ============================================================================

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const updateTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

const searchTagsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
});

const setDocumentTagsSchema = z.object({
  documentId: z.string().uuid(),
  tags: z.array(z.string().min(1).max(50)),
});

// ============================================================================
// Actions
// ============================================================================

export const tagsActions = {
  /**
   * Lista todos los tags
   */
  list: defineAction({
    input: z.object({
      withCount: z.boolean().default(false),
    }),
    handler: async ({ withCount }) => {
      if (withCount) {
        return listTagsWithCount();
      }
      return listTags();
    },
  }),

  /**
   * Busca tags por nombre
   */
  search: defineAction({
    input: searchTagsSchema,
    handler: async ({ query, limit }) => {
      return searchTags(query, limit);
    },
  }),

  /**
   * Obtiene un tag por slug
   */
  getBySlug: defineAction({
    input: z.object({ slug: z.string() }),
    handler: async ({ slug }) => {
      const tag = await getTagBySlug(slug);
      if (!tag) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Tag no encontrado',
        });
      }
      return tag;
    },
  }),

  /**
   * Crea un nuevo tag
   */
  create: defineAction({
    input: createTagSchema,
    handler: async (input) => {
      try {
        return await createTag(input);
      } catch (error: any) {
        if (error.code === '23505') {
          throw new ActionError({
            code: 'CONFLICT',
            message: 'Ya existe un tag con ese nombre',
          });
        }
        throw error;
      }
    },
  }),

  /**
   * Actualiza un tag
   */
  update: defineAction({
    input: updateTagSchema,
    handler: async ({ id, ...input }) => {
      const updated = await updateTag(id, input);
      if (!updated) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Tag no encontrado',
        });
      }
      return updated;
    },
  }),

  /**
   * Elimina un tag
   */
  delete: defineAction({
    input: z.object({ id: z.string().uuid() }),
    handler: async ({ id }) => {
      const deleted = await deleteTag(id);
      if (!deleted) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Tag no encontrado',
        });
      }
      return { success: true };
    },
  }),

  /**
   * Obtiene tags de un documento
   */
  getForDocument: defineAction({
    input: z.object({ documentId: z.string().uuid() }),
    handler: async ({ documentId }) => {
      return getDocumentTags(documentId);
    },
  }),

  /**
   * Asigna tags a un documento
   */
  setForDocument: defineAction({
    input: setDocumentTagsSchema,
    handler: async ({ documentId, tags }) => {
      const assignedTags = await setDocumentTagsByNames(documentId, tags);
      return assignedTags;
    },
  }),
};
