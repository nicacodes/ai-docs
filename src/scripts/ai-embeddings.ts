import { $lastMarkdownSnapshot } from '@/store/editor-store';
import {
  createWorkerRpcClient,
  getEmbeddingsWorker,
  isWorkerAlive,
  terminateEmbeddingsWorker,
} from './worker-rpc';
import {
  clearEmbeddingsStore,
  computeEmbeddingIdentity,
  getStoredEmbedding,
  putStoredEmbedding,
} from './embeddings-store';
import {
  generateEmbeddingServer,
  checkServerEmbeddingsReady,
} from './embeddings-api-client';

export type EmbeddingModelConfig = {
  modelId: string;
  device: 'wasm' | 'webgpu';
};

export type EmbedPostArgs = {
  postId: string;
  text: string;
  model?: Partial<EmbeddingModelConfig>;
  onProgress?: (p: unknown) => void;
};

const DEFAULT_MODEL: EmbeddingModelConfig = {
  modelId: 'Xenova/multilingual-e5-small',
  device: 'wasm',
};

// ============================================================================
// DETECCIÓN DE MODO: Servidor vs Worker
// ============================================================================

// null = no detectado, true = usar servidor, false = usar worker
let useServerMode: boolean | null = null;
let serverCheckPromise: Promise<boolean> | null = null;

/**
 * Detecta si debemos usar el servidor o el worker para embeddings.
 * El servidor es preferido si está disponible (más rápido).
 */
async function detectEmbeddingsMode(): Promise<boolean> {
  if (useServerMode !== null) return useServerMode;

  if (serverCheckPromise) return serverCheckPromise;

  serverCheckPromise = (async () => {
    try {
      // Intentar usar el servidor
      const serverAvailable = await checkServerEmbeddingsReady();
      useServerMode = serverAvailable;
      console.log(
        `[Embeddings] Modo: ${
          serverAvailable ? 'SERVIDOR (rápido)' : 'WORKER (fallback)'
        }`,
      );
      return serverAvailable;
    } catch {
      useServerMode = false;
      return false;
    }
  })();

  return serverCheckPromise;
}

// ============================================================================
// WORKER MODE (fallback)
// ============================================================================

// Estado centralizado - sin duplicación
let rpc: ReturnType<typeof createWorkerRpcClient> | null = null;
let modelInitPromise: Promise<void> | null = null;
let activeModel: EmbeddingModelConfig | null = null;
let modelReady = false; // Flag rápido para evitar llamadas async innecesarias

/**
 * Asegura que el worker y RPC client estén listos.
 * Reutiliza el singleton existente si está vivo.
 */
export async function ensureSwReady() {
  // Si ya hay RPC y worker activo, reutilizar
  if (rpc && isWorkerAlive()) {
    return;
  }

  // Crear/obtener worker y RPC
  const worker = getEmbeddingsWorker('/embeddings-worker.js');
  rpc = createWorkerRpcClient(worker);
}

export async function initEmbeddingModel(
  model?: Partial<EmbeddingModelConfig>,
  onProgress?: (p: unknown) => void,
) {
  await ensureSwReady();

  const cfg: EmbeddingModelConfig = {
    modelId: model?.modelId ?? DEFAULT_MODEL.modelId,
    device: model?.device ?? DEFAULT_MODEL.device,
  };

  return await rpc!.call('init', cfg, {
    timeoutMs: 5 * 60_000, // 5 min (reducido de 10)
    onProgress,
  });
}

/**
 * Pre-carga el modelo en background para que esté listo cuando se necesite.
 * Detecta automáticamente si usar servidor o worker.
 */
export function preloadModel(model?: Partial<EmbeddingModelConfig>) {
  // Detectar modo y pre-calentar
  detectEmbeddingsMode().then(async (useServer) => {
    if (useServer) {
      // Pre-calentar el servidor con una llamada dummy
      try {
        await generateEmbeddingServer('warmup');
        console.log('[Embeddings] Servidor pre-calentado');
      } catch (err) {
        console.warn('[Embeddings] Error pre-calentando servidor:', err);
      }
    } else {
      // Fallback: inicializar worker
      const cfg: EmbeddingModelConfig = {
        modelId: model?.modelId ?? DEFAULT_MODEL.modelId,
        device: model?.device ?? DEFAULT_MODEL.device,
      };
      ensureModelInitialized(cfg).catch((err) => {
        console.warn('[Embeddings] Error pre-cargando worker:', err);
      });
    }
  });
}

/**
 * Asegura que el modelo esté inicializado.
 * OPTIMIZADO: Usa flag rápido para evitar operaciones async cuando el modelo ya está listo.
 */
export async function ensureModelInitialized(
  cfg: EmbeddingModelConfig,
  onProgress?: (p: unknown) => void,
) {
  const sameModel =
    activeModel?.modelId === cfg.modelId && activeModel?.device === cfg.device;

  // FAST PATH: Si ya está listo y es el mismo modelo, retornar inmediatamente
  if (modelReady && sameModel) {
    return;
  }

  // Si hay una inicialización en curso para el mismo modelo, esperar
  if (modelInitPromise && sameModel) {
    return modelInitPromise;
  }

  modelInitPromise = (async () => {
    await initEmbeddingModel(cfg, onProgress);
    activeModel = cfg;
    modelReady = true;
  })().catch((err) => {
    modelInitPromise = null;
    modelReady = false;
    throw err;
  });

  return modelInitPromise;
}

export async function embedPost(args: EmbedPostArgs): Promise<number[]> {
  const cfg: EmbeddingModelConfig = {
    modelId: args.model?.modelId ?? DEFAULT_MODEL.modelId,
    device: args.model?.device ?? DEFAULT_MODEL.device,
  };

  // 1) Verificar cache local ANTES de tocar el modelo (más rápido)
  const cached = await getStoredEmbedding({
    modelId: cfg.modelId,
    device: cfg.device,
    text: args.text,
  });

  if (cached?.embedding?.length) {
    args.onProgress?.({ phase: 'cached', label: 'Desde cache', percent: 100 });
    return cached.embedding;
  }

  // 2) Detectar modo: servidor (rápido) vs worker (fallback)
  const useServer = await detectEmbeddingsMode();

  let embedding: number[];

  if (useServer) {
    // MODO SERVIDOR: Más rápido, el modelo corre en Docker
    args.onProgress?.({ phase: 'running', label: 'Generando...', percent: 50 });
    embedding = await generateEmbeddingServer(args.text);
    args.onProgress?.({ phase: 'ready', label: 'Listo', percent: 100 });
  } else {
    // MODO WORKER: Fallback, el modelo corre en el navegador
    await ensureModelInitialized(cfg, args.onProgress);

    const res = (await rpc!.call(
      'embed',
      {
        modelId: cfg.modelId,
        device: cfg.device,
        texts: [args.text],
      },
      {
        timeoutMs: 5 * 60_000,
        onProgress: args.onProgress,
      },
    )) as any;

    embedding = res?.embeddings?.[0] ?? null;
    if (!embedding) throw new Error('No se pudo generar embedding.');
  }

  // 3) Persistir en cache local
  const ident = computeEmbeddingIdentity({
    modelId: cfg.modelId,
    device: cfg.device,
    text: args.text,
  });

  await putStoredEmbedding({
    key: ident.key,
    postId: args.postId,
    modelId: cfg.modelId,
    device: cfg.device,
    pooling: ident.pooling,
    normalize: ident.normalize,
    contentHash: ident.contentHash,
    embedding,
  });

  return embedding;
}

export type EmbedQueryArgs = {
  query: string;
  model?: Partial<EmbeddingModelConfig>;
  onProgress?: (p: unknown) => void;
};

/**
 * Genera embedding para una query de búsqueda.
 * Usa el prefijo 'query:' requerido por el modelo E5.
 * No se cachea en IndexedDB ya que las queries son efímeras.
 */
export async function embedQuery(args: EmbedQueryArgs): Promise<number[]> {
  const cfg: EmbeddingModelConfig = {
    modelId: args.model?.modelId ?? DEFAULT_MODEL.modelId,
    device: args.model?.device ?? DEFAULT_MODEL.device,
  };

  // El modelo E5 requiere prefijo 'query:' para queries de búsqueda
  const text = args.query.startsWith('query:')
    ? args.query
    : `query: ${args.query}`;

  // Detectar modo: servidor (rápido) vs worker (fallback)
  const useServer = await detectEmbeddingsMode();

  if (useServer) {
    // MODO SERVIDOR: Más rápido
    args.onProgress?.({ phase: 'running', label: 'Buscando...', percent: 50 });
    const embedding = await generateEmbeddingServer(text);
    args.onProgress?.({ phase: 'ready', label: 'Listo', percent: 100 });
    return embedding;
  }

  // MODO WORKER: Fallback
  await ensureModelInitialized(cfg, args.onProgress);

  const res = (await rpc!.call(
    'embed',
    {
      modelId: cfg.modelId,
      device: cfg.device,
      texts: [text],
    },
    {
      timeoutMs: 5 * 60_000,
      onProgress: args.onProgress,
    },
  )) as any;

  const embedding = (res?.embeddings?.[0] ?? null) as number[] | null;
  if (!embedding)
    throw new Error('No se pudo generar embedding para la query.');

  return embedding;
}

type DebounceUnsubscribe = () => void;

export function subscribeDebouncedEmbeddings(opts: {
  postId: string;
  delayMs?: number;
  model?: Partial<EmbeddingModelConfig>;
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
          model: opts.model,
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
 * Limpia el cliente RPC pero NO termina el worker.
 * El worker se mantiene vivo para preservar el modelo en memoria.
 * Solo llamar terminateEmbeddingsWorker() si realmente quieres eliminar el modelo.
 */
export function disposeEmbeddingsClient(options?: {
  terminateWorker?: boolean;
}) {
  if (rpc) {
    rpc.dispose();
    rpc = null;
  }

  // Por defecto NO terminamos el worker para preservar el modelo en memoria
  if (options?.terminateWorker) {
    terminateEmbeddingsWorker();
    activeModel = null;
    modelInitPromise = null;
  }
}

export async function swStatus() {
  await ensureSwReady();
  return await rpc!.call('status');
}

export async function clearAllEmbeddingsCaches() {
  await ensureSwReady();
  await rpc!.call('clearCache');
  await clearEmbeddingsStore();
}
