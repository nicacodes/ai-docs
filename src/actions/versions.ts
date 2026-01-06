/**
 * Server Actions: Document Versions
 *
 * Acciones para gestionar el historial de versiones de documentos.
 */

import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import {
  getVersionById,
  getVersionByNumber,
  countVersions,
  listVersions,
} from '@/db/versions';
import { updateDocument } from '@/db/documents';
import { auth } from '@/lib/auth';

export const versions = {
  /**
   * Lista las versiones de un documento.
   */
  list: defineAction({
    input: z.object({
      documentId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    }),
    handler: async (input) => {
      const [versions, total] = await Promise.all([
        listVersions(input.documentId, {
          limit: input.limit,
          offset: input.offset,
        }),
        countVersions(input.documentId),
      ]);

      return {
        versions,
        total,
        hasMore: input.offset + versions.length < total,
      };
    },
  }),

  /**
   * Obtiene una versión específica con su contenido completo.
   */
  get: defineAction({
    input: z.object({
      versionId: z.number().int().positive(),
    }),
    handler: async (input) => {
      const version = await getVersionById(input.versionId);

      if (!version) {
        throw new Error('Versión no encontrada');
      }

      return version;
    },
  }),

  /**
   * Obtiene una versión por número de versión.
   */
  getByNumber: defineAction({
    input: z.object({
      documentId: z.string().uuid(),
      versionNumber: z.number().int().positive(),
    }),
    handler: async (input) => {
      const version = await getVersionByNumber(
        input.documentId,
        input.versionNumber,
      );

      if (!version) {
        throw new Error('Versión no encontrada');
      }

      return version;
    },
  }),

  /**
   * Restaura una versión anterior.
   * Esto crea una nueva versión con el contenido de la versión seleccionada.
   */
  restore: defineAction({
    input: z.object({
      versionId: z.number().int().positive(),
    }),
    handler: async (input, context) => {
      // Verificar autenticación
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user?.id) {
        throw new Error('Debes iniciar sesión para restaurar versiones');
      }

      // Obtener la versión a restaurar
      const versionToRestore = await getVersionById(input.versionId);

      if (!versionToRestore) {
        throw new Error('Versión no encontrada');
      }

      // Guardar el documento con el contenido de la versión antigua
      // Esto automáticamente creará una nueva versión
      const saved = await updateDocument(versionToRestore.documentId, {
        title: versionToRestore.title,
        rawMarkdown: versionToRestore.rawMarkdown,
        metadata: versionToRestore.metadata as Record<string, unknown>,
        authorId: session.user.id,
      });

      if (!saved) {
        throw new Error('Error al restaurar el documento');
      }

      return {
        success: true,
        documentId: saved.id,
        slug: saved.slug,
        restoredFromVersion: versionToRestore.versionNumber,
      };
    },
  }),

  /**
   * Compara dos versiones (devuelve ambas para diff en frontend).
   */
  compare: defineAction({
    input: z.object({
      documentId: z.string().uuid(),
      versionA: z.number().int().positive(),
      versionB: z.number().int().positive(),
    }),
    handler: async (input) => {
      const [versionA, versionB] = await Promise.all([
        getVersionByNumber(input.documentId, input.versionA),
        getVersionByNumber(input.documentId, input.versionB),
      ]);

      if (!versionA || !versionB) {
        throw new Error('Una o ambas versiones no fueron encontradas');
      }

      return {
        versionA,
        versionB,
      };
    },
  }),
};
