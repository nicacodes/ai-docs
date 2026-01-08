/**
 * SearchHeader - Header específico para la página de búsqueda
 *
 * Combina la barra de búsqueda con los filtros en un solo componente.
 * Comunica los filtros al SearchResults via nanostores.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { actions } from 'astro:actions';
import {
  Search,
  HomeIcon,
  X,
  Sparkles,
  SlidersHorizontal,
  Filter,
  Tag,
  Calendar,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModeToggle } from './ui/mode-toggle';
import { UserMenu } from './UserMenu';
import NotificationBell from './NotificationBell';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  $isSearching,
  $searchFilters,
  setSearchFilters,
  type SearchFiltersState,
  defaultFilters,
} from '@/store/search-store';

interface TagOption {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface SearchHeaderProps {
  initialQuery?: string;
  className?: string;
}

export function SearchHeader({
  initialQuery = '',
  className,
}: SearchHeaderProps) {
  const isSearching = useStore($isSearching);
  const filters = useStore($searchFilters);
  const [isMounted, setIsMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load tags
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(
        searchValue.trim(),
      )}`;
    }
  };

  const handleSearchClear = () => {
    setSearchValue('');
    window.location.href = '/';
  };

  // Filter functions
  const activeFiltersCount =
    filters.tagSlugs.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.minSimilarity > 0 ? 1 : 0);

  const toggleTag = useCallback((slug: string) => {
    const currentFilters = $searchFilters.get();
    const newTagSlugs = currentFilters.tagSlugs.includes(slug)
      ? currentFilters.tagSlugs.filter((s) => s !== slug)
      : [...currentFilters.tagSlugs, slug];
    setSearchFilters({ ...currentFilters, tagSlugs: newTagSlugs });
  }, []);

  const updateFilter = useCallback(
    <K extends keyof SearchFiltersState>(
      key: K,
      value: SearchFiltersState[K],
    ) => {
      const currentFilters = $searchFilters.get();
      setSearchFilters({ ...currentFilters, [key]: value });
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setSearchFilters(defaultFilters);
  }, []);

  // Get active filter chips
  const getActiveFilterChips = useCallback(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    filters.tagSlugs.forEach((slug) => {
      const tag = tags.find((t) => t.slug === slug);
      if (tag) {
        chips.push({
          label: tag.name,
          onRemove: () => toggleTag(slug),
        });
      }
    });

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

    if (filters.minSimilarity > 0) {
      chips.push({
        label: `≥${Math.round(filters.minSimilarity * 100)}%`,
        onRemove: () => updateFilter('minSimilarity', 0),
      });
    }

    return chips;
  }, [filters, tags, toggleTag, updateFilter]);

  const activeChips = getActiveFilterChips();

  return (
    <div
      className={cn(
        'w-full flex justify-center sticky z-20 pointer-events-none transition-all duration-300 ease-out',
        isScrolled ? 'top-0' : 'top-4',
        className,
      )}
    >
      <div
        className={cn(
          'relative p-px pointer-events-auto shadow-sm w-full transition-all duration-300 ease-out',
          isScrolled ? 'max-w-full rounded-none' : 'max-w-5xl rounded-xl',
        )}
      >
        <div
          className={cn(
            'relative z-10 flex items-center justify-between w-full h-12 px-4 transition-all duration-300 ease-out',
            'border border-border/40',
            isScrolled
              ? 'bg-background/60 backdrop-blur-2xl shadow-lg shadow-black/5 dark:shadow-black/20 rounded-none'
              : 'bg-background/95 backdrop-blur-xl rounded-xl',
          )}
        >
          {/* Left section - Brand/Home */}
          <div className='flex items-center gap-3 z-20'>
            <a href='/' className='flex items-center gap-2.5 group'>
              <div className='size-8 rounded-lg bg-linear-to-br from-foreground/90 to-foreground/70 dark:from-foreground/80 dark:to-foreground/60 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow'>
                <HomeIcon
                  size={16}
                  className='text-background group-hover:scale-110 transition-transform'
                />
              </div>
              <span className='font-semibold text-base text-foreground hidden sm:block'>
                AI Docs
              </span>
            </a>
          </div>

          {/* Center section - Search + Filters */}
          <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md px-4 hidden sm:flex items-center gap-2'>
            {/* Search input */}
            <form onSubmit={handleSearchSubmit} className='flex-1'>
              <div className='relative rounded-lg p-px overflow-hidden'>
                <AnimatePresence>
                  {isMounted && isSearching && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.3 },
                        rotate: {
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        },
                      }}
                      className='absolute -inset-25 z-0 pointer-events-none'
                      style={{
                        background:
                          'conic-gradient(from 0deg, transparent 30%, #06b6d4 60%, #a855f7 80%, #ec4899 100%)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <div
                  className={cn(
                    'relative z-10 flex items-center rounded-lg',
                    isMounted && isSearching ? 'bg-background' : 'bg-muted/40',
                    'transition-all duration-200',
                    !(isMounted && isSearching) && 'hover:bg-muted/50',
                  )}
                >
                  {isMounted && isSearching ? (
                    <Sparkles
                      className='absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-pulse'
                      size={15}
                    />
                  ) : (
                    <Search
                      className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70'
                      size={15}
                    />
                  )}
                  <input
                    ref={desktopInputRef}
                    type='text'
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder='Búsqueda semántica...'
                    autoFocus
                    className={cn(
                      'w-full h-8 pl-9 pr-8 rounded-lg bg-transparent',
                      'text-sm text-foreground placeholder:text-muted-foreground/60',
                      'focus:outline-none focus:ring-1 focus:ring-ring/40',
                      'transition-all duration-200',
                    )}
                  />
                  {searchValue && (
                    <button
                      type='button'
                      onClick={handleSearchClear}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors'
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Filters Popover */}
            <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={activeFiltersCount > 0 ? 'default' : 'ghost'}
                  size='icon-sm'
                  className='shrink-0'
                >
                  <SlidersHorizontal size={16} />
                  {activeFiltersCount > 0 && (
                    <span className='absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-primary-foreground text-primary flex items-center justify-center'>
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent align='end' className='w-80 p-0' sideOffset={8}>
                {/* Header */}
                <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
                  <div className='flex items-center gap-2'>
                    <Filter className='w-4 h-4 text-primary' />
                    <span className='font-semibold text-sm'>Filtros</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className='text-xs text-muted-foreground hover:text-foreground transition-colors'
                    >
                      Limpiar
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
                        No hay categorías
                      </div>
                    ) : (
                      <div className='flex flex-wrap gap-1.5'>
                        {tags.map((tag) => {
                          const isSelected = filters.tagSlugs.includes(
                            tag.slug,
                          );
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.slug)}
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all border',
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
                      <span className='text-sm font-medium'>
                        Rango de fechas
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <label className='text-xs text-muted-foreground mb-1 block'>
                          Desde
                        </label>
                        <input
                          type='date'
                          value={filters.dateFrom}
                          onChange={(e) =>
                            updateFilter('dateFrom', e.target.value)
                          }
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
                          onChange={(e) =>
                            updateFilter('dateTo', e.target.value)
                          }
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
                        <span className='text-sm font-medium'>
                          Similitud mínima
                        </span>
                      </div>
                      <span className='text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground'>
                        {Math.round(filters.minSimilarity * 100)}%
                      </span>
                    </div>
                    <input
                      type='range'
                      min='0'
                      max='1'
                      step='0.05'
                      value={filters.minSimilarity}
                      onChange={(e) =>
                        updateFilter(
                          'minSimilarity',
                          parseFloat(e.target.value),
                        )
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
              </PopoverContent>
            </Popover>
          </div>

          {/* Active filter chips - below search on desktop */}
          {activeChips.length > 0 && (
            <div className='absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 hidden sm:flex items-center gap-1.5 flex-wrap justify-center'>
              {activeChips.map((chip, index) => (
                <span
                  key={index}
                  className='inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-muted/80 backdrop-blur-sm text-muted-foreground border border-border/50'
                >
                  {chip.label}
                  <button
                    onClick={chip.onRemove}
                    className='p-0.5 rounded-full hover:bg-background/80 transition-colors'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Right section - Actions */}
          <div className='flex items-center gap-1.5 z-20'>
            {/* Mobile search button */}
            <Button
              variant='ghost'
              size='icon-sm'
              className='sm:hidden text-muted-foreground hover:text-foreground'
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={18} />
            </Button>

            <NotificationBell />
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 bg-background/95 backdrop-blur-xl sm:hidden'
          >
            <div className='p-4 space-y-4'>
              <form onSubmit={handleSearchSubmit}>
                <div className='relative overflow-hidden rounded-xl p-px'>
                  <AnimatePresence>
                    {isMounted && isSearching && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, rotate: 360 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          opacity: { duration: 0.3 },
                          rotate: {
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                          },
                        }}
                        className='absolute -inset-[200%] z-0'
                        style={{
                          background:
                            'conic-gradient(from 0deg, transparent 30%, #06b6d4 60%, #a855f7 80%, #ec4899 100%)',
                        }}
                      />
                    )}
                  </AnimatePresence>
                  <div
                    className={cn(
                      'relative z-10 flex items-center',
                      isMounted && isSearching
                        ? 'bg-background'
                        : 'bg-muted/50',
                      'border border-border/50 rounded-xl',
                    )}
                  >
                    {isMounted && isSearching ? (
                      <Sparkles
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-pulse'
                        size={18}
                      />
                    ) : (
                      <Search
                        className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                        size={18}
                      />
                    )}
                    <input
                      ref={searchInputRef}
                      type='text'
                      value={searchValue}
                      onChange={handleSearchChange}
                      placeholder='Búsqueda semántica...'
                      className={cn(
                        'w-full h-12 pl-10 pr-12 rounded-xl bg-transparent',
                        'text-base text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-ring/50',
                      )}
                    />
                    <button
                      type='button'
                      onClick={() => {
                        setIsSearchOpen(false);
                        handleSearchClear();
                      }}
                      className='absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors'
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </form>

              {/* Mobile filters */}
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant={activeFiltersCount > 0 ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className='gap-2'
                >
                  <SlidersHorizontal size={14} />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className='ml-1 w-5 h-5 text-[10px] font-bold rounded-full bg-primary-foreground text-primary flex items-center justify-center'>
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
