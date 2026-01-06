import { useState, useCallback, useEffect } from 'react';
import { actions } from 'astro:actions';
import { FileText, RefreshCw } from 'lucide-react';
import { PostItem, type PostItemProps } from './PostItem';
import { PostItemSkeleton } from './PostItemSkeleton';
import { TagFilter } from './TagFilter';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type Post = Omit<PostItemProps, 'className'>;

interface PostListProps {
  initialPosts?: Post[];
  showTagFilter?: boolean;
  className?: string;
}

function PostList({
  initialPosts = [],
  showTagFilter = true,
  className,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(initialPosts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const fetchPosts = useCallback(async (tagSlug?: string | null) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await actions.documents.list({
        limit: 20,
        offset: 0,
        tagSlug: tagSlug || undefined,
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
    } catch {
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

  // Cuando cambia el tag seleccionado, refetch
  const handleTagSelect = useCallback(
    (tagSlug: string | null) => {
      setSelectedTag(tagSlug);
      fetchPosts(tagSlug);
    },
    [fetchPosts],
  );

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-center'>
        <div className='text-destructive mb-4'>{error}</div>
        <Button variant='outline' onClick={() => fetchPosts(selectedTag)}>
          <RefreshCw size={16} />
          Reintentar
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {showTagFilter && (
          <div className='flex gap-2 overflow-x-auto py-2'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='h-7 w-20 rounded-full bg-muted animate-pulse shrink-0'
              />
            ))}
          </div>
        )}
        <div className={cn('divide-y divide-border/50', className)}>
          {[...Array(5)].map((_, i) => (
            <PostItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !selectedTag) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-center'>
        <div className='size-16 rounded-full bg-muted flex items-center justify-center mb-4'>
          <FileText size={32} className='text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold mb-2'>No hay posts aún</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          Crea tu primer post y comienza a compartir tus ideas con el mundo.
        </p>
        <Button asChild>
          <a href='/editor'>Crear mi primer post</a>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {showTagFilter && (
        <TagFilter selectedTag={selectedTag} onTagSelect={handleTagSelect} />
      )}
      {posts.length === 0 && selectedTag ? (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='size-16 rounded-full bg-muted flex items-center justify-center mb-4'>
            <FileText size={32} className='text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold mb-2'>
            No hay posts con esta etiqueta
          </h3>
          <p className='text-muted-foreground mb-4'>
            Prueba con otra etiqueta o ve todos los posts.
          </p>
          <Button variant='outline' onClick={() => handleTagSelect(null)}>
            Ver todos los posts
          </Button>
        </div>
      ) : (
        <div className={cn('divide-y divide-border/50', className)}>
          {posts.map((post) => (
            <PostItem key={post.id} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}

export { PostList };
