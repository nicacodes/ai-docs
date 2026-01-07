/**
 * API Route - Server-Side Embeddings
 *
 * Genera embeddings en el servidor en lugar del navegador.
 * Mucho más rápido para entornos Docker/LAN.
 *
 * POST /api/embeddings
 * Body: { text: string } | { texts: string[] }
 * Response: { embedding: number[] } | { embeddings: number[][] }
 */

import type { APIRoute } from 'astro';
import {
  generateEmbedding,
  generateEmbeddingsBatch,
  isModelReady,
} from '@/lib/embeddings-server';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validar input
    if (!body.text && !body.texts) {
      return new Response(
        JSON.stringify({ error: 'Se requiere "text" o "texts"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const startTime = Date.now();

    // Single text
    if (body.text && typeof body.text === 'string') {
      const embedding = await generateEmbedding(body.text);

      return new Response(
        JSON.stringify({
          embedding,
          dimensions: embedding.length,
          timeMs: Date.now() - startTime,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Batch texts
    if (body.texts && Array.isArray(body.texts)) {
      if (body.texts.length === 0) {
        return new Response(
          JSON.stringify({ error: '"texts" no puede estar vacío' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (body.texts.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Máximo 100 textos por request' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const embeddings = await generateEmbeddingsBatch(body.texts);
      console.log('Generated embeddings for batch:', embeddings);
      return new Response(
        JSON.stringify({
          embeddings,
          count: embeddings.length,
          dimensions: embeddings[0]?.length || 0,
          timeMs: Date.now() - startTime,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'Formato inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API Embeddings] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error generando embeddings',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

// GET para verificar estado
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ready: isModelReady(),
      model: 'Xenova/multilingual-e5-small',
      dimensions: 384,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
