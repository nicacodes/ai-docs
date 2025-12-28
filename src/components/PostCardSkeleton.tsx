import { Skeleton } from './ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';

interface PostCardSkeletonProps {
    className?: string;
}

function PostCardSkeleton({ className }: PostCardSkeletonProps) {
    return (
        <Card className={cn('h-full bg-card/80 backdrop-blur-sm', className)}>
            <CardHeader className="pb-3">
                {/* Title skeleton */}
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="pb-3">
                {/* Excerpt skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                {/* Meta skeleton */}
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </CardFooter>
        </Card>
    );
}

export { PostCardSkeleton };
