import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { actions } from 'astro:actions';
import { Search, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { embedQuery } from '@/scripts/ai-embeddings';
import { PostItem } from './PostItem';
import { SearchResultSkeleton } from './SearchResultSkeleton';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  startSearch,
  setGeneratingEmbedding,
  setSearchingPhase,
  setSearchProgress,
  finishSearch,
  setSearchError,
  resetSearch,
  $searchFilters,
  type SearchResult,
  type SearchPhase,
} from '@/store/search-store';

interface SearchResultsProps {
  query: string;
  className?: string;
}

function SearchResults({ query, className }: SearchResultsProps) {
  const filters = useStore($searchFilters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<string>('');

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setPhase('idle');
      resetSearch();
      return;
    }

    const currentFilters = $searchFilters.get();

    setError(null);
    setPhase('generating-embedding');
    setProgressInfo('Generando embedding de la búsqueda...');

    // Update global store - notifies GlobalHeader
    startSearch(searchQuery);

    try {
      // 1) Generar embedding de la query
      setGeneratingEmbedding();

      const queryEmbedding = await embedQuery({
        query: searchQuery,
        onProgress: (p: any) => {
          // Formato del servidor: { phase, label, percent }
          if (p?.phase === 'running') {
            setProgressInfo(p.label || 'Generando embedding...');
            setSearchProgress({
              label: p.label || 'Generando embedding...',
              percent: p.percent || null,
            });
          } else if (p?.phase === 'cached') {
            setProgressInfo('Desde cache');
          }
        },
      });

      // 2) Realizar búsqueda semántica con filtros
      setPhase('searching');
      setProgressInfo('Buscando documentos similares...');
      setSearchingPhase();

      // Preparar filtros para la API
      const apiFilters = {
        tagSlugs:
          currentFilters.tagSlugs.length > 0
            ? currentFilters.tagSlugs
            : undefined,
        dateFrom: currentFilters.dateFrom || undefined,
        dateTo: currentFilters.dateTo || undefined,
        minSimilarity:
          currentFilters.minSimilarity > 0
            ? currentFilters.minSimilarity
            : undefined,
      };

      const result = await actions.documents.semanticSearch({
        queryEmbedding,
        limit: 15,
        filters: apiFilters,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Error en la búsqueda');
      }

      const mappedResults = result.data.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      }));

      setResults(mappedResults);
      setPhase('done');

      // Update global store with results
      finishSearch(mappedResults);
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setPhase('error');
      setSearchError(errorMessage);
    }
  }, []);

  // Buscar cuando cambia la query
  useEffect(() => {
    if (query) {
      performSearch(query);
    }

    // Cleanup on unmount
    return () => {
      resetSearch();
    };
  }, [query, performSearch]);

  // Buscar de nuevo cuando cambian los filtros (solo si ya hay query y búsqueda completada)
  useEffect(() => {
    if (query && phase === 'done') {
      performSearch(query);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = phase === 'generating-embedding' || phase === 'searching';

  // Error state
  if (phase === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-center',
          className,
        )}
      >
        <div className='size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
          <AlertCircle size={32} className='text-destructive' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>Error en la búsqueda</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>{error}</p>
        <Button onClick={() => performSearch(query)}>Reintentar</Button>
      </div>
    );
  }

  // Loading state with skeletons
  if (isLoading) {
    return (
      <div className={className}>
        {/* Status indicator */}
        <div className='flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-muted/50 border border-border/50'>
          <div className='relative'>
            <Sparkles size={18} className='text-primary animate-pulse' />
            <div className='absolute inset-0 animate-ping'>
              <Sparkles size={18} className='text-primary/30' />
            </div>
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium text-foreground'>
              {phase === 'generating-embedding' && 'Analizando búsqueda...'}
              {phase === 'searching' && 'Buscando...'}
            </p>
            <p className='text-xs text-muted-foreground truncate'>
              {progressInfo}
            </p>
          </div>
        </div>

        {/* Skeletons */}
        <div className='divide-y divide-border/50'>
          {[...Array(5)].map((_, i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // No query
  if (!query.trim()) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 text-center',
          className,
        )}
      >
        <div className='size-16 rounded-full bg-muted flex items-center justify-center mb-4'>
          <Search size={32} className='text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>Busca en el blog</h3>
        <p className='text-muted-foreground max-w-sm'>
          Escribe una consulta para encontrar posts relacionados usando IA.
        </p>
      </div>
    );
  }

  // No results
  if (results.length === 0 && phase === 'done') {
    return (
      <div className={className}>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='size-16 rounded-full bg-muted flex items-center justify-center mb-4'>
            <FileText size={32} className='text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold mb-2'>Sin resultados</h3>
          <p className='text-muted-foreground max-w-sm'>
            No se encontraron posts similares a "{query}".
            <br />
            Intenta con otras palabras o ajusta los filtros en la barra
            superior.
          </p>
        </div>
      </div>
    );
  }

  // Results list
  return (
    <div className={className}>
      {/* Results info */}
      <div className='flex items-center gap-2 mb-4 text-sm text-muted-foreground'>
        <Sparkles size={14} className='text-primary' />
        <span>
          {results.length} resultado{results.length !== 1 ? 's' : ''} para "
          {query}"
        </span>
      </div>

      {/* Results */}
      <div className='divide-y divide-border/50'>
        {results.map((result) => (
          <div key={result.id} className='relative'>
            {/* Similarity badge */}
            <div className='absolute right-0 top-5 z-10'>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  result.similarity >= 0.7
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : result.similarity >= 0.5
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {Math.round(result.similarity * 100)}%
              </span>
            </div>
            <PostItem
              id={result.id}
              title={result.title}
              slug={result.slug}
              excerpt={result.excerpt}
              createdAt={result.createdAt}
              className='pr-16'
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { SearchResults };
