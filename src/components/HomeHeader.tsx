import { useEffect, useState } from 'react';
import { Search, FilePlus, HomeIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModeToggle } from './ui/mode-toggle';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
    onSearch?: (query: string) => void;
    isLoading?: boolean;
}

function HomeHeader({ onSearch, isLoading = false }: HomeHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(searchValue);
    };

    return (
        <div
            className={cn(
                'w-full flex justify-center sticky z-20 pointer-events-none transition-all duration-300 ease-out',
                isScrolled ? 'top-0' : 'top-4',
            )}
        >
            <div
                className={cn(
                    'relative overflow-hidden p-px pointer-events-auto shadow-sm w-full transition-all duration-300 ease-out',
                    isScrolled ? 'max-w-full rounded-none' : 'max-w-5xl rounded-xl',
                )}
            >
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, rotate: 360 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                opacity: { duration: 0.5 },
                                rotate: {
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: 'linear',
                                },
                            }}
                            className="absolute -inset-[150%] z-0"
                            style={{
                                background:
                                    'conic-gradient(from 0deg, transparent 40%, #06b6d4 80%, #a855f7 90%, #ec4899 100%)',
                            }}
                        />
                    )}
                </AnimatePresence>
                <div
                    className={cn(
                        'relative z-10 flex items-center justify-between w-full h-14 px-4 transition-all duration-300 ease-out',
                        !isLoading && 'border border-border/40',
                        isScrolled
                            ? 'bg-background/60 backdrop-blur-2xl shadow-lg shadow-black/5 border-white/10 rounded-none'
                            : 'bg-background/95 backdrop-blur-xl rounded-xl',
                    )}
                >
                    {/* Left section - Brand */}
                    <div className="flex items-center gap-3 z-20">
                        <a href="/" className="flex items-center gap-2 group">
                            <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-md">
                                <HomeIcon
                                    size={18}
                                    className="text-white group-hover:scale-110 transition-transform"
                                />
                            </div>
                            <span className="font-semibold text-lg text-foreground hidden sm:block">
                                AI Blog
                            </span>
                        </a>
                    </div>

                    {/* Center section - Search */}
                    <form
                        onSubmit={handleSearchSubmit}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md px-4 hidden sm:block"
                    >
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                size={16}
                            />
                            <input
                                type="text"
                                value={searchValue}
                                onChange={handleSearchChange}
                                placeholder="Buscar posts..."
                                className={cn(
                                    'w-full h-9 pl-9 pr-4 rounded-lg',
                                    'bg-muted/50 border border-border/50',
                                    'text-sm text-foreground placeholder:text-muted-foreground',
                                    'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-transparent',
                                    'transition-all duration-200',
                                    'hover:bg-muted/70',
                                )}
                            />
                        </div>
                    </form>

                    {/* Right section - Actions */}
                    <div className="flex items-center gap-2 z-20">
                        {/* Mobile search button */}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="sm:hidden text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                const query = prompt('Buscar posts:');
                                if (query) onSearch?.(query);
                            }}
                        >
                            <Search size={20} />
                        </Button>

                        <ModeToggle />

                        <Button asChild size="sm" className="gap-1.5">
                            <a href="/new">
                                <FilePlus size={16} />
                                <span className="hidden sm:inline">Nuevo Post</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { HomeHeader };
