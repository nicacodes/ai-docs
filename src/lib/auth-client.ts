/**
 * Better Auth - Cliente para el navegador
 *
 * Este módulo proporciona las funciones de autenticación para usar
 * en componentes React del lado del cliente.
 */

import { createAuthClient } from 'better-auth/react';

// Crear cliente de autenticación
export const authClient = createAuthClient({
  // La baseURL se detecta automáticamente en el navegador
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:4321',
});

// Exportar funciones y hooks útiles
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
