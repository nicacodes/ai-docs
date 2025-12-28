/**
 * Preprocesamiento de texto markdown para generar embeddings de alta calidad.
 * 
 * El objetivo es extraer el contenido semántico limpio, eliminando sintaxis
 * markdown y elementos que no aportan significado para búsqueda semántica.
 */

/**
 * Limpia el texto markdown eliminando sintaxis y extrayendo contenido semántico.
 * Optimizado para el modelo E5 que usa prefijos 'passage:' y 'query:'.
 */
export function cleanMarkdownForEmbedding(rawMarkdown: string): string {
  let text = rawMarkdown;

  // 1. Eliminar bloques de código (```...``` y ~~~...~~~)
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/~~~[\s\S]*?~~~/g, ' ');

  // 2. Eliminar código inline (`code`)
  text = text.replace(/`[^`\n]+`/g, ' ');

  // 3. Eliminar imágenes ![alt](url) - mantener solo el alt text si es descriptivo
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => {
    // Mantener alt text si tiene más de 3 palabras (probablemente descriptivo)
    const words = alt.trim().split(/\s+/).filter(Boolean);
    return words.length > 2 ? ` ${alt} ` : ' ';
  });

  // 4. Extraer texto de links [text](url) - mantener solo el texto
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, ' $1 ');

  // 5. Eliminar links reference-style [text][ref] y definiciones [ref]: url
  text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/g, ' $1 ');
  text = text.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, '');

  // 6. Eliminar URLs sueltas (http://, https://, www.)
  text = text.replace(/https?:\/\/\S+/gi, ' ');
  text = text.replace(/www\.\S+/gi, ' ');

  // 7. Eliminar HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 8. Eliminar marcadores de headers (# ## ### etc) pero mantener el texto
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 9. Eliminar énfasis (bold, italic) pero mantener el texto
  // **bold** or __bold__
  text = text.replace(/(\*\*|__)(.*?)\1/g, ' $2 ');
  // *italic* or _italic_
  text = text.replace(/(\*|_)([^*_]+)\1/g, ' $2 ');

  // 10. Eliminar strikethrough ~~text~~
  text = text.replace(/~~([^~]+)~~/g, ' $1 ');

  // 11. Eliminar blockquotes >
  text = text.replace(/^>\s*/gm, '');

  // 12. Eliminar horizontal rules (---, ***, ___)
  text = text.replace(/^[-*_]{3,}\s*$/gm, ' ');

  // 13. Eliminar marcadores de listas (-, *, +, 1., etc)
  text = text.replace(/^[\s]*[-*+]\s+/gm, ' ');
  text = text.replace(/^[\s]*\d+\.\s+/gm, ' ');

  // 14. Eliminar task list markers [ ] [x]
  text = text.replace(/\[[ x]\]\s*/gi, ' ');

  // 15. Eliminar footnotes [^1] y sus definiciones
  text = text.replace(/\[\^[^\]]+\]/g, ' ');
  text = text.replace(/^\[\^[^\]]+\]:.*$/gm, '');

  // 16. Eliminar caracteres especiales de markdown restantes
  text = text.replace(/[\\|`~^]/g, ' ');

  // 17. Normalizar espacios en blanco
  text = text.replace(/\s+/g, ' ');

  // 18. Trim
  text = text.trim();

  return text;
}

/**
 * Prepara el texto para generar un embedding de documento (passage).
 * Incluye el título prominente para mejorar la relevancia.
 */
export function preparePassageText(title: string, rawMarkdown: string): string {
  const cleanedContent = cleanMarkdownForEmbedding(rawMarkdown);
  
  // Combinar título y contenido.
  // El título va primero porque tiene mayor peso semántico.
  // Nota: No agregamos el prefijo 'passage:' aquí, eso lo hace embedPost.
  const combined = `${title}. ${cleanedContent}`;
  
  // Limitar longitud para evitar truncamiento en el modelo
  // multilingual-e5-small tiene un límite de ~512 tokens (~2000 caracteres aprox)
  const MAX_LENGTH = 1800;
  if (combined.length > MAX_LENGTH) {
    return combined.slice(0, MAX_LENGTH) + '...';
  }
  
  return combined;
}

/**
 * Extrae un resumen/excerpt del contenido para display.
 */
export function extractExcerpt(rawMarkdown: string, maxLength: number = 160): string {
  const cleaned = cleanMarkdownForEmbedding(rawMarkdown);
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Intentar cortar en un límite de palabra
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Divide un documento largo en chunks para embeddings múltiples.
 * Útil para documentos muy largos donde un solo embedding no captura todo el contenido.
 */
export function chunkDocument(
  rawMarkdown: string,
  options: { maxChunkSize?: number; overlap?: number } = {}
): string[] {
  const { maxChunkSize = 1500, overlap = 200 } = options;
  
  const cleaned = cleanMarkdownForEmbedding(rawMarkdown);
  
  // Si el documento es corto, retornar como un solo chunk
  if (cleaned.length <= maxChunkSize) {
    return [cleaned];
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < cleaned.length) {
    let end = start + maxChunkSize;
    
    // Intentar cortar en límite de oración o párrafo
    if (end < cleaned.length) {
      // Buscar el último punto, signo de interrogación o exclamación
      const searchArea = cleaned.slice(start, end);
      const sentenceEnd = Math.max(
        searchArea.lastIndexOf('. '),
        searchArea.lastIndexOf('? '),
        searchArea.lastIndexOf('! ')
      );
      
      if (sentenceEnd > maxChunkSize * 0.5) {
        end = start + sentenceEnd + 1;
      }
    }
    
    const chunk = cleaned.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Avanzar con overlap para contexto
    start = end - overlap;
  }
  
  return chunks;
}
