import { Calendar, Clock } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from './ui/card';
import { cn } from '@/lib/utils';

interface PostCardProps {
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

function estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function PostCard({
    title,
    slug,
    excerpt,
    createdAt,
    className,
}: PostCardProps) {
    return (
        <a href={`/post/${slug}`} className="block group">
            <Card
                className={cn(
                    'h-full transition-all duration-300 ease-out',
                    'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
                    'hover:border-border/80 hover:-translate-y-1',
                    'bg-card/80 backdrop-blur-sm',
                    className,
                )}
            >
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                    <CardDescription className="line-clamp-3 leading-relaxed">
                        {excerpt}
                    </CardDescription>
                </CardContent>
                <CardFooter className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            {formatDate(createdAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {estimateReadTime(excerpt)} min lectura
                        </span>
                    </div>
                </CardFooter>
            </Card>
        </a>
    );
}

export { PostCard };
export type { PostCardProps };
