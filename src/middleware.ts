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
  '/', // Home - lista de posts
  '/post/', // Ver posts (solo lectura)
  '/search', // Búsqueda
  '/login',
  '/api/auth',
  '/_image', // Astro image optimization
];

// Rutas que requieren autenticación
const PROTECTED_ROUTES = [
  '/new', // Crear nuevo documento
  '/edit/', // Editar documento
  '/proposals', // Lista de propuestas
  '/profile', // Perfil de usuario
];

// Verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  // Home exacto
  if (pathname === '/') return true;
  // Otras rutas públicas
  return PUBLIC_ROUTES.some(
    (route) => route !== '/' && pathname.startsWith(route),
  );
}

// Verificar si una ruta requiere autenticación
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  try {
    // Siempre intentar obtener la sesión para tenerla disponible en locals
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    // Guardar sesión en locals para acceso en páginas/componentes
    context.locals.session = session;
    context.locals.user = session?.user ?? null;

    // Si es ruta pública, permitir acceso
    if (isPublicRoute(pathname)) {
      return next();
    }

    // Si es ruta protegida y no hay sesión, redirigir a login
    if (isProtectedRoute(pathname) && !session?.user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
    context.locals.session = null;
    context.locals.user = null;

    // Si hay error y es ruta protegida, redirigir a login
    if (isProtectedRoute(pathname)) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }
  }

  return next();
});
