export type SwRequestType = 'init' | 'embed' | 'status' | 'clearCache';

export type SwRequest = {
  type: SwRequestType;
  requestId: string;
  payload?: unknown;
};

export type SwResponse = {
  type: 'response';
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: unknown;
};

export type SwProgress = {
  type: 'progress';
  requestId: string;
  payload: unknown;
};

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function waitForController(timeoutMs = 10_000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers no están soportados en este navegador.');
  }

  if (navigator.serviceWorker.controller) return;

  // Si no hay controller, esperamos a que el SW tome control.
  await Promise.race([
    new Promise<void>((resolve) => {
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          onControllerChange,
        );
        resolve();
      };
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        onControllerChange,
      );
    }),
    new Promise<void>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'Timeout esperando al controller del Service Worker. Recarga la página.',
            ),
          ),
        timeoutMs,
      ),
    ),
  ]);
}

export async function registerServiceWorker(swUrl = '/sw.js') {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers no están soportados en este navegador.');
  }

  const reg = await navigator.serviceWorker.register(swUrl, {
    scope: '/',
    // Importante: el SW usa `import()`; debe registrarse como módulo.
    type: 'module',
  });

  // Esperar a que esté listo (instalado/activado)
  await navigator.serviceWorker.ready;
  // Esperar a tener controller
  await waitForController();

  return reg;
}

export function createSwRpcClient() {
  const pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (err: unknown) => void;
      onProgress?: (payload: unknown) => void;
      timeoutId?: number;
    }
  >();

  const isSwMessage = (value: unknown): value is SwResponse | SwProgress => {
    if (!value || typeof value !== 'object') return false;
    const v = value as any;
    return (
      (v.type === 'response' || v.type === 'progress') &&
      typeof v.requestId === 'string'
    );
  };

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!isSwMessage(data)) return;

    const entry = pending.get(data.requestId);
    if (!entry) return;

    if (data.type === 'progress') {
      entry.onProgress?.(data.payload);
      return;
    }

    if (data.type === 'response') {
      if (entry.timeoutId) window.clearTimeout(entry.timeoutId);
      pending.delete(data.requestId);

      if (data.ok) entry.resolve(data.result);
      else
        entry.reject(
          data.error ?? new Error('Error desconocido del Service Worker.'),
        );
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);

  const call = async <TResult = unknown>(
    type: SwRequestType,
    payload?: unknown,
    opts?: {
      timeoutMs?: number;
      onProgress?: (payload: unknown) => void;
    },
  ): Promise<TResult> => {
    await waitForController();

    const controller = navigator.serviceWorker.controller;
    if (!controller)
      throw new Error(
        'No hay controller del Service Worker. Recarga la página.',
      );

    const requestId = randomId();

    const timeoutMs = opts?.timeoutMs ?? 60_000;
    return await new Promise<TResult>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Timeout llamando al Service Worker (${type}).`));
      }, timeoutMs);

      pending.set(requestId, {
        resolve: resolve as unknown as (value: unknown) => void,
        reject,
        onProgress: opts?.onProgress,
        timeoutId,
      });

      const message: SwRequest = { type, requestId, payload };
      controller.postMessage(message);
    });
  };

  const dispose = () => {
    navigator.serviceWorker.removeEventListener('message', onMessage);
    for (const [id, entry] of pending.entries()) {
      if (entry.timeoutId) window.clearTimeout(entry.timeoutId);
      entry.reject(new Error('RPC client disposed'));
      pending.delete(id);
    }
  };

  return { call, dispose };
}
