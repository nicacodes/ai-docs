/* Service Worker: embeddings (Transformers.js)
   Nota: se sirve desde /sw.js como archivo estático (Astro public/).
*/

const CACHE_VERSION = 'v1';
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

// Estado del pipeline
let featureExtractionPipeline = null;
let currentConfig = {
  modelId: null,
  device: null,
};

function isSameOriginRequest(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('assets-') && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Cache básico para assets same-origin (no fuerza cache para modelos remotos)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // En desarrollo (localhost), evitamos cachear para no romper Vite (optimizeDeps/HMR).
  // El SW igual sigue funcionando para embeddings via postMessage.
  try {
    const isDevHost =
      self.location.hostname === 'localhost' ||
      self.location.hostname === '127.0.0.1' ||
      self.location.hostname === '::1';
    if (isDevHost) return;
  } catch {
    // ignore
  }

  // En desarrollo, Vite sirve módulos y el cliente HMR bajo rutas especiales.
  // Cachearlas provoca que el navegador use un cliente viejo y falle el WebSocket.
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (
      path.startsWith('/@vite/') ||
      path.startsWith('/@id/') ||
      path.startsWith('/@fs/') ||
      path.startsWith('/node_modules/')
    ) {
      return;
    }
  } catch {
    // ignore
  }

  // Solo cachear same-origin para evitar sorpresas con CORS/opaque
  if (!isSameOriginRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // Solo cachear respuestas OK y que no estén marcadas como no-cache/no-store.
      // Esto evita cachear assets de dev server y otros recursos efímeros.
      const cacheControl = response?.headers?.get('cache-control') || '';
      const noStore = /\bno-store\b/i.test(cacheControl);
      const noCache = /\bno-cache\b/i.test(cacheControl);

      if (response && response.ok && !noStore && !noCache) {
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});

async function ensurePipeline({ modelId, device }) {
  if (
    featureExtractionPipeline &&
    currentConfig.modelId === modelId &&
    currentConfig.device === device
  ) {
    return featureExtractionPipeline;
  }

  // Import ESM desde CDN para poder correr en SW sin bundling
  // Si luego quieres self-host / bundling, este import es el primer cambio.
  const mod = await import(
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm'
  );
  const { pipeline, env } = mod;

  // Ajustes de entorno: permitir modelos remotos y cache en navegador
  env.allowRemoteModels = true;
  env.useBrowserCache = true;

  // Preferencia de backend (Transformers.js decide fallback si no está disponible)
  // device: 'webgpu' | 'wasm'
  const resolvedDevice = device || 'wasm';

  featureExtractionPipeline = await pipeline('feature-extraction', modelId, {
    device: resolvedDevice,
  });

  currentConfig = { modelId, device: resolvedDevice };
  return featureExtractionPipeline;
}

function toPlainArray(vectorLike) {
  if (!vectorLike) return null;
  if (Array.isArray(vectorLike)) return vectorLike;
  if (ArrayBuffer.isView(vectorLike)) return Array.from(vectorLike);
  return vectorLike;
}

function postProgress(client, requestId, progress) {
  client?.postMessage({
    type: 'progress',
    requestId,
    payload: progress,
  });
}

self.addEventListener('message', (event) => {
  event.waitUntil(handleMessage(event));
});

async function handleMessage(event) {
  const client = event.source;
  const data = event.data || {};
  const { type, requestId, payload } = data;

  const reply = (ok, result, error) => {
    client?.postMessage({
      type: 'response',
      requestId,
      ok,
      result,
      error,
    });
  };

  try {
    if (type === 'status') {
      reply(true, {
        ready: Boolean(featureExtractionPipeline),
        config: currentConfig,
      });
      return;
    }

    if (type === 'clearCache') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      featureExtractionPipeline = null;
      currentConfig = { modelId: null, device: null };
      reply(true, { cleared: true });
      return;
    }

    if (type === 'init') {
      const modelId = payload?.modelId || 'Xenova/multilingual-e5-large';
      const device = payload?.device || 'wasm';

      postProgress(client, requestId, {
        phase: 'loading',
        message: 'Cargando modelo…',
      });
      await ensurePipeline({ modelId, device });
      reply(true, { ready: true, config: currentConfig });
      return;
    }

    if (type === 'embed') {
      const modelId =
        payload?.modelId ||
        currentConfig.modelId ||
        'Xenova/multilingual-e5-large';
      const device = payload?.device || currentConfig.device || 'wasm';
      const texts = payload?.texts;

      if (!Array.isArray(texts) || texts.length === 0) {
        reply(false, null, { message: '`texts` debe ser un array no vacío' });
        return;
      }

      const pipe = await ensurePipeline({ modelId, device });

      const embeddings = [];
      for (let i = 0; i < texts.length; i++) {
        postProgress(client, requestId, {
          phase: 'running',
          index: i,
          total: texts.length,
        });

        // E5 suele funcionar mejor con prefijos "query:"/"passage:"; lo dejamos al llamador.
        const output = await pipe(texts[i], {
          pooling: 'mean',
          normalize: true,
        });

        // output suele ser Tensor/TypedArray; normalizamos a number[]
        const vector = Array.isArray(output) ? output : output?.data;
        embeddings.push(toPlainArray(vector));
      }

      reply(true, {
        modelId: currentConfig.modelId,
        device: currentConfig.device,
        embeddings,
      });
      return;
    }

    reply(false, null, { message: `Tipo de mensaje desconocido: ${type}` });
  } catch (err) {
    reply(false, null, {
      message: err?.message || String(err),
      name: err?.name,
      stack: err?.stack,
    });
  }
}
