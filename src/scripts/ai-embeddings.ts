/**
 * Cliente de Embeddings - Solo API del Servidor
 *
 * Genera embeddings usando únicamente la API del servidor.
 * Todo el procesamiento ocurre en el servidor Docker.
 */

import { $lastMarkdownSnapshot } from '@/store/editor-store';
import {
  clearEmbeddingsStore,
  computeEmbeddingIdentity,
  getStoredEmbedding,
  putStoredEmbedding,
} from './embeddings-store';
import { generateEmbeddingServer } from './embeddings-api-client';

export type EmbedPostArgs = {
  postId: string;
  text: string;
  onProgress?: (p: unknown) => void;
};

export type EmbedQueryArgs = {
  query: string;
  onProgress?: (p: unknown) => void;
};

/**
 * Genera embedding para un post.
 * Usa cache local primero, luego API del servidor.
 */
export async function embedPost(args: EmbedPostArgs): Promise<number[]> {
  // 1) Verificar cache local (más rápido)
  const cached = await getStoredEmbedding({
    modelId: 'Xenova/multilingual-e5-small',
    device: 'server',
    text: args.text,
  });

  if (cached?.embedding?.length) {
    args.onProgress?.({ phase: 'cached', label: 'Desde cache', percent: 100 });
    return cached.embedding;
  }

  // 2) Generar con API del servidor
  args.onProgress?.({ phase: 'running', label: 'Generando...', percent: 50 });
  const embedding = await generateEmbeddingServer(args.text);
  args.onProgress?.({ phase: 'ready', label: 'Listo', percent: 100 });

  // 3) Persistir en cache local
  const ident = computeEmbeddingIdentity({
    modelId: 'Xenova/multilingual-e5-small',
    device: 'server',
    text: args.text,
  });

  await putStoredEmbedding({
    key: ident.key,
    postId: args.postId,
    modelId: 'Xenova/multilingual-e5-small',
    device: 'server',
    pooling: ident.pooling,
    normalize: ident.normalize,
    contentHash: ident.contentHash,
    embedding,
  });

  return embedding;
}

/**
 * Genera embedding para una query de búsqueda.
 * Usa el prefijo 'query:' requerido por el modelo E5.
 */
export async function embedQuery(args: EmbedQueryArgs): Promise<number[]> {
  // El modelo E5 requiere prefijo 'query:' para queries de búsqueda
  const text = args.query.startsWith('query:')
    ? args.query
    : `query: ${args.query}`;

  args.onProgress?.({ phase: 'running', label: 'Buscando...', percent: 50 });
  const embedding = await generateEmbeddingServer(text);
  args.onProgress?.({ phase: 'ready', label: 'Listo', percent: 100 });

  return embedding;
}

/**
 * Pre-carga el modelo en el servidor.
 * Hace una llamada dummy para forzar la carga.
 */
export function preloadModel(): void {
  // Pre-calentar el servidor con una llamada dummy
  generateEmbeddingServer('warmup').catch(() => {
    // Ignorar errores de precarga
  });
}

type DebounceUnsubscribe = () => void;

/**
 * Suscripción con debounce para generar embeddings automáticamente.
 */
export function subscribeDebouncedEmbeddings(opts: {
  postId: string;
  delayMs?: number;
  onProgress?: (p: unknown) => void;
  onEmbedding?: (embedding: number[]) => void;
  onError?: (err: unknown) => void;
}): DebounceUnsubscribe {
  const delayMs = opts.delayMs ?? 2000;
  let timeoutId: number | null = null;

  const unsubscribe = $lastMarkdownSnapshot.listen((content) => {
    if (!content) return;

    if (timeoutId) window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(async () => {
      try {
        const text = content.startsWith('passage:')
          ? content
          : `passage: ${content}`;

        const embedding = await embedPost({
          postId: opts.postId,
          text,
          onProgress: opts.onProgress,
        });

        opts.onEmbedding?.(embedding);
      } catch (err) {
        console.warn('Error en embeddings debounced', err);
        opts.onError?.(err);
      }
    }, delayMs);
  });

  return () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    unsubscribe();
  };
}

/**
 * Limpia el cache de embeddings.
 */
export async function clearAllEmbeddingsCaches(): Promise<void> {
  await clearEmbeddingsStore();
}
