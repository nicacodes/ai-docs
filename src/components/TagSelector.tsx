/**
 * TagSelector - Componente para seleccionar/crear tags
 *
 * Permite buscar tags existentes o crear nuevos sobre la marcha.
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

interface TagSelectorProps {
  documentId?: string;
  initialTags?: Tag[];
  onChange?: (tags: Tag[]) => void;
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

export default function TagSelector({
  documentId,
  initialTags = [],
  onChange,
  className,
}: TagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar tags del documento al montar
  useEffect(() => {
    async function loadDocumentTags() {
      if (!documentId) return;
      try {
        const result = await actions.tags.getForDocument({ documentId });
        if (!result.error && result.data) {
          setSelectedTags(result.data as Tag[]);
        }
      } catch {
        // Ignore
      }
    }
    if (initialTags.length === 0) {
      loadDocumentTags();
    }
  }, [documentId]);

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
            (tag) => !selectedTags.some((t) => t.id === tag.id),
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
    async (tag: Tag) => {
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      setInputValue('');
      setSuggestions([]);
      setHighlightedIndex(0);
      onChange?.(newTags);

      // Guardar en DB si hay documentId
      if (documentId) {
        try {
          await actions.tags.setForDocument({
            documentId,
            tags: newTags.map((t) => t.name),
          });
        } catch {
          // Rollback en caso de error
          setSelectedTags(selectedTags);
        }
      }
    },
    [selectedTags, documentId, onChange],
  );

  const handleCreateTag = useCallback(async () => {
    const name = inputValue.trim();
    if (!name) return;

    // Verificar que no existe ya
    if (selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setInputValue('');
      return;
    }

    try {
      const result = await actions.tags.create({
        name,
        color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
      });

      if (!result.error && result.data) {
        await handleAddTag(result.data as Tag);
      }
    } catch {
      // Si falla porque ya existe, intentar buscarlo
      const searchResult = await actions.tags.search({ query: name, limit: 1 });
      if (!searchResult.error && searchResult.data?.[0]) {
        await handleAddTag(searchResult.data[0] as Tag);
      }
    }
  }, [inputValue, selectedTags, handleAddTag]);

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      const newTags = selectedTags.filter((t) => t.id !== tagId);
      setSelectedTags(newTags);
      onChange?.(newTags);

      if (documentId) {
        try {
          await actions.tags.setForDocument({
            documentId,
            tags: newTags.map((t) => t.name),
          });
        } catch {
          // Rollback
          setSelectedTags(selectedTags);
        }
      }
    },
    [selectedTags, documentId, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && highlightedIndex < suggestions.length) {
        handleAddTag(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        handleCreateTag();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    } else if (
      e.key === 'Backspace' &&
      !inputValue &&
      selectedTags.length > 0
    ) {
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  const showCreateOption =
    inputValue.trim() &&
    !suggestions.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase(),
    ) &&
    !selectedTags.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase(),
    );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input con tags seleccionados */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background min-h-10',
          'focus-within:ring-2 focus-within:ring-ring/40 transition-shadow',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white'
            style={{ backgroundColor: tag.color || '#6366f1' }}
          >
            {tag.name}
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              className='hover:bg-white/20 rounded p-0.5 transition-colors'
            >
              <X className='w-3 h-3' />
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
          placeholder={selectedTags.length === 0 ? 'Agregar etiquetas...' : ''}
          className='flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
        />
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && (inputValue || suggestions.length > 0) && (
        <div className='absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50'>
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
                  onClick={() => handleAddTag(tag)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    index === highlightedIndex
                      ? 'bg-accent'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <span
                    className='w-3 h-3 rounded-full shrink-0'
                    style={{ backgroundColor: tag.color || '#6366f1' }}
                  />
                  <span>{tag.name}</span>
                  {index === highlightedIndex && (
                    <Check className='w-4 h-4 ml-auto text-primary' />
                  )}
                </button>
              ))}

              {showCreateOption && (
                <button
                  type='button'
                  onClick={handleCreateTag}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors border-t border-border',
                    suggestions.length === 0 ||
                      highlightedIndex >= suggestions.length
                      ? 'bg-accent'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <Plus className='w-4 h-4 text-primary' />
                  <span>
                    Crear "<strong>{inputValue.trim()}</strong>"
                  </span>
                </button>
              )}

              {!loading && suggestions.length === 0 && !showCreateOption && (
                <div className='px-3 py-2 text-sm text-muted-foreground'>
                  Escribe para buscar o crear tags
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
