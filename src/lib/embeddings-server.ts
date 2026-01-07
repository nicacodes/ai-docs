/**
 * Servicio de Embeddings Server-Side
 *
 * Ejecuta el modelo de embeddings en el servidor Node.js.
 * El modelo se carga una vez y se mantiene en memoria.
 */

import { pipeline, env } from '@huggingface/transformers';

// Configuración
env.allowLocalModels = true;
env.allowRemoteModels = true;
env.useBrowserCache = false; // Estamos en Node.js

const MODEL_ID = 'Xenova/multilingual-e5-small';
export const EMBEDDING_DIMENSIONS = 384;

// Singleton del pipeline - usamos any para evitar tipos complejos
let embeddingPipeline: any = null;
let pipelinePromise: Promise<any> | null = null;
let isReady = false;

/**
 * Obtiene el pipeline de embeddings, inicializándolo si es necesario.
 * Usa singleton para mantener el modelo en memoria.
 */
async function getPipeline(): Promise<any> {
  // Fast path
  if (embeddingPipeline && isReady) {
    return embeddingPipeline;
  }

  // Evitar inicializaciones paralelas
  if (pipelinePromise) {
    return pipelinePromise;
  }

  console.log('[Embeddings Server] Inicializando modelo...');
  const startTime = Date.now();

  pipelinePromise = pipeline('feature-extraction', MODEL_ID, {
    dtype: 'fp32',
  } as any);

  try {
    embeddingPipeline = await pipelinePromise;
    isReady = true;
    console.log(
      `[Embeddings Server] Modelo listo en ${Date.now() - startTime}ms`,
    );

    return embeddingPipeline;
  } catch (error) {
    pipelinePromise = null;
    console.error('[Embeddings Server] Error inicializando:', error);
    throw error;
  }
}

/**
 * Genera embedding para un texto.
 * El texto debe incluir el prefijo apropiado (passage: o query:).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getPipeline();

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
  const pipe = await getPipeline();

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
 * Llamar esto al iniciar el servidor.
 */
export async function preloadModel(): Promise<void> {
  await getPipeline();
}

/**
 * Verifica si el modelo está listo.
 */
export function isModelReady(): boolean {
  return isReady;
}
