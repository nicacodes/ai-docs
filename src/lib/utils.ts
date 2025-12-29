import { STORAGE_KEY, DRAFT_KEY } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inferTitle(md: string): string {
  const lines = String(md || "").split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*#\s+(.+)\s*$/.exec(line);
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  for (const line of lines) {
    const t = line.trim();
    if (t) return t.slice(0, 120);
  }
  return "Sin título";
}

export function loadCurrentDoc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const id = parsed.id;
    const slug = parsed.slug;
    if (typeof id !== "string" || typeof slug !== "string") return null;
    if (!id || !slug) return null;
    return { id, slug } as const;
  } catch {
    return null;
  }
}

/**
 * Guarda el contenido del draft en localStorage.
 * Se usa para persistir el trabajo en progreso.
 */
export function saveDraftContent(content: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, content);
  } catch (e) {
    console.warn("Error guardando draft:", e);
  }
}

/**
 * Carga el contenido del draft desde localStorage.
 * Retorna null si no hay draft.
 */
export function loadDraftContent(): string | null {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    // Solo retornar si tiene contenido significativo
    if (draft && draft.trim() && draft !== "# ") {
      return draft;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Limpia el draft del localStorage.
 * Se llama cuando se guarda exitosamente el documento.
 */
export function clearDraftContent(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignorar errores
  }
}
