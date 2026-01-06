import { sql } from 'drizzle-orm';
import { getDb } from './client';
import { documents, documentEmbeddings, EMBEDDING_DIMENSIONS } from './schema';

export interface SemanticSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  similarity: number;
  createdAt: Date;
  authorId: string | null;
  tags?: string[]; // Tag slugs
}

export interface SemanticSearchFilters {
  tagSlugs?: string[]; // Filtrar por tags (OR entre tags)
  authorId?: string; // Filtrar por autor
  dateFrom?: Date; // Fecha mínima de creación
  dateTo?: Date; // Fecha máxima de creación
  minSimilarity?: number; // Similitud mínima (0-1)
}

/**
 * Realiza búsqueda semántica usando pgvector con cosine distance.
 * Soporta filtros adicionales: tags, autor, rango de fechas.
 *
 * @param queryEmbedding - Vector de embedding de la query (dimensión: 384)
 * @param limit - Número máximo de resultados
 * @param filters - Filtros opcionales
 * @returns Documentos ordenados por similitud descendente
 */
export async function semanticSearch(
  queryEmbedding: number[],
  limit: number = 10,
  filters?: SemanticSearchFilters,
): Promise<SemanticSearchResult[]> {
  if (queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Dimensión inválida del embedding. Esperado ${EMBEDDING_DIMENSIONS}, recibido ${queryEmbedding.length}.`,
    );
  }

  const db = getDb();

  // Convertir array a formato pgvector: '[0.1, 0.2, ...]'
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  // Construir condiciones de filtro
  const conditions: ReturnType<typeof sql>[] = [];

  // Filtro por autor
  if (filters?.authorId) {
    conditions.push(sql`${documents.authorId} = ${filters.authorId}`);
  }

  // Filtro por fecha desde
  if (filters?.dateFrom) {
    conditions.push(sql`${documents.createdAt} >= ${filters.dateFrom}`);
  }

  // Filtro por fecha hasta
  if (filters?.dateTo) {
    conditions.push(sql`${documents.createdAt} <= ${filters.dateTo}`);
  }

  // Filtro por similitud mínima
  const minSimilarity = filters?.minSimilarity ?? 0;
  if (minSimilarity > 0) {
    conditions.push(
      sql`(1 - (${documentEmbeddings.embedding} <=> ${vectorLiteral}::vector)) >= ${minSimilarity}`,
    );
  }

  // Si hay filtro por tags, hacer subquery
  let tagSubquery: ReturnType<typeof sql> | null = null;
  if (filters?.tagSlugs && filters.tagSlugs.length > 0) {
    const tagSlugsLiteral = filters.tagSlugs
      .map((s) => `'${s.replace(/'/g, "''")}'`)
      .join(',');
    tagSubquery = sql`${documents.id} IN (
      SELECT dt.document_id 
      FROM document_tags dt 
      JOIN tags t ON t.id = dt.tag_id 
      WHERE t.slug IN (${sql.raw(tagSlugsLiteral)})
    )`;
    conditions.push(tagSubquery);
  }

  // Combinar condiciones con AND
  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  // Query principal con filtros
  const results = await db.execute<{
    id: string;
    title: string;
    slug: string;
    rawMarkdown: string;
    createdAt: string;
    authorId: string | null;
    similarity: number;
  }>(sql`
    SELECT 
      ${documents.id} as id,
      ${documents.title} as title,
      ${documents.slug} as slug,
      ${documents.rawMarkdown} as "rawMarkdown",
      ${documents.createdAt} as "createdAt",
      ${documents.authorId} as "authorId",
      (1 - (${documentEmbeddings.embedding} <=> ${sql.raw(
    `'${vectorLiteral}'`,
  )}::vector)) as similarity
    FROM ${documentEmbeddings}
    INNER JOIN ${documents} ON ${documentEmbeddings.documentId} = ${
    documents.id
  }
    ${whereClause}
    ORDER BY ${documentEmbeddings.embedding} <=> ${sql.raw(
    `'${vectorLiteral}'`,
  )}::vector ASC
    LIMIT ${limit * 2}
  `);

  // Agrupar por documento (puede haber múltiples chunks por doc)
  const docMap = new Map<string, SemanticSearchResult>();

  for (const row of results) {
    const existing = docMap.get(row.id);
    const similarity = Number(row.similarity);

    if (!existing || similarity > existing.similarity) {
      // Generar excerpt desde rawMarkdown
      const normalizedText = (row.rawMarkdown as string)
        .replace(/<[^>]*>/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/^>\s*/gm, '')
        .replace(/^-{3,}$/gm, '')
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();

      docMap.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt:
          normalizedText.slice(0, 180) +
          (normalizedText.length > 180 ? '...' : ''),
        similarity,
        createdAt: new Date(row.createdAt),
        authorId: row.authorId,
      });
    }
  }

  // Convertir a array, ordenar por similitud, y limitar
  return Array.from(docMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Obtiene sugerencias de autocompletado basadas en títulos de documentos
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5,
): Promise<{ title: string; slug: string }[]> {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  const db = getDb();

  // Búsqueda por prefijo en títulos
  const searchPattern = `%${query.toLowerCase()}%`;

  const results = await db
    .select({
      title: documents.title,
      slug: documents.slug,
    })
    .from(documents)
    .where(sql`LOWER(${documents.title}) LIKE ${searchPattern}`)
    .orderBy(
      sql`
      CASE 
        WHEN LOWER(${documents.title}) LIKE ${query.toLowerCase() + '%'} THEN 0
        ELSE 1
      END,
      ${documents.updatedAt} DESC
    `,
    )
    .limit(limit);

  return results;
}
