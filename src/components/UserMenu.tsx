/**
 * Componente UserMenu
 *
 * Dropdown con información del usuario y opciones de sesión.
 * Muestra avatar, nombre y botón de cerrar sesión.
 */

import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

export function UserMenu() {
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  // Mientras carga la sesión
  if (isPending) {
    return <div className='w-8 h-8 rounded-full bg-muted animate-pulse' />;
  }

  // Si no hay sesión, mostrar botón de login
  if (!session?.user) {
    return (
      <Button variant='outline' size='sm' asChild>
        <a href='/login'>Iniciar Sesión</a>
      </Button>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary'>
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'Usuario'}
              className='w-8 h-8 rounded-full object-cover'
            />
          ) : (
            <div className='w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium'>
              {initials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className='font-medium'>{user.name || 'Usuario'}</span>
            <span className='text-xs text-muted-foreground'>{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href='/profile' className='cursor-pointer'>
            <User className='w-4 h-4 mr-2' />
            Mi Perfil
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className='cursor-pointer text-destructive focus:text-destructive'
        >
          <LogOut className='w-4 h-4 mr-2' />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
