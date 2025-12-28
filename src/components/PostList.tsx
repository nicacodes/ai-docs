import { useState, useCallback, useEffect } from 'react';
import { actions } from 'astro:actions';
import { FileText, RefreshCw } from 'lucide-react';
import { PostItem, type PostItemProps } from './PostItem';
import { PostItemSkeleton } from './PostItemSkeleton';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type Post = Omit<PostItemProps, 'className'>;

interface PostListProps {
    initialPosts?: Post[];
    className?: string;
}

function PostList({ initialPosts = [], className }: PostListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [isLoading, setIsLoading] = useState(initialPosts.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchPosts = useCallback(async (search?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await actions.documents.list({
                limit: 20,
                offset: 0,
                search: search || undefined,
            });

            if (result.error) {
                setError(result.error.message || 'Error al cargar los posts');
                return;
            }

            setPosts(
                result.data.map((post) => ({
                    id: post.id,
                    title: post.title,
                    slug: post.slug,
                    excerpt: post.excerpt,
                    createdAt: new Date(post.createdAt!),
                })),
            );
        } catch (e) {
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialPosts.length === 0) {
            fetchPosts();
        }
    }, [fetchPosts, initialPosts.length]);

    const handleSearch = useCallback(
        (query: string) => {
            setSearchQuery(query);
            fetchPosts(query);
        },
        [fetchPosts],
    );

    // Expose search handler to parent via custom event
    useEffect(() => {
        const handler = (e: CustomEvent<string>) => handleSearch(e.detail);
        window.addEventListener('blog:search' as any, handler);
        return () => window.removeEventListener('blog:search' as any, handler);
    }, [handleSearch]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-destructive mb-4">{error}</div>
                <Button variant="outline" onClick={() => fetchPosts(searchQuery)}>
                    <RefreshCw size={16} />
                    Reintentar
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={cn('divide-y divide-border/50', className)}>
                {[...Array(5)].map((_, i) => (
                    <PostItemSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No hay posts aún</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    {searchQuery
                        ? `No se encontraron posts para "${searchQuery}"`
                        : 'Crea tu primer post y comienza a compartir tus ideas con el mundo.'}
                </p>
                {!searchQuery && (
                    <Button asChild>
                        <a href="/new">Crear mi primer post</a>
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={cn('divide-y divide-border/50', className)}>
            {posts.map((post) => (
                <PostItem key={post.id} {...post} />
            ))}
        </div>
    );
}

export { PostList };
