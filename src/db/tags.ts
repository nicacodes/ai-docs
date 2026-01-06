/**
 * Repositorio de Tags
 *
 * Funciones de base de datos para gestionar etiquetas.
 */

import { eq, sql, inArray, ilike } from 'drizzle-orm';
import { getDb } from './client';
import { tags, documentTags, type Tag } from './tags-schema';
import { documents } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface TagWithCount extends Tag {
  documentCount: number;
}

export interface CreateTagInput {
  name: string;
  description?: string;
  color?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============================================================================
// Tag Queries
// ============================================================================

/**
 * Obtiene todos los tags
 */
export async function listTags(): Promise<Tag[]> {
  const db = getDb();

  return db.select().from(tags).orderBy(tags.name);
}

/**
 * Obtiene todos los tags con conteo de documentos
 */
export async function listTagsWithCount(): Promise<TagWithCount[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      color: tags.color,
      createdAt: tags.createdAt,
      documentCount: sql<number>`count(${documentTags.documentId})::int`,
    })
    .from(tags)
    .leftJoin(documentTags, eq(tags.id, documentTags.tagId))
    .groupBy(tags.id)
    .orderBy(tags.name);

  return rows as TagWithCount[];
}

/**
 * Obtiene un tag por slug
 */
export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const db = getDb();

  const rows = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);

  return rows[0] ?? null;
}

/**
 * Obtiene un tag por ID
 */
export async function getTagById(id: string): Promise<Tag | null> {
  const db = getDb();

  const rows = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

  return rows[0] ?? null;
}

/**
 * Busca tags por nombre (para autocompletado)
 */
export async function searchTags(query: string, limit = 10): Promise<Tag[]> {
  const db = getDb();

  return db
    .select()
    .from(tags)
    .where(ilike(tags.name, `%${query}%`))
    .orderBy(tags.name)
    .limit(limit);
}

/**
 * Obtiene tags de un documento
 */
export async function getDocumentTags(documentId: string): Promise<Tag[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .innerJoin(documentTags, eq(tags.id, documentTags.tagId))
    .where(eq(documentTags.documentId, documentId))
    .orderBy(tags.name);

  return rows as Tag[];
}

/**
 * Obtiene documentos por tag
 */
export async function getDocumentsByTag(
  tagSlug: string,
  limit = 50,
): Promise<{ id: string; title: string; slug: string; createdAt: Date }[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(documentTags, eq(documents.id, documentTags.documentId))
    .innerJoin(tags, eq(documentTags.tagId, tags.id))
    .where(eq(tags.slug, tagSlug))
    .orderBy(sql`${documents.createdAt} DESC`)
    .limit(limit);

  return rows;
}

// ============================================================================
// Tag Mutations
// ============================================================================

/**
 * Crea un nuevo tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  const db = getDb();
  const slug = makeSlug(input.name);

  const inserted = await db
    .insert(tags)
    .values({
      name: input.name,
      slug,
      description: input.description,
      color: input.color,
    })
    .returning();

  return inserted[0]!;
}

/**
 * Actualiza un tag
 */
export async function updateTag(
  id: string,
  input: Partial<CreateTagInput>,
): Promise<Tag | null> {
  const db = getDb();

  const updateData: Record<string, unknown> = {};
  if (input.name) {
    updateData.name = input.name;
    updateData.slug = makeSlug(input.name);
  }
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.color) updateData.color = input.color;

  const updated = await db
    .update(tags)
    .set(updateData)
    .where(eq(tags.id, id))
    .returning();

  return updated[0] ?? null;
}

/**
 * Elimina un tag
 */
export async function deleteTag(id: string): Promise<boolean> {
  const db = getDb();

  const result = await db
    .delete(tags)
    .where(eq(tags.id, id))
    .returning({ id: tags.id });

  return result.length > 0;
}

/**
 * Obtiene o crea un tag por nombre
 */
export async function getOrCreateTag(name: string): Promise<Tag> {
  const db = getDb();
  const slug = makeSlug(name);

  // Intentar encontrar existente
  const existing = await db
    .select()
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  // Crear nuevo
  const inserted = await db.insert(tags).values({ name, slug }).returning();

  return inserted[0]!;
}

// ============================================================================
// Document-Tag Relations
// ============================================================================

/**
 * Asigna tags a un documento (reemplaza los existentes)
 */
export async function setDocumentTags(
  documentId: string,
  tagIds: string[],
): Promise<void> {
  const db = getDb();

  // Eliminar tags existentes
  await db.delete(documentTags).where(eq(documentTags.documentId, documentId));

  // Insertar nuevos tags
  if (tagIds.length > 0) {
    await db
      .insert(documentTags)
      .values(tagIds.map((tagId) => ({ documentId, tagId })));
  }
}

/**
 * Agrega un tag a un documento
 */
export async function addTagToDocument(
  documentId: string,
  tagId: string,
): Promise<void> {
  const db = getDb();

  await db
    .insert(documentTags)
    .values({ documentId, tagId })
    .onConflictDoNothing();
}

/**
 * Remueve un tag de un documento
 */
export async function removeTagFromDocument(
  documentId: string,
  tagId: string,
): Promise<void> {
  const db = getDb();

  await db
    .delete(documentTags)
    .where(
      sql`${documentTags.documentId} = ${documentId} AND ${documentTags.tagId} = ${tagId}`,
    );
}

/**
 * Asigna tags a un documento por nombres (crea si no existen)
 */
export async function setDocumentTagsByNames(
  documentId: string,
  tagNames: string[],
): Promise<Tag[]> {
  const createdTags: Tag[] = [];

  for (const name of tagNames) {
    const tag = await getOrCreateTag(name.trim());
    createdTags.push(tag);
  }

  await setDocumentTags(
    documentId,
    createdTags.map((t) => t.id),
  );

  return createdTags;
}
