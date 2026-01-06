/**
 * SearchFilters - Filtros avanzados para búsqueda semántica
 *
 * Permite filtrar por: tags, rango de fechas, similitud mínima
 * Usa Popover de shadcn para un diseño más profesional
 */

import { useState, useEffect } from 'react';
import { actions } from 'astro:actions';
import {
  Filter,
  X,
  Calendar,
  Tag,
  Check,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface SearchFiltersState {
  tagSlugs: string[];
  dateFrom: string; // ISO date string YYYY-MM-DD
  dateTo: string;
  minSimilarity: number;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  className?: string;
}

// ============================================================================
// Default Filters
// ============================================================================

export const defaultFilters: SearchFiltersState = {
  tagSlugs: [],
  dateFrom: '',
  dateTo: '',
  minSimilarity: 0,
};

// ============================================================================
// Component
// ============================================================================

export function SearchFilters({
  filters,
  onFiltersChange,
  className,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Cargar tags disponibles
  useEffect(() => {
    async function loadTags() {
      setIsLoadingTags(true);
      try {
        const result = await actions.tags.list({});
        if (!result.error && result.data) {
          setTags(result.data);
        }
      } catch (err) {
        console.error('Error loading tags:', err);
      } finally {
        setIsLoadingTags(false);
      }
    }
    loadTags();
  }, []);

  // Contar filtros activos
  const activeFiltersCount =
    filters.tagSlugs.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.minSimilarity > 0 ? 1 : 0);

  // Toggle un tag
  const toggleTag = (slug: string) => {
    const newTagSlugs = filters.tagSlugs.includes(slug)
      ? filters.tagSlugs.filter((s) => s !== slug)
      : [...filters.tagSlugs, slug];
    onFiltersChange({ ...filters, tagSlugs: newTagSlugs });
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  // Update individual filter
  const updateFilter = <K extends keyof SearchFiltersState>(
    key: K,
    value: SearchFiltersState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Get active filter chips for display
  const getActiveFilterChips = () => {
    const chips: { label: string; onRemove: () => void }[] = [];

    // Tags
    filters.tagSlugs.forEach((slug) => {
      const tag = tags.find((t) => t.slug === slug);
      if (tag) {
        chips.push({
          label: tag.name,
          onRemove: () => toggleTag(slug),
        });
      }
    });

    // Date range
    if (filters.dateFrom) {
      chips.push({
        label: `Desde: ${new Date(filters.dateFrom).toLocaleDateString('es')}`,
        onRemove: () => updateFilter('dateFrom', ''),
      });
    }
    if (filters.dateTo) {
      chips.push({
        label: `Hasta: ${new Date(filters.dateTo).toLocaleDateString('es')}`,
        onRemove: () => updateFilter('dateTo', ''),
      });
    }

    // Similarity
    if (filters.minSimilarity > 0) {
      chips.push({
        label: `≥${Math.round(filters.minSimilarity * 100)}% similitud`,
        onRemove: () => updateFilter('minSimilarity', 0),
      });
    }

    return chips;
  };

  const activeChips = getActiveFilterChips();

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Filter Popover Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activeFiltersCount > 0 ? 'default' : 'outline'}
            size='sm'
            className='gap-2 h-8'
          >
            <SlidersHorizontal className='w-3.5 h-3.5' />
            Filtros
            {activeFiltersCount > 0 && (
              <span className='ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary-foreground text-primary'>
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align='start' className='w-80 p-0' sideOffset={8}>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-primary' />
              <span className='font-semibold text-sm'>Filtros de búsqueda</span>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className='text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className='p-4 space-y-5'>
            {/* Tags Section */}
            <div>
              <div className='flex items-center gap-2 mb-3'>
                <Tag className='w-4 h-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Categorías</span>
              </div>
              {isLoadingTags ? (
                <div className='text-sm text-muted-foreground py-2'>
                  Cargando...
                </div>
              ) : tags.length === 0 ? (
                <div className='text-sm text-muted-foreground py-2'>
                  No hay categorías disponibles
                </div>
              ) : (
                <div className='flex flex-wrap gap-1.5'>
                  {tags.map((tag) => {
                    const isSelected = filters.tagSlugs.includes(tag.slug);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.slug)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                          'border',
                          isSelected
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-border bg-background hover:bg-muted text-foreground',
                        )}
                        style={{
                          backgroundColor: isSelected
                            ? tag.color || 'hsl(var(--primary))'
                            : undefined,
                        }}
                      >
                        {isSelected && <Check className='w-3 h-3' />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date Range Section */}
            <div>
              <div className='flex items-center gap-2 mb-3'>
                <Calendar className='w-4 h-4 text-muted-foreground' />
                <span className='text-sm font-medium'>Rango de fechas</span>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Desde
                  </label>
                  <input
                    type='date'
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className='w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
                  />
                </div>
                <div>
                  <label className='text-xs text-muted-foreground mb-1 block'>
                    Hasta
                  </label>
                  <input
                    type='date'
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className='w-full px-2.5 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
                  />
                </div>
              </div>
            </div>

            {/* Similarity Section */}
            <div>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Sparkles className='w-4 h-4 text-muted-foreground' />
                  <span className='text-sm font-medium'>Similitud mínima</span>
                </div>
                <span className='text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground'>
                  {Math.round(filters.minSimilarity * 100)}%
                </span>
              </div>
              <div className='px-1'>
                <input
                  type='range'
                  min='0'
                  max='1'
                  step='0.05'
                  value={filters.minSimilarity}
                  onChange={(e) =>
                    updateFilter('minSimilarity', parseFloat(e.target.value))
                  }
                  className='w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary'
                />
                <div className='flex justify-between text-[10px] text-muted-foreground mt-1.5'>
                  <span>Cualquiera</span>
                  <span>50%</span>
                  <span>Exacto</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='px-4 py-3 border-t border-border bg-muted/30'>
            <Button
              size='sm'
              className='w-full'
              onClick={() => setIsOpen(false)}
            >
              Aplicar filtros
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <>
          <div className='h-4 w-px bg-border' />
          {activeChips.map((chip, index) => (
            <span
              key={index}
              className='inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground'
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className='ml-0.5 p-0.5 rounded-full hover:bg-background/80 transition-colors'
              >
                <X className='w-3 h-3' />
              </button>
            </span>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={clearFilters}
              className='text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline'
            >
              Limpiar
            </button>
          )}
        </>
      )}
    </div>
  );
}
