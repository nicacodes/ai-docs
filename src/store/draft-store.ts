/**
 * Draft Store - Estado global para detectar drafts pendientes.
 *
 * Usado para mostrar "Continuar editando" en lugar de "Nuevo Post"
 * cuando hay un draft guardado en localStorage.
 */

import { atom, onMount } from "nanostores";
import { DRAFT_KEY } from "@/constants";

// ============================================================================
// Atoms
// ============================================================================

/** Indica si hay un draft pendiente guardado */
export const $hasDraft = atom<boolean>(false);

/** Contenido del draft (para preview si se necesita) */
export const $draftPreview = atom<string | null>(null);

// ============================================================================
// Initialization
// ============================================================================

/**
 * Verifica si hay un draft guardado en localStorage.
 * Debe llamarse en el cliente.
 */
export function checkForDraft(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    const hasDraft = !!(draft && draft.trim() && draft !== "# ");
    $hasDraft.set(hasDraft);

    if (hasDraft) {
      // Extraer preview del título
      const lines = draft.split(/\r?\n/);
      for (const line of lines) {
        const match = /^\s*#\s+(.+)\s*$/.exec(line);
        if (match?.[1]) {
          $draftPreview.set(match[1].trim().slice(0, 50));
          break;
        }
      }
    } else {
      $draftPreview.set(null);
    }

    return hasDraft;
  } catch {
    $hasDraft.set(false);
    $draftPreview.set(null);
    return false;
  }
}

/**
 * Limpia el estado del draft.
 */
export function clearDraftState(): void {
  $hasDraft.set(false);
  $draftPreview.set(null);
}

// Auto-inicializar cuando se monta el store en el cliente
onMount($hasDraft, () => {
  checkForDraft();

  // Escuchar cambios en localStorage desde otras pestañas
  const handleStorage = (e: StorageEvent) => {
    if (e.key === DRAFT_KEY) {
      checkForDraft();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
});
