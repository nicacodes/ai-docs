/**
 * Search Store - Estado global para búsqueda semántica.
 *
 * Usa nanostores para comunicar estado entre componentes/islands de Astro.
 */

import { atom, computed } from 'nanostores';

// ============================================================================
// Types
// ============================================================================

export type SearchPhase =
  | 'idle'
  | 'generating-embedding'
  | 'searching'
  | 'done'
  | 'error';

export interface SearchProgress {
  label: string;
  percent: number | null;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  similarity: number;
  createdAt: Date;
}

export interface SearchState {
  phase: SearchPhase;
  query: string;
  results: SearchResult[];
  error: string | null;
  progress: SearchProgress | null;
}

// ============================================================================
// Filters Types
// ============================================================================

export interface SearchFiltersState {
  tagSlugs: string[];
  dateFrom: string; // ISO date string YYYY-MM-DD
  dateTo: string;
  minSimilarity: number;
}

export const defaultFilters: SearchFiltersState = {
  tagSlugs: [],
  dateFrom: '',
  dateTo: '',
  minSimilarity: 0,
};

// ============================================================================
// Atoms
// ============================================================================

/** Estado actual de la fase de búsqueda */
export const $searchPhase = atom<SearchPhase>('idle');

/** Query actual de búsqueda */
export const $searchQuery = atom<string>('');

/** Filtros de búsqueda */
export const $searchFilters = atom<SearchFiltersState>(defaultFilters);

/** Resultados de la búsqueda */
export const $searchResults = atom<SearchResult[]>([]);

/** Error de búsqueda si existe */
export const $searchError = atom<string | null>(null);

/** Progreso de la búsqueda (carga de modelo, generación de embeddings) */
export const $searchProgress = atom<SearchProgress | null>(null);

// ============================================================================
// Computed
// ============================================================================

/** Indica si la búsqueda está en proceso */
export const $isSearching = computed(
  $searchPhase,
  (phase) => phase === 'generating-embedding' || phase === 'searching',
);

/** Indica si hay un error activo */
export const $hasSearchError = computed(
  $searchPhase,
  (phase) => phase === 'error',
);

/** Estado combinado para debugging */
export const $searchState = computed(
  [$searchPhase, $searchQuery, $searchResults, $searchError, $searchProgress],
  (phase, query, results, error, progress): SearchState => ({
    phase,
    query,
    results,
    error,
    progress,
  }),
);

// ============================================================================
// Actions
// ============================================================================

/**
 * Inicia una nueva búsqueda.
 */
export function startSearch(query: string) {
  $searchQuery.set(query);
  $searchPhase.set('generating-embedding');
  $searchError.set(null);
  $searchResults.set([]);
  $searchProgress.set({ label: 'Generando embedding...', percent: null });
}

/**
 * Actualiza la fase a generación de embedding.
 */
export function setGeneratingEmbedding() {
  $searchPhase.set('generating-embedding');
  $searchProgress.set({
    label: 'Generando embedding de la búsqueda...',
    percent: null,
  });
}

/**
 * Actualiza la fase a buscando.
 */
export function setSearchingPhase() {
  $searchPhase.set('searching');
  $searchProgress.set({
    label: 'Buscando documentos similares...',
    percent: null,
  });
}

/**
 * Actualiza el progreso de la búsqueda.
 */
export function setSearchProgress(progress: SearchProgress) {
  $searchProgress.set(progress);
}

/**
 * Finaliza la búsqueda con resultados.
 */
export function finishSearch(results: SearchResult[]) {
  $searchResults.set(results);
  $searchPhase.set('done');
  $searchProgress.set(null);
}

/**
 * Finaliza la búsqueda con error.
 */
export function setSearchError(error: string) {
  $searchError.set(error);
  $searchPhase.set('error');
  $searchProgress.set(null);
}

/**
 * Resetea el estado de búsqueda.
 */
export function resetSearch() {
  $searchPhase.set('idle');
  $searchQuery.set('');
  $searchResults.set([]);
  $searchError.set(null);
  $searchProgress.set(null);
}

/**
 * Limpia solo los resultados y el estado (mantiene el query).
 */
export function clearSearchResults() {
  $searchResults.set([]);
  $searchPhase.set('idle');
  $searchError.set(null);
  $searchProgress.set(null);
}

/**
 * Actualiza los filtros de búsqueda.
 */
export function setSearchFilters(filters: SearchFiltersState) {
  $searchFilters.set(filters);
}

/**
 * Resetea los filtros a valores por defecto.
 */
export function resetSearchFilters() {
  $searchFilters.set(defaultFilters);
}
