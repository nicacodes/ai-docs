/**
 * ProposalEditor - Header para el editor de propuestas
 *
 * Muestra controles diferentes según si el usuario es el autor o no:
 * - Autor: Botón "Guardar" (edición directa)
 * - No autor: Botón "Proponer Cambios" + mensaje informativo
 */

import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { Send, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { actions } from 'astro:actions';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { cn } from '@/lib/utils';
import { editorInstance, $currentTitle } from '@/store/editor-store';

interface ProposalEditorProps {
  documentId: string;
  slug: string;
  initialTitle: string;
  initialMarkdown: string;
  isAuthor: boolean;
  authorName: string;
}

export function ProposalEditor({
  documentId,
  slug,
  initialTitle,
  initialMarkdown,
  isAuthor,
  authorName,
}: ProposalEditorProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const currentTitle = useStore($currentTitle);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Guardar directamente (para el autor)
  const handleDirectSave = useCallback(async () => {
    const crepe = editorInstance.get();
    if (!crepe) return;

    setIsSaving(true);
    setStatus('idle');

    try {
      const rawMarkdown = await crepe.getMarkdown();
      const title = currentTitle || initialTitle;

      const { error } = await actions.documents.save({
        id: documentId,
        title,
        rawMarkdown,
        metadata: {},
      });

      if (error) {
        setStatus('error');
        setStatusMessage('Error al guardar');
        return;
      }

      setStatus('success');
      setStatusMessage('Guardado correctamente');

      setTimeout(() => {
        window.location.href = `/post/${slug}`;
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage('Error inesperado');
    } finally {
      setIsSaving(false);
    }
  }, [documentId, slug, currentTitle, initialTitle]);

  // Enviar propuesta de cambios
  const handleSubmitProposal = useCallback(async () => {
    const crepe = editorInstance.get();
    if (!crepe) return;

    setIsSaving(true);
    setStatus('idle');

    try {
      const rawMarkdown = await crepe.getMarkdown();
      const title = currentTitle || initialTitle;

      // Verificar que hay cambios
      if (rawMarkdown === initialMarkdown && title === initialTitle) {
        setStatus('error');
        setStatusMessage('No hay cambios para proponer');
        setIsSaving(false);
        return;
      }

      const { data, error } = await actions.proposals.create({
        documentId,
        proposedTitle: title,
        proposedMarkdown: rawMarkdown,
        message: message || undefined,
      });

      if (error) {
        setStatus('error');
        setStatusMessage(error.message || 'Error al enviar propuesta');
        return;
      }

      setStatus('success');
      setStatusMessage('Propuesta enviada correctamente');
      setShowMessageInput(false);

      setTimeout(() => {
        window.location.href = `/proposals/${data.id}`;
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage('Error inesperado');
    } finally {
      setIsSaving(false);
    }
  }, [documentId, currentTitle, initialTitle, initialMarkdown, message]);

  return (
    <>
      {/* Banner informativo para no-autores */}
      {!isAuthor && (
        <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-blue-500 shrink-0 mt-0.5' />
          <div className='text-sm'>
            <p className='font-medium text-blue-500'>Modo propuesta</p>
            <p className='text-muted-foreground'>
              Este documento pertenece a <strong>{authorName}</strong>. Tus
              cambios se enviarán como propuesta para su aprobación.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
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
            {isSaving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.5 },
                  rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                }}
                className='absolute -inset-[150%] z-0'
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 40%, #06b6d4 80%, #a855f7 90%, #ec4899 100%)',
                }}
              />
            )}
          </AnimatePresence>

          <div
            className={cn(
              'relative z-10 flex items-center justify-between w-full h-11 px-3 transition-all duration-300 ease-out',
              !isSaving && 'border border-border/40',
              isScrolled
                ? 'bg-background/60 backdrop-blur-2xl shadow-lg shadow-black/5 border-white/10 rounded-none'
                : 'bg-background/95 backdrop-blur-xl rounded-xl',
            )}
          >
            {/* Left: Back + Title */}
            <div className='flex items-center gap-3 z-20'>
              <Button
                asChild
                variant='ghost'
                size='icon-sm'
                className='text-muted-foreground hover:text-foreground shrink-0'
              >
                <a href={`/post/${slug}`}>
                  <ArrowLeft size={20} />
                </a>
              </Button>

              <div className='h-4 w-px bg-border/60 shrink-0' />

              <span className='text-sm font-medium truncate max-w-50'>
                {currentTitle || initialTitle}
              </span>
            </div>

            {/* Center: Status message */}
            <AnimatePresence mode='wait'>
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium',
                    status === 'success' && 'text-green-500',
                    status === 'error' && 'text-destructive',
                  )}
                >
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right: Actions */}
            <div className='flex items-center gap-2 z-20'>
              <ModeToggle />

              {isAuthor ? (
                // Autor: Guardar directamente
                <Button
                  onClick={handleDirectSave}
                  disabled={isSaving}
                  size='sm'
                  className='gap-2'
                >
                  <Save size={16} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              ) : (
                // No autor: Proponer cambios
                <>
                  {showMessageInput ? (
                    <div className='flex items-center gap-2'>
                      <input
                        type='text'
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder='Describe tus cambios (opcional)'
                        className='h-8 px-3 text-sm rounded-md border border-input bg-background w-48'
                      />
                      <Button
                        onClick={handleSubmitProposal}
                        disabled={isSaving}
                        size='sm'
                        className='gap-2'
                      >
                        <Send size={16} />
                        {isSaving ? 'Enviando...' : 'Enviar'}
                      </Button>
                      <Button
                        onClick={() => setShowMessageInput(false)}
                        variant='ghost'
                        size='sm'
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowMessageInput(true)}
                      size='sm'
                      className='gap-2'
                    >
                      <Send size={16} />
                      Proponer Cambios
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
