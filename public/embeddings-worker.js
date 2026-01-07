/* Web Worker: Embeddings via @huggingface/transformers (v3)
   Optimizado para rendimiento máximo.
   El modelo se mantiene en memoria después de la primera carga.
*/

import {
  pipeline,
  env,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19';

// ============================================================================
// CONFIGURACIÓN INICIAL (se ejecuta UNA VEZ al cargar el worker)
// ============================================================================

// Configurar ambiente inmediatamente
env.allowLocalModels = true;
env.allowRemoteModels = true;

// Detectar cache disponible de forma síncrona si es posible
env.useBrowserCache = typeof caches !== 'undefined';

// Ruta de modelos locales (Docker)
const LOCAL_MODEL_PATH = '/models/';

// Estado de configuración
let envConfigured = false;
let localModelsAvailable = null; // null = no verificado, true/false = resultado

// Configuración lazy - solo verifica una vez
async function ensureEnvConfig() {
  if (envConfigured) return;
  envConfigured = true;

  // Verificar modelos locales solo si no se ha hecho
  if (localModelsAvailable === null) {
    try {
      const testUrl = `${LOCAL_MODEL_PATH}Xenova/multilingual-e5-small/config.json`;
      const response = await fetch(testUrl, { method: 'HEAD' });
      localModelsAvailable = response.ok;
    } catch {
      localModelsAvailable = false;
    }
  }

  if (localModelsAvailable) {
    env.localModelPath = LOCAL_MODEL_PATH;
    env.allowRemoteModels = false;
    console.log('[Worker] Modelos locales disponibles');
  } else {
    console.log('[Worker] Usando CDN remoto');
  }

  // Verificar cache de forma más robusta solo si es necesario
  if (typeof caches !== 'undefined') {
    try {
      await caches.open('test');
      await caches.delete('test');
      env.useBrowserCache = true;
    } catch {
      env.useBrowserCache = false;
    }
  }
}

// Singleton del pipeline
let featureExtractionPipeline = null;
let currentConfig = {
  modelId: null,
  device: null,
};

function toPlainArray(vectorLike) {
  if (!vectorLike) return null;
  if (Array.isArray(vectorLike)) return vectorLike;
  // En v3, output.tolist() retorna arrays anidados
  if (typeof vectorLike.tolist === 'function') return vectorLike.tolist();
  if (ArrayBuffer.isView(vectorLike)) return Array.from(vectorLike);
  if (vectorLike?.data) return Array.from(vectorLike.data);
  return vectorLike;
}

function postProgress(requestId, payload) {
  self.postMessage({
    type: 'progress',
    requestId,
    payload,
  });
}

function postResponse(requestId, ok, result, error) {
  self.postMessage({
    type: 'response',
    requestId,
    ok,
    result,
    error,
  });
}

// Detectar soporte WebGPU
function detectDevice(preferredDevice) {
  if (preferredDevice && preferredDevice !== 'auto') {
    return preferredDevice;
  }

  const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
  return hasWebGPU ? 'webgpu' : 'wasm';
}

// Promesa de pipeline en curso para evitar inicializaciones paralelas
let pipelinePromise = null;

async function ensurePipeline({ modelId, device, reportProgress }) {
  const resolvedDevice = detectDevice(device);

  // FAST PATH: Si el modelo ya está en memoria, retornar inmediatamente
  if (
    featureExtractionPipeline &&
    currentConfig.modelId === modelId &&
    currentConfig.device === resolvedDevice
  ) {
    // Notificar sin delay
    reportProgress?.({
      phase: 'cached',
      label: 'Listo',
      percent: 100,
      fromCache: true,
    });
    return featureExtractionPipeline;
  }

  // Si hay una inicialización en curso, esperar a que termine
  if (pipelinePromise) {
    await pipelinePromise;
    return featureExtractionPipeline;
  }

  // Configurar ambiente (solo la primera vez)
  await ensureEnvConfig();

  const report = typeof reportProgress === 'function' ? reportProgress : null;

  // Trackear si hubo eventos de descarga real (no caché)
  let hadDownloadProgress = false;
  const startTime = Date.now();

  // Mostrar estado inicial neutro
  if (report) {
    report({
      phase: 'loading',
      label: 'Preparando modelo',
      percent: 0,
      fromCache: false,
    });
  }

  console.log(
    `[Worker] Iniciando pipeline: model=${modelId}, device=${resolvedDevice}`,
  );

  // Crear promesa de inicialización
  pipelinePromise = (async () => {
    const pipe = await pipeline('feature-extraction', modelId, {
      device: resolvedDevice,
      dtype: 'fp32',
      progress_callback: (data) => {
        // Transformers.js v3 progress callback
        // { status: 'progress', loaded: X, total: Y, file: '...' }
        // { status: 'done', file: '...' }
        // { status: 'initiate', file: '...' }
        if (!report) return;

        if (data.status === 'progress' && data.total > 0) {
          hadDownloadProgress = true;
          const pct = Math.round((data.loaded / data.total) * 100);
          report({
            phase: 'loading',
            label: data.file
              ? `Descargando ${data.file}`
              : 'Descargando modelo',
            percent: pct,
            fromCache: false,
          });
        } else if (data.status === 'done') {
          // Archivo individual completado
          report({
            phase: 'loading',
            label: `Completado: ${data.file || 'archivo'}`,
            percent: null,
            fromCache: false,
          });
        } else if (data.status === 'ready') {
          report({
            phase: 'loading',
            label: 'Modelo listo',
            percent: 100,
            fromCache: !hadDownloadProgress,
          });
        }
      },
    });

    return pipe;
  })();

  try {
    featureExtractionPipeline = await pipelinePromise;
    currentConfig = { modelId, device: resolvedDevice };

    const loadTime = Date.now() - startTime;
    const loadedFromCache = !hadDownloadProgress || loadTime < 2000;

    report?.({
      phase: 'ready',
      label: loadedFromCache ? 'Modelo listo' : 'Modelo descargado',
      percent: 100,
      fromCache: loadedFromCache,
    });

    console.log(
      `[Worker] Pipeline listo: ${modelId} en ${resolvedDevice} (${loadTime}ms)`,
    );
    return featureExtractionPipeline;
  } catch (err) {
    console.error('[Worker] Error inicializando pipeline:', err);
    throw err;
  } finally {
    pipelinePromise = null;
  }
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  const { type, requestId, payload } = data;

  try {
    if (type === 'status') {
      postResponse(requestId, true, {
        ready: Boolean(featureExtractionPipeline),
        config: currentConfig,
      });
      return;
    }

    if (type === 'clearCache') {
      featureExtractionPipeline = null;
      currentConfig = { modelId: null, device: null };
      postResponse(requestId, true, { cleared: true });
      return;
    }

    if (type === 'init') {
      const modelId = payload?.modelId || 'Xenova/multilingual-e5-small';
      const device = payload?.device || 'auto';

      postProgress(requestId, {
        phase: 'loading',
        label: 'Iniciando carga del modelo',
        percent: 0,
      });

      await ensurePipeline({
        modelId,
        device,
        reportProgress: (p) => postProgress(requestId, p),
      });

      postResponse(requestId, true, { ready: true, config: currentConfig });
      return;
    }

    if (type === 'embed') {
      const modelId =
        payload?.modelId ||
        currentConfig.modelId ||
        'Xenova/multilingual-e5-small';
      const device = payload?.device || currentConfig.device || 'auto';
      const texts = payload?.texts;

      if (!Array.isArray(texts) || texts.length === 0) {
        postResponse(requestId, false, null, {
          message: '`texts` debe ser un array no vacío',
        });
        return;
      }

      const pipe = await ensurePipeline({
        modelId,
        device,
        reportProgress: (p) => postProgress(requestId, p),
      });

      // Reportar inicio de procesamiento
      postProgress(requestId, {
        phase: 'running',
        label: 'Generando embeddings',
        percent: 0,
      });

      // En v3, podemos procesar todos los textos de una vez para mejor eficiencia
      const output = await pipe(texts, {
        pooling: 'mean',
        normalize: true,
      });

      // Convertir output a arrays planos
      // output.tolist() en v3 devuelve un array de arrays
      let embeddings;
      if (typeof output.tolist === 'function') {
        embeddings = output.tolist();
      } else if (Array.isArray(output)) {
        embeddings = output.map(toPlainArray);
      } else {
        // Fallback para un solo texto
        embeddings = [toPlainArray(output)];
      }

      postProgress(requestId, {
        phase: 'running',
        label: 'Embeddings generados',
        percent: 100,
      });

      postResponse(requestId, true, {
        modelId: currentConfig.modelId,
        device: currentConfig.device,
        embeddings,
      });
      return;
    }

    postResponse(requestId, false, null, {
      message: `Tipo de mensaje desconocido: ${type}`,
    });
  } catch (err) {
    console.error('[Worker] Error:', err);
    postResponse(requestId, false, null, {
      message: err?.message || String(err),
      name: err?.name,
      stack: err?.stack,
    });
  }
});
