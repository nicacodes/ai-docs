/**
 * NewDocTagSelector - Selector de tags para documentos nuevos
 *
 * Versión simplificada del TagSelector que trabaja con un array de nombres de tags
 * en lugar de IDs de documentos. Los tags se guardan al momento de crear el documento.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { actions } from 'astro:actions';
import { cn } from '@/lib/utils';
import { X, Plus, Tag as TagIcon, Check } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface NewDocTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

// Colores predefinidos para nuevos tags
const TAG_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

function getRandomColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]!;
}

export function NewDocTagSelector({
  selectedTags,
  onChange,
  className,
}: NewDocTagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Buscar sugerencias cuando cambia el input
  useEffect(() => {
    async function searchTags() {
      if (inputValue.trim().length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const result = await actions.tags.search({
          query: inputValue.trim(),
          limit: 5,
        });
        if (!result.error && result.data) {
          // Filtrar tags ya seleccionados
          const filtered = (result.data as Tag[]).filter(
            (tag) => !selectedTags.includes(tag.name),
          );
          setSuggestions(filtered);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(searchTags, 200);
    return () => clearTimeout(timeoutId);
  }, [inputValue, selectedTags]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = useCallback(
    (tagName: string) => {
      if (!selectedTags.includes(tagName)) {
        onChange([...selectedTags, tagName]);
      }
      setInputValue('');
      setSuggestions([]);
      setHighlightedIndex(0);
    },
    [selectedTags, onChange],
  );

  const handleRemoveTag = useCallback(
    (tagName: string) => {
      onChange(selectedTags.filter((t) => t !== tagName));
    },
    [selectedTags, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalItems = suggestions.length + (inputValue.trim() ? 1 : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions.length > 0 && highlightedIndex < suggestions.length) {
            handleAddTag(suggestions[highlightedIndex]!.name);
          } else if (inputValue.trim()) {
            handleAddTag(inputValue.trim());
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setInputValue('');
          break;
        case 'Backspace':
          if (!inputValue && selectedTags.length > 0) {
            handleRemoveTag(selectedTags[selectedTags.length - 1]!);
          }
          break;
      }
    },
    [
      suggestions,
      inputValue,
      highlightedIndex,
      selectedTags,
      handleAddTag,
      handleRemoveTag,
    ],
  );

  const showDropdown = isOpen && (suggestions.length > 0 || inputValue.trim());

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input con tags seleccionados */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-input bg-background min-h-10',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tagName, index) => (
          <span
            key={tagName}
            className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border'
            style={{
              backgroundColor: `${TAG_COLORS[index % TAG_COLORS.length]}20`,
              color: TAG_COLORS[index % TAG_COLORS.length],
              borderColor: `${TAG_COLORS[index % TAG_COLORS.length]}40`,
            }}
          >
            {tagName}
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tagName);
              }}
              className='hover:opacity-70'
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedTags.length === 0 ? 'Buscar o crear etiquetas...' : ''
          }
          className='flex-1 min-w-24 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground'
        />
      </div>

      {/* Dropdown de sugerencias */}
      {showDropdown && (
        <div className='absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden'>
          {loading ? (
            <div className='px-3 py-2 text-sm text-muted-foreground'>
              Buscando...
            </div>
          ) : (
            <>
              {suggestions.map((tag, index) => (
                <button
                  key={tag.id}
                  type='button'
                  onClick={() => handleAddTag(tag.name)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    highlightedIndex === index
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <span
                    className='w-3 h-3 rounded-full shrink-0'
                    style={{ backgroundColor: tag.color || '#6366f1' }}
                  />
                  <span className='flex-1'>{tag.name}</span>
                  {selectedTags.includes(tag.name) && (
                    <Check size={14} className='text-primary' />
                  )}
                </button>
              ))}

              {/* Opción para crear nuevo tag */}
              {inputValue.trim() &&
                !suggestions.some(
                  (t) =>
                    t.name.toLowerCase() === inputValue.trim().toLowerCase(),
                ) &&
                !selectedTags.some(
                  (t) => t.toLowerCase() === inputValue.trim().toLowerCase(),
                ) && (
                  <button
                    type='button'
                    onClick={() => handleAddTag(inputValue.trim())}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors border-t border-border',
                      highlightedIndex === suggestions.length
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50',
                    )}
                  >
                    <Plus size={14} className='text-primary' />
                    <span>
                      Crear "<strong>{inputValue.trim()}</strong>"
                    </span>
                  </button>
                )}
            </>
          )}
        </div>
      )}

      {/* Hint */}
      <p className='mt-1.5 text-xs text-muted-foreground'>
        Escribe para buscar o crear nuevas etiquetas. Las etiquetas se guardarán
        con el documento.
      </p>
    </div>
  );
}
