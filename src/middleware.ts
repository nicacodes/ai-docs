/**
 * Middleware de Autenticación para Astro
 *
 * Protege rutas que requieren autenticación y añade
 * información del usuario al contexto de Astro.
 */

import { defineMiddleware } from 'astro:middleware';
import { auth } from '@/lib/auth';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth',
  '/_image', // Astro image optimization
];

// Verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Permitir rutas públicas sin verificación
  if (isPublicRoute(pathname)) {
    return next();
  }

  try {
    // Obtener sesión del usuario
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    // Guardar sesión en locals para acceso en páginas/componentes
    context.locals.session = session;
    context.locals.user = session?.user ?? null;

    // Para rutas protegidas, verificar autenticación
    // Por ahora, permitimos acceso a todas las rutas (puedes cambiar esto)
    // Descomenta las siguientes líneas para requerir auth en todas las rutas:

    // if (!session?.user) {
    //   const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    //   return context.redirect(redirectUrl);
    // }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    context.locals.session = null;
    context.locals.user = null;
  }

  return next();
});
