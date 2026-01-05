/**
 * API Route - Better Auth Handler
 *
 * Este endpoint maneja todas las rutas de autenticación:
 * - POST /api/auth/sign-up
 * - POST /api/auth/sign-in
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - etc.
 */

import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth';

export const ALL: APIRoute = async (context) => {
  return auth.handler(context.request);
};

// También exportamos métodos específicos para Astro
export const GET: APIRoute = async (context) => {
  return auth.handler(context.request);
};

export const POST: APIRoute = async (context) => {
  return auth.handler(context.request);
};
