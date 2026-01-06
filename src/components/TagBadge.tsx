/**
 * TagBadge - Componente para mostrar un tag como badge
 */

import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  slug: string;
  color?: string | null;
  size?: 'sm' | 'md';
  clickable?: boolean;
  className?: string;
}

export function TagBadge({
  name,
  slug,
  color = '#6366f1',
  size = 'sm',
  clickable = true,
  className,
}: TagBadgeProps) {
  const baseClasses = cn(
    'inline-flex items-center font-medium rounded-md transition-opacity',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
    clickable && 'hover:opacity-80',
    className,
  );

  const style = {
    backgroundColor: `${color}20`,
    color: color || '#6366f1',
    borderColor: `${color}40`,
  };

  if (clickable) {
    return (
      <a
        href={`/tag/${slug}`}
        className={cn(baseClasses, 'border')}
        style={style}
      >
        {name}
      </a>
    );
  }

  return (
    <span className={cn(baseClasses, 'border')} style={style}>
      {name}
    </span>
  );
}

interface TagListProps {
  tags: Array<{
    name: string;
    slug: string;
    color?: string | null;
  }>;
  size?: 'sm' | 'md';
  clickable?: boolean;
  className?: string;
}

export function TagList({
  tags,
  size = 'sm',
  clickable = true,
  className,
}: TagListProps) {
  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.slug}
          name={tag.name}
          slug={tag.slug}
          color={tag.color}
          size={size}
          clickable={clickable}
        />
      ))}
    </div>
  );
}
