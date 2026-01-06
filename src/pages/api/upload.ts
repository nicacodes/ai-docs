/**
 * API Route - Image Upload Handler
 *
 * Endpoint para subir imágenes desde el editor Milkdown.
 * Las imágenes se guardan en la carpeta de uploads y se retorna la URL.
 *
 * POST /api/upload
 * - Requiere autenticación
 * - Acepta multipart/form-data con campo "file"
 * - Retorna JSON con { url: string }
 */

import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Tipos de imagen permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

// Extensiones por MIME type
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

// Tamaño máximo: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Directorio de uploads (configurable vía env)
function getUploadDir(): string {
  const customPath = process.env.UPLOAD_DIR;
  if (customPath) {
    return path.resolve(customPath);
  }
  // Por defecto: public/uploads en el proyecto
  return path.resolve(process.cwd(), 'public', 'uploads');
}

// Genera un nombre de archivo único
function generateFileName(mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] || '.bin';
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verificar autenticación
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Se esperaba multipart/form-data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Parsear el formulario
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No se encontró el archivo' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Tipo de archivo no permitido: ${file.type}`,
          allowedTypes: ALLOWED_MIME_TYPES,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Archivo demasiado grande. Máximo: ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Crear directorio si no existe
    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generar nombre y ruta
    const fileName = generateFileName(file.type);
    const filePath = path.join(uploadDir, fileName);

    // Escribir archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Generar URL pública
    // Si hay UPLOAD_DIR (Docker), usamos la ruta API para servir
    // Si no, el archivo está en public/uploads y se sirve estáticamente
    let publicUrl: string;
    const urlPrefix = process.env.UPLOAD_URL_PREFIX;
    const useExternalDir = !!process.env.UPLOAD_DIR;

    if (urlPrefix) {
      // URL personalizada (para CDN, storage externo, etc.)
      publicUrl = `${urlPrefix.replace(/\/$/, '')}/${fileName}`;
    } else if (useExternalDir) {
      // Docker: servir a través del endpoint API
      publicUrl = `/api/uploads/${fileName}`;
    } else {
      // Local: servir directamente desde public/uploads
      publicUrl = `/uploads/${fileName}`;
    }

    return new Response(
      JSON.stringify({
        url: publicUrl,
        fileName,
        size: file.size,
        type: file.type,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error en upload:', error);
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};

// No permitir otros métodos
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'Método no permitido' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};
