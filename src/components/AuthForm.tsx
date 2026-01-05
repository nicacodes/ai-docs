/**
 * Componente de Login/Registro
 *
 * Formulario combinado para iniciar sesión o registrarse.
 * Usa Better Auth client para la autenticación.
 */

import { useState } from 'react';
import { signIn, signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

interface AuthFormProps {
  /** Redirigir a esta URL después de autenticarse */
  redirectTo?: string;
  /** Modo inicial del formulario */
  defaultMode?: 'login' | 'register';
}

export function AuthForm({
  redirectTo = '/',
  defaultMode = 'login',
}: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const result = await signUp.email({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        if (result.error) {
          setError(result.error.message || 'Error al registrarse');
          return;
        }
      } else {
        const result = await signIn.email({
          email: formData.email,
          password: formData.password,
        });

        if (result.error) {
          setError(result.error.message || 'Credenciales inválidas');
          return;
        }
      }

      // Redirigir después de autenticarse
      window.location.href = redirectTo;
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <div className='bg-card border border-border rounded-lg p-6 shadow-sm'>
        <h2 className='text-2xl font-semibold text-center mb-6'>
          {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {mode === 'register' && (
            <div>
              <label htmlFor='name' className='block text-sm font-medium mb-1'>
                Nombre
              </label>
              <input
                type='text'
                id='name'
                name='name'
                value={formData.name}
                onChange={handleInputChange}
                required
                className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='Tu nombre'
              />
            </div>
          )}

          <div>
            <label htmlFor='email' className='block text-sm font-medium mb-1'>
              Email
            </label>
            <input
              type='email'
              id='email'
              name='email'
              value={formData.email}
              onChange={handleInputChange}
              required
              className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='tu@email.com'
            />
          </div>

          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium mb-1'
            >
              Contraseña
            </label>
            <input
              type='password'
              id='password'
              name='password'
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={8}
              className='w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='Mínimo 8 caracteres'
            />
          </div>

          {error && (
            <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md'>
              <p className='text-sm text-destructive'>{error}</p>
            </div>
          )}

          <Button type='submit' className='w-full' disabled={isLoading}>
            {isLoading
              ? 'Cargando...'
              : mode === 'login'
              ? 'Iniciar Sesión'
              : 'Crear Cuenta'}
          </Button>
        </form>

        <div className='mt-4 text-center'>
          <button
            type='button'
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className='text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            {mode === 'login'
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
