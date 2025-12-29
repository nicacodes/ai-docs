import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostItemProps {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    createdAt: Date;
    className?: string;
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

function formatRelativeDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return formatDate(date);
}

function estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function PostItem({
    title,
    slug,
    excerpt,
    createdAt,
    className,
}: PostItemProps) {
    return (
        <a
            href={`/post/${slug}`}
            className={cn(
                'group flex items-start gap-4 py-5 px-4 -mx-4 rounded-xl',
                'transition-all duration-200 ease-out',
                'hover:bg-muted/50 dark:hover:bg-muted/30',
                className
            )}
        >
            <div className="flex-1 min-w-0 space-y-1.5">
                {/* Title */}
                <h3 className={cn(
                    'font-semibold text-base sm:text-lg leading-snug',
                    'text-foreground group-hover:text-primary',
                    'transition-colors duration-200',
                    'line-clamp-1'
                )}>
                    {title}
                </h3>

                {/* Excerpt */}
                <p className={cn(
                    'text-sm text-muted-foreground leading-relaxed',
                    'line-clamp-2'
                )}>
                    {excerpt}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                        <Calendar size={12} className="shrink-0" />
                        <span>{formatRelativeDate(createdAt)}</span>
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                        <Clock size={12} className="shrink-0" />
                        <span>{estimateReadTime(excerpt)} min</span>
                    </span>
                </div>
            </div>

            {/* Arrow indicator */}
            <div className={cn(
                'shrink-0 mt-1.5',
                'text-muted-foreground/40 group-hover:text-primary',
                'transition-all duration-200',
                'group-hover:translate-x-1'
            )}>
                <ChevronRight size={18} />
            </div>
        </a>
    );
}

export { PostItem };
export type { PostItemProps };
