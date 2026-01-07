/**
 * Cliente de Embeddings Server-Side
 *
 * Usa la API del servidor para generar embeddings en lugar del Web Worker.
 * Mucho más rápido para entornos Docker/LAN.
 */

export type EmbeddingResponse = {
  embedding: number[];
  dimensions: number;
  timeMs: number;
};

export type EmbeddingsBatchResponse = {
  embeddings: number[][];
  count: number;
  dimensions: number;
  timeMs: number;
};

export type EmbeddingStatusResponse = {
  ready: boolean;
  model: string;
  dimensions: number;
};

/**
 * Genera embedding para un texto usando la API del servidor.
 */
export async function generateEmbeddingServer(text: string): Promise<number[]> {
  const response = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  console.log('Response status:', response);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: EmbeddingResponse = await response.json();
  return data.embedding;
}

/**
 * Genera embeddings para múltiples textos en batch.
 */
export async function generateEmbeddingsBatchServer(
  texts: string[],
): Promise<number[][]> {
  const response = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data: EmbeddingsBatchResponse = await response.json();
  return data.embeddings;
}

/**
 * Verifica si el servidor de embeddings está listo.
 */
export async function checkServerEmbeddingsReady(): Promise<boolean> {
  try {
    const response = await fetch('/api/embeddings', { method: 'GET' });
    if (!response.ok) return false;

    const data: EmbeddingStatusResponse = await response.json();
    return data.ready;
  } catch {
    return false;
  }
}

/**
 * Pre-carga el modelo en el servidor haciendo una llamada dummy.
 */
export async function preloadServerModel(): Promise<void> {
  try {
    // Una llamada pequeña para forzar la carga del modelo
    await generateEmbeddingServer('warmup');
  } catch {
    // Ignorar errores de precarga
  }
}
