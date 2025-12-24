export type StoredEmbedding = {
  key: string;
  postId: string;
  modelId: string;
  device: string;
  pooling: 'mean';
  normalize: true;
  contentHash: string;
  embedding: number[];
  updatedAt: number;
};

const DB_NAME = 'ai-editor';
const DB_VERSION = 1;
const STORE = 'embeddings';

function fnv1a32(str: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // unsigned
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function contentHash(text: string) {
  return fnv1a32(text);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error('No se pudo abrir IndexedDB'));
  });
}

export function makeEmbeddingKey(args: {
  postId: string;
  modelId: string;
  device: string;
  pooling: 'mean';
  normalize: true;
  contentHash: string;
}) {
  // Si cambia el texto, cambia la key y se recalcula.
  return [
    args.postId,
    args.modelId,
    args.device,
    args.pooling,
    args.normalize ? 'norm1' : 'norm0',
    args.contentHash,
  ].join('::');
}

export function computeEmbeddingIdentity(args: {
  postId: string;
  modelId: string;
  device: string;
  pooling?: 'mean';
  normalize?: true;
  text: string;
}) {
  const pooling: 'mean' = args.pooling ?? 'mean';
  const normalize: true = true;
  const h = contentHash(args.text);
  const key = makeEmbeddingKey({
    postId: args.postId,
    modelId: args.modelId,
    device: args.device,
    pooling,
    normalize,
    contentHash: h,
  });

  return { key, contentHash: h, pooling, normalize };
}

export async function getStoredEmbedding(args: {
  postId: string;
  modelId: string;
  device: string;
  pooling?: 'mean';
  normalize?: true;
  text: string;
}): Promise<StoredEmbedding | null> {
  const { key } = computeEmbeddingIdentity(args);

  const db = await openDb();
  try {
    return await new Promise<StoredEmbedding | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as StoredEmbedding) ?? null);
      req.onerror = () =>
        reject(req.error ?? new Error('Error leyendo IndexedDB'));
    });
  } finally {
    db.close();
  }
}

export async function putStoredEmbedding(
  entry: Omit<StoredEmbedding, 'updatedAt'>,
) {
  const db = await openDb();
  try {
    const value: StoredEmbedding = { ...entry, updatedAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Error escribiendo IndexedDB'));
      tx.objectStore(STORE).put(value);
    });
  } finally {
    db.close();
  }
}

export async function clearEmbeddingsStore() {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Error limpiando IndexedDB'));
      tx.objectStore(STORE).clear();
    });
  } finally {
    db.close();
  }
}
