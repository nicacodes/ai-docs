#!/usr/bin/env node
/**
 * Script para descargar el modelo de embeddings y servirlo localmente.
 * Esto permite que en Docker los clientes descarguen desde la LAN
 * en lugar de desde el CDN de Hugging Face.
 *
 * Uso: node scripts/download-model.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const MODEL_ID = 'Xenova/multilingual-e5-small';
const BASE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main`;
const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'models', MODEL_ID);

// Archivos necesarios para el modelo
const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'onnx/model.onnx',
  'onnx/model_quantized.onnx',
];

async function downloadFile(filename) {
  const url = `${BASE_URL}/${filename}`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  const outputDirPath = path.dirname(outputPath);

  // Crear directorio si no existe
  if (!existsSync(outputDirPath)) {
    await mkdir(outputDirPath, { recursive: true });
  }

  // Si ya existe, skip
  if (existsSync(outputPath)) {
    console.log(`✓ ${filename} (ya existe)`);
    return;
  }

  console.log(`↓ Descargando ${filename}...`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ai-docs-model-downloader/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Error descargando ${filename}: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`✓ ${filename} (${sizeMB} MB)`);
}

async function main() {
  console.log(`\n📦 Descargando modelo: ${MODEL_ID}\n`);
  console.log(`   Destino: ${OUTPUT_DIR}\n`);

  // Crear directorio base
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Descargar cada archivo
  for (const file of MODEL_FILES) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(`✗ Error con ${file}:`, err.message);
      // Continuar con otros archivos
    }
  }

  console.log(
    '\n✅ Modelo descargado. Los clientes lo cargarán desde el servidor local.\n',
  );
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
