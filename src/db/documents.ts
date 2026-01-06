import { eq, sql, inArray } from 'drizzle-orm';
import { getDb } from './client';
import { documents, user } from './schema';
import { tags, documentTags } from './tags-schema';
import { createVersion } from './versions';
import { makeSlug } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface DocumentRow {
  id: string;
  title: string;
  slug: string;
  rawMarkdown: string;
  metadata: Record<string, unknown>;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Documento con información del autor */
export interface DocumentWithAuthor extends DocumentRow {
  authorName: string | null;
  authorEmail: string | null;
}

export interface DocumentSummary {
  id: string;
  slug: string;
  title: string;
}

export interface SaveDocumentInput {
  id?: string;
  slug?: string;
  title: string;
  rawMarkdown: string;
  metadata?: Record<string, unknown>;
  authorId?: string | null;
}

export interface ListDocumentsInput {
  limit?: number;
  offset?: number;
  search?: string;
  tagSlug?: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Obtiene un documento por su slug.
 */
export async function getDocumentBySlug(
  slug: string,
): Promise<DocumentRow | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      rawMarkdown: documents.rawMarkdown,
      metadata: documents.metadata,
      authorId: documents.authorId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.slug, slug))
    .limit(1);

  return (rows[0] as DocumentRow | undefined) ?? null;
}

/**
 * Obtiene un documento por su slug, incluyendo información del autor.
 */
export async function getDocumentBySlugWithAuthor(
  slug: string,
): Promise<DocumentWithAuthor | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      rawMarkdown: documents.rawMarkdown,
      metadata: documents.metadata,
      authorId: documents.authorId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      authorName: user.name,
      authorEmail: user.email,
    })
    .from(documents)
    .leftJoin(user, eq(documents.authorId, user.id))
    .where(eq(documents.slug, slug))
    .limit(1);

  return (rows[0] as DocumentWithAuthor | undefined) ?? null;
}

/**
 * Obtiene un documento por su ID.
 */
export async function getDocumentById(id: string): Promise<DocumentRow | null> {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      rawMarkdown: documents.rawMarkdown,
      metadata: documents.metadata,
      authorId: documents.authorId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  return (rows[0] as DocumentRow | undefined) ?? null;
}

/**
 * Lista documentos con paginación y búsqueda opcional por título.
 * Opcionalmente filtra por etiqueta (tagSlug).
 */
export async function listDocuments(
  input: ListDocumentsInput = {},
): Promise<DocumentRow[]> {
  const { limit = 20, offset = 0, search, tagSlug } = input;
  const db = getDb();

  // Si hay filtro por tag, usamos una subconsulta
  if (tagSlug?.trim()) {
    // Obtener IDs de documentos con este tag
    const taggedDocIds = db
      .select({ documentId: documentTags.documentId })
      .from(documentTags)
      .innerJoin(tags, eq(documentTags.tagId, tags.id))
      .where(eq(tags.slug, tagSlug.trim()));

    // Construir condición de búsqueda
    const baseCondition = inArray(documents.id, taggedDocIds);
    const searchCondition = search?.trim()
      ? sql`${documents.id} IN (${taggedDocIds}) AND LOWER(${
          documents.title
        }) LIKE ${`%${search.trim().toLowerCase()}%`}`
      : baseCondition;

    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        slug: documents.slug,
        rawMarkdown: documents.rawMarkdown,
        metadata: documents.metadata,
        authorId: documents.authorId,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(search?.trim() ? searchCondition : baseCondition)
      .orderBy(sql`${documents.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return rows as DocumentRow[];
  }

  // Query normal sin filtro de tag
  let query = db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      rawMarkdown: documents.rawMarkdown,
      metadata: documents.metadata,
      authorId: documents.authorId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .orderBy(sql`${documents.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  if (search?.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    query = query.where(
      sql`LOWER(${documents.title}) LIKE ${searchTerm}`,
    ) as typeof query;
  }

  return (await query) as DocumentRow[];
}

/**
 * Obtiene todos los documentos de un autor específico.
 */
export async function getDocumentsByAuthor(
  authorId: string,
): Promise<DocumentRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      rawMarkdown: documents.rawMarkdown,
      metadata: documents.metadata,
      authorId: documents.authorId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.authorId, authorId))
    .orderBy(sql`${documents.createdAt} DESC`);

  return rows as DocumentRow[];
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Crea un nuevo documento.
 */
export async function createDocument(
  input: SaveDocumentInput,
): Promise<DocumentSummary> {
  const db = getDb();
  const finalSlug = input.slug ?? makeSlug(input.title);

  const inserted = await db
    .insert(documents)
    .values({
      title: input.title,
      slug: finalSlug,
      rawMarkdown: input.rawMarkdown,
      metadata: input.metadata ?? {},
      authorId: input.authorId ?? null,
    })
    .returning({
      id: documents.id,
      slug: documents.slug,
      title: documents.title,
    });

  const doc = inserted[0]!;

  // Crear primera versión del documento
  await createVersion({
    documentId: doc.id,
    title: input.title,
    rawMarkdown: input.rawMarkdown,
    metadata: input.metadata ?? {},
    createdBy: input.authorId ?? null,
    changeMessage: 'Versión inicial',
  });

  return doc;
}

/**
 * Actualiza un documento existente.
 */
export async function updateDocument(
  id: string,
  input: Omit<SaveDocumentInput, 'id' | 'slug'>,
): Promise<DocumentSummary | null> {
  const db = getDb();

  const updated = await db
    .update(documents)
    .set({
      title: input.title,
      rawMarkdown: input.rawMarkdown,
      metadata: input.metadata ?? {},
    })
    .where(eq(documents.id, id))
    .returning({
      id: documents.id,
      slug: documents.slug,
      title: documents.title,
    });

  const doc = updated[0];

  if (doc) {
    // Crear nueva versión (solo si el contenido cambió - la función lo verifica)
    await createVersion({
      documentId: doc.id,
      title: input.title,
      rawMarkdown: input.rawMarkdown,
      metadata: input.metadata ?? {},
      createdBy: input.authorId ?? null,
    });
  }

  return doc ?? null;
}

/**
 * Verifica si un documento existe por su ID.
 */
export async function documentExists(id: string): Promise<boolean> {
  const db = getDb();

  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  return rows.length > 0;
}
