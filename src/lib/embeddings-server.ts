/**
 * Servicio de Embeddings Server-Side
 *
 * Ejecuta el modelo de embeddings en el servidor Node.js siguiendo
 * las mejores prácticas de Transformers.js para Node.
 *
 * El modelo se descarga y cachea automáticamente en el servidor,
 * y se mantiene en memoria para requests rápidas.
 */

import { pipeline, env } from '@huggingface/transformers';
import path from 'node:path';

// ============================================================================
// CONFIGURACIÓN DE TRANSFORMERS.JS PARA NODE.JS
// ============================================================================

// Configurar directorio de cache para modelos
// En desarrollo: ./node_modules/@huggingface/transformers/.cache/
// En Docker: /app/.cache/ (persistente)
if (process.env.NODE_ENV === 'production') {
  env.cacheDir = path.resolve(process.cwd(), '.cache');
} else {
  // En desarrollo usa el cache por defecto en node_modules
  env.cacheDir = path.resolve(
    process.cwd(),
    'node_modules',
    '@huggingface/transformers',
    '.cache',
  );
}

// Permitir modelos locales y remotos
env.allowLocalModels = true;
env.allowRemoteModels = true;

// Browser cache no aplica en Node.js
env.useBrowserCache = false;

console.log('[Embeddings Server] Cache dir:', env.cacheDir);

const MODEL_ID = 'Xenova/multilingual-e5-small';
export const EMBEDDING_DIMENSIONS = 384;

// ============================================================================
// SINGLETON PATTERN PARA EL PIPELINE
// ============================================================================

class EmbeddingsPipeline {
  static instance: any = null;
  static initPromise: Promise<any> | null = null;
  static isReady = false;

  /**
   * Obtiene la instancia del pipeline usando singleton pattern.
   * Lazy-loading: solo se carga cuando se necesita.
   */
  static async getInstance(
    progress_callback?: (data: any) => void,
  ): Promise<any> {
    // Fast path: ya está listo
    if (this.instance !== null && this.isReady) {
      return this.instance;
    }

    // Evitar inicializaciones paralelas
    if (this.initPromise !== null) {
      return this.initPromise;
    }

    console.log('[Embeddings Server] Inicializando pipeline...');
    const startTime = Date.now();

    this.initPromise = (async () => {
      try {
        this.instance = await pipeline('feature-extraction', MODEL_ID, {
          dtype: 'fp32',
          progress_callback:
            progress_callback ||
            ((data: any) => {
              if (data.status === 'progress' && data.file) {
                console.log(
                  `[Embeddings Server] Descargando ${
                    data.file
                  }: ${data.progress?.toFixed(0)}%`,
                );
              }
            }),
        } as any);

        this.isReady = true;
        const loadTime = Date.now() - startTime;
        console.log(`[Embeddings Server] Pipeline listo en ${loadTime}ms`);

        return this.instance;
      } catch (error) {
        this.initPromise = null;
        console.error(
          '[Embeddings Server] Error inicializando pipeline:',
          error,
        );
        throw error;
      }
    })();

    return this.initPromise;
  }
}

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Genera embedding para un texto.
 * El texto debe incluir el prefijo apropiado (passage: o query:).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await EmbeddingsPipeline.getInstance();

  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convertir a array plano
  if (typeof output.tolist === 'function') {
    const list = output.tolist();
    // tolist() retorna array anidado para un solo texto
    return Array.isArray(list[0]) ? list[0] : list;
  }

  return Array.from(output.data as Float32Array);
}

/**
 * Genera embeddings para múltiples textos en batch.
 * Más eficiente que llamar generateEmbedding múltiples veces.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
): Promise<number[][]> {
  const pipe = await EmbeddingsPipeline.getInstance();

  const output = await pipe(texts, {
    pooling: 'mean',
    normalize: true,
  });

  if (typeof output.tolist === 'function') {
    return output.tolist() as number[][];
  }

  // Fallback para formatos diferentes
  const data = output.data as Float32Array;
  const embeddings: number[][] = [];
  const dims = EMBEDDING_DIMENSIONS;

  for (let i = 0; i < texts.length; i++) {
    embeddings.push(Array.from(data.slice(i * dims, (i + 1) * dims)));
  }

  return embeddings;
}

/**
 * Pre-carga el modelo para que esté listo cuando se necesite.
 * Útil para llamar al iniciar el servidor.
 */
export async function preloadModel(): Promise<void> {
  await EmbeddingsPipeline.getInstance();
}

/**
 * Verifica si el modelo está listo.
 */
export function isModelReady(): boolean {
  return EmbeddingsPipeline.isReady;
}
