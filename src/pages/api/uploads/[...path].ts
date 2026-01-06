/**
 * API Route - Serve Uploaded Files
 *
 * Este endpoint sirve archivos subidos desde la carpeta de uploads.
 * Necesario para Docker donde los uploads están en un volumen externo.
 *
 * GET /api/uploads/[...path]
 */

import type { APIRoute } from 'astro';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Tipos MIME por extensión
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// Directorio de uploads
function getUploadDir(): string {
  const customPath = process.env.UPLOAD_DIR;
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.resolve(process.cwd(), 'public', 'uploads');
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const fileName = params.path;

    if (!fileName) {
      return new Response('Not Found', { status: 404 });
    }

    // Sanitizar el path para evitar path traversal
    const sanitizedName = path.basename(fileName);
    if (sanitizedName !== fileName || fileName.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, sanitizedName);

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    // Obtener stats del archivo
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return new Response('Not Found', { status: 404 });
    }

    // Leer el archivo
    const buffer = await readFile(filePath);

    // Determinar el MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Retornar con headers de cache
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(
          16,
        )}"`,
      },
    });
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
