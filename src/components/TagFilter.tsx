/**
 * TagFilter - Componente para filtrar posts por etiquetas
 *
 * Muestra una barra horizontal de tags que permite filtrar el contenido.
 */

import { useState, useEffect, useCallback } from 'react';
import { actions } from 'astro:actions';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  documentCount: number;
}

interface TagFilterProps {
  selectedTag?: string | null;
  onTagSelect?: (tagSlug: string | null) => void;
  className?: string;
}

export function TagFilter({
  selectedTag = null,
  onTagSelect,
  className,
}: TagFilterProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTags() {
      try {
        const result = await actions.tags.list({ withCount: true });
        if (!result.error && result.data) {
          // Ordenar por cantidad de documentos
          const sortedTags = (result.data as unknown as TagWithCount[])
            .filter((t) => t.documentCount > 0)
            .sort((a, b) => b.documentCount - a.documentCount);
          setTags(sortedTags);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadTags();
  }, []);

  const handleSelect = useCallback(
    (tagSlug: string | null) => {
      onTagSelect?.(tagSlug);
    },
    [onTagSelect],
  );

  if (loading) {
    return (
      <div
        className={cn(
          'flex gap-2 overflow-x-auto py-2 scrollbar-hide',
          className,
        )}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className='h-7 w-20 rounded-full bg-muted animate-pulse shrink-0'
          />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide',
        className,
      )}
    >
      <Tag size={14} className='text-muted-foreground shrink-0' />

      {/* All posts button */}
      <button
        onClick={() => handleSelect(null)}
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
          selectedTag === null
            ? 'bg-foreground text-background shadow-sm'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        Todos
      </button>

      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => handleSelect(tag.slug)}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            selectedTag === tag.slug ? 'shadow-sm' : 'hover:opacity-80',
          )}
          style={{
            backgroundColor:
              selectedTag === tag.slug
                ? tag.color || '#6366f1'
                : `${tag.color || '#6366f1'}20`,
            color: selectedTag === tag.slug ? '#fff' : tag.color || '#6366f1',
          }}
        >
          {tag.name}
          <span className='opacity-60'>({tag.documentCount})</span>
        </button>
      ))}

      {/* Clear filter button when a tag is selected */}
      {selectedTag && (
        <button
          onClick={() => handleSelect(null)}
          className='shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors'
          title='Limpiar filtro'
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
