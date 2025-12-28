import { Skeleton } from './ui/skeleton';

function PostItemSkeleton() {
    return (
        <div className="flex items-start gap-4 py-5 px-4 -mx-4">
            <div className="flex-1 min-w-0 space-y-3">
                {/* Title skeleton */}
                <Skeleton className="h-5 w-3/4" />

                {/* Excerpt skeleton - two lines */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                </div>

                {/* Metadata skeleton */}
                <div className="flex items-center gap-3 pt-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                </div>
            </div>

            {/* Arrow placeholder */}
            <Skeleton className="shrink-0 h-5 w-5 rounded-full mt-1.5" />
        </div>
    );
}

export { PostItemSkeleton };
