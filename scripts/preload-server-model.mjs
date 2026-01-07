#!/usr/bin/env node
/**
 * Script para pre-cargar el modelo de embeddings en el servidor.
 * Descarga y cachea el modelo para que esté listo al iniciar.
 *
 * Uso: node scripts/preload-server-model.mjs
 */

import { preloadModel } from '../dist/lib/embeddings-server.js';

console.log('🔄 Pre-cargando modelo de embeddings en el servidor...\n');

try {
  await preloadModel();
  console.log('\n✅ Modelo pre-cargado exitosamente');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error pre-cargando modelo:', error);
  process.exit(1);
}
