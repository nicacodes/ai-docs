export {};

declare global {
  interface Window {
    aiEmbeddings?: {
      init: (
        model?: { modelId?: string; device?: 'wasm' | 'webgpu' },
        onProgress?: (p: unknown) => void,
      ) => Promise<unknown>;
      embedPost: (args: {
        postId: string;
        text: string;
        model?: { modelId?: string; device?: 'wasm' | 'webgpu' };
        onProgress?: (p: unknown) => void;
      }) => Promise<number[]>;
      status: () => Promise<unknown>;
      clearCaches: () => Promise<void>;
    };
  }
}
