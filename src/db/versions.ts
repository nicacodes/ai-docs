/**
 * Repository: Document Versions
 *
 * Funciones para gestionar el historial de versiones de documentos.
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from './client';
import { user } from './auth-schema';
import {
  documentVersions,
  type DocumentVersion,
  type DocumentVersionWithUser,
  type DocumentVersionSummary,
} from './versions-schema';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Genera un hash simple del contenido para detectar cambios.
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Obtiene el número de la última versión de un documento.
 */
export async function getLatestVersionNumber(
  documentId: string,
): Promise<number> {
  const db = getDb();

  const result = await db
    .select({
      maxVersion: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)`,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  return result[0]?.maxVersion ?? 0;
}

/**
 * Obtiene una versión específica por ID.
 */
export async function getVersionById(
  versionId: number,
): Promise<DocumentVersionWithUser | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      versionNumber: documentVersions.versionNumber,
      title: documentVersions.title,
      rawMarkdown: documentVersions.rawMarkdown,
      metadata: documentVersions.metadata,
      createdBy: documentVersions.createdBy,
      changeMessage: documentVersions.changeMessage,
      contentLength: documentVersions.contentLength,
      contentHash: documentVersions.contentHash,
      createdAt: documentVersions.createdAt,
      createdByName: user.name,
      createdByEmail: user.email,
    })
    .from(documentVersions)
    .leftJoin(user, eq(documentVersions.createdBy, user.id))
    .where(eq(documentVersions.id, versionId))
    .limit(1);

  return (rows[0] as DocumentVersionWithUser | undefined) ?? null;
}

/**
 * Obtiene una versión específica por documento y número de versión.
 */
export async function getVersionByNumber(
  documentId: string,
  versionNumber: number,
): Promise<DocumentVersionWithUser | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      versionNumber: documentVersions.versionNumber,
      title: documentVersions.title,
      rawMarkdown: documentVersions.rawMarkdown,
      metadata: documentVersions.metadata,
      createdBy: documentVersions.createdBy,
      changeMessage: documentVersions.changeMessage,
      contentLength: documentVersions.contentLength,
      contentHash: documentVersions.contentHash,
      createdAt: documentVersions.createdAt,
      createdByName: user.name,
      createdByEmail: user.email,
    })
    .from(documentVersions)
    .leftJoin(user, eq(documentVersions.createdBy, user.id))
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.versionNumber, versionNumber),
      ),
    )
    .limit(1);

  return (rows[0] as DocumentVersionWithUser | undefined) ?? null;
}

/**
 * Lista todas las versiones de un documento (sin contenido completo).
 */
export async function listVersions(
  documentId: string,
  options?: { limit?: number; offset?: number },
): Promise<DocumentVersionSummary[]> {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = await db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      title: documentVersions.title,
      changeMessage: documentVersions.changeMessage,
      contentLength: documentVersions.contentLength,
      createdBy: documentVersions.createdBy,
      createdByName: user.name,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .leftJoin(user, eq(documentVersions.createdBy, user.id))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber))
    .limit(limit)
    .offset(offset);

  return rows as DocumentVersionSummary[];
}

/**
 * Cuenta el total de versiones de un documento.
 */
export async function countVersions(documentId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  return result[0]?.count ?? 0;
}

// ============================================================================
// Mutations
// ============================================================================

export interface CreateVersionInput {
  documentId: string;
  title: string;
  rawMarkdown: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  changeMessage?: string | null;
}

/**
 * Crea una nueva versión de un documento.
 * Solo crea si el contenido ha cambiado respecto a la última versión.
 */
export async function createVersion(
  input: CreateVersionInput,
): Promise<DocumentVersion | null> {
  const db = getDb();

  const contentHash = hashContent(input.rawMarkdown);
  const contentLength = input.rawMarkdown.length;

  // Obtener la última versión para comparar
  const latestVersionNumber = await getLatestVersionNumber(input.documentId);

  // Si hay versiones anteriores, verificar si el contenido cambió
  if (latestVersionNumber > 0) {
    const latestVersion = await getVersionByNumber(
      input.documentId,
      latestVersionNumber,
    );

    // Si el hash es igual, no crear nueva versión
    if (latestVersion?.contentHash === contentHash) {
      return null;
    }
  }

  // Crear nueva versión
  const newVersionNumber = latestVersionNumber + 1;

  const [inserted] = await db
    .insert(documentVersions)
    .values({
      documentId: input.documentId,
      versionNumber: newVersionNumber,
      title: input.title,
      rawMarkdown: input.rawMarkdown,
      metadata: input.metadata ?? {},
      createdBy: input.createdBy,
      changeMessage: input.changeMessage,
      contentLength,
      contentHash,
    })
    .returning();

  return inserted ?? null;
}

/**
 * Elimina versiones antiguas, manteniendo solo las últimas N.
 * Útil para limpieza periódica.
 */
export async function pruneOldVersions(
  documentId: string,
  keepCount: number = 50,
): Promise<number> {
  const db = getDb();

  // Obtener IDs de versiones a mantener
  const versionsToKeep = await db
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber))
    .limit(keepCount);

  const keepIds = versionsToKeep.map((v) => v.id);

  if (keepIds.length === 0) {
    return 0;
  }

  // Eliminar las que no están en la lista
  const deleted = await db
    .delete(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        sql`${documentVersions.id} NOT IN (${sql.join(
          keepIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    )
    .returning({ id: documentVersions.id });

  return deleted.length;
}

/**
 * Elimina todas las versiones de un documento.
 * (Normalmente se hace automáticamente por ON DELETE CASCADE)
 */
export async function deleteAllVersions(documentId: string): Promise<number> {
  const db = getDb();

  const deleted = await db
    .delete(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .returning({ id: documentVersions.id });

  return deleted.length;
}
