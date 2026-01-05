/**
 * Better Auth - Configuración del servidor
 *
 * Este módulo configura el servidor de autenticación con:
 * - Drizzle adapter para PostgreSQL
 * - Email + Password authentication
 * - Configuración de sesiones
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@/db/client';
import * as authSchema from '@/db/auth-schema';

// Leer variables de entorno
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env?.[key] ?? process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Variable de entorno ${key} no está configurada`);
  }
  return value;
}

export const auth = betterAuth({
  // Base URL de la aplicación
  baseURL: getEnvVar('BETTER_AUTH_URL', 'http://localhost:4321'),

  // Secret para firmar tokens (genera uno seguro para producción)
  secret: getEnvVar('BETTER_AUTH_SECRET', 'dev-secret-change-in-production'),

  // Adapter de Drizzle con PostgreSQL
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: authSchema,
  }),

  // Métodos de autenticación habilitados
  emailAndPassword: {
    enabled: true,
    // Para desarrollo, no requerimos verificación de email
    requireEmailVerification: false,
  },

  // Configuración de sesiones
  session: {
    // Duración de la sesión: 7 días
    expiresIn: 60 * 60 * 24 * 7,
    // Renovar si quedan menos de 1 día
    updateAge: 60 * 60 * 24,
    // Usar cookies seguras en producción
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutos de cache
    },
  },

  // Campos adicionales del usuario
  user: {
    additionalFields: {
      // Puedes agregar campos custom aquí si lo necesitas
    },
  },
});

// Exportar tipos para usar en el cliente
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
