/**
 * SearchAutocomplete - Autocompletado de búsqueda
 *
 * Muestra sugerencias mientras el usuario escribe, basadas en títulos existentes.
 * Puede funcionar de forma autónoma (navegando via URL) o controlada (con callbacks).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { actions } from 'astro:actions';
import { Search, FileText, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

interface Suggestion {
  title: string;
  slug: string;
}

interface SearchAutocompleteProps {
  value?: string; // Initial/controlled value
  onChange?: (value: string) => void; // Optional controlled mode
  onSearch?: (query: string) => void; // Optional - defaults to URL navigation
  onNavigate?: (slug: string) => void; // Optional - defaults to window.location
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SearchAutocomplete({
  value: controlledValue,
  onChange: onChangeProp,
  onSearch: onSearchProp,
  onNavigate,
  placeholder = 'Buscar con IA...',
  className,
  autoFocus = false,
}: SearchAutocompleteProps) {
  // Internal state - initialized with controlledValue if provided
  const [internalValue, setInternalValue] = useState(controlledValue || '');

  // Only use controlled mode if BOTH value and onChange are provided
  const isControlled =
    controlledValue !== undefined && onChangeProp !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const onChange = useCallback(
    (newValue: string) => {
      if (isControlled && onChangeProp) {
        onChangeProp(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [isControlled, onChangeProp],
  );

  const onSearch = useCallback(
    (query: string) => {
      if (onSearchProp) {
        onSearchProp(query);
      } else {
        // Default: navigate to search page
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    },
    [onSearchProp],
  );

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Combined loading state (debouncing OR fetching)
  const showSkeleton = isDebouncing || isLoading;

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await actions.documents.getSuggestions({
        query,
        limit: 5,
      });
      if (!result.error && result.data) {
        setSuggestions(result.data);
        setIsOpen(result.data.length > 0);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Show skeleton immediately when typing (if query is long enough)
    if (value.trim().length >= 2) {
      setIsDebouncing(true);
      setIsOpen(true);
    }

    debounceRef.current = setTimeout(() => {
      setIsDebouncing(false);
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== 'Enter') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          // Navigate to selected suggestion
          const suggestion = suggestions[selectedIndex];
          if (onNavigate) {
            onNavigate(suggestion.slug);
          } else {
            window.location.href = `/post/${suggestion.slug}`;
          }
        } else if (value.trim()) {
          // Perform search
          setIsOpen(false);
          onSearch(value.trim());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (onNavigate) {
      onNavigate(suggestion.slug);
    } else {
      window.location.href = `/post/${suggestion.slug}`;
    }
    setIsOpen(false);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (value.trim()) {
      setIsOpen(false);
      onSearch(value.trim());
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input container */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() =>
            value.length >= 2 && suggestions.length > 0 && setIsOpen(true)
          }
          placeholder={placeholder}
          autoFocus={autoFocus}
          className='w-full pl-10 pr-20 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all'
        />
        <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1'>
          {isLoading && (
            <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
          )}
          <button
            onClick={handleSearchClick}
            disabled={!value.trim()}
            className='px-2 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (showSkeleton || suggestions.length > 0) && (
        <div className='absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg'>
          <div className='px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border flex items-center gap-2'>
            {showSkeleton && <Loader2 className='w-3 h-3 animate-spin' />}
            {showSkeleton ? 'Buscando...' : 'Ir a documento'}
          </div>

          {/* Skeleton loading state */}
          {showSkeleton && (
            <div className='p-2 space-y-2'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='flex items-center gap-3 px-1'>
                  <Skeleton className='w-4 h-4 rounded' />
                  <Skeleton className='h-4 flex-1' />
                  <Skeleton className='w-3 h-3 rounded' />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!showSkeleton &&
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.slug}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
                  selectedIndex === index && 'bg-muted',
                )}
              >
                <FileText className='w-4 h-4 text-muted-foreground shrink-0' />
                <span className='flex-1 truncate text-sm'>
                  {suggestion.title}
                </span>
                <ArrowRight className='w-3 h-3 text-muted-foreground shrink-0' />
              </button>
            ))}

          {/* No results message */}
          {!showSkeleton &&
            suggestions.length === 0 &&
            value.trim().length >= 2 && (
              <div className='px-3 py-3 text-sm text-muted-foreground text-center'>
                No se encontraron documentos
              </div>
            )}

          <div className='px-3 py-1.5 text-xs text-muted-foreground border-t border-border'>
            <kbd className='px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded'>
              Enter
            </kbd>{' '}
            para buscar semánticamente
          </div>
        </div>
      )}
    </div>
  );
}
