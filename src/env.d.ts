/// <reference types="astro/client" />

// Tipos para Better Auth
interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthSession {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
  user: AuthUser;
}

declare namespace App {
  interface Locals {
    session: AuthSession | null;
    user: AuthUser | null;
  }
}

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
