/**
 * UnifiedEditorHeader - Header unificado para el editor
 *
 * Maneja tres modos:
 * - new: Crear nuevo documento (con draft en localStorage)
 * - edit: Editar documento propio
 * - propose: Proponer cambios a documento de otro usuario
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  FileJson,
  FilePlus,
  FileText,
  FolderUp,
  HomeIcon,
  Menu,
  Tags,
  Save,
  Send,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { actions } from 'astro:actions';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { DocumentInfo } from '@/components/document-info';
import { NewDocTagSelector } from '@/components/NewDocTagSelector';
import TagSelector from '@/components/TagSelector';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  $modelStatus,
  $saveStatus,
  $pendingTags,
  $currentTitle,
  $embeddingProgress,
  editorInstance,
  setPendingTags,
  setSaveSaving,
  setSaveSuccess,
  setSaveError,
  resetSaveStatus,
  setEmbeddingProgress,
  resetEmbeddingProgress,
} from '@/store/editor-store';
import {
  useEditorActions,
  useSaveShortcut,
  ensureModelReady,
} from '@/lib/editor-actions';
import { inferTitle } from '@/lib/utils';
import { preparePassageText } from '@/lib/embedding-utils';
import { embedPost } from '@/scripts/ai-embeddings';

type EditorMode = 'new' | 'edit' | 'propose';

interface UnifiedEditorHeaderProps {
  mode: EditorMode;
  documentId?: string | null;
  slug?: string | null;
  initialTitle?: string;
  isAuthor?: boolean;
  authorName?: string | null;
  initialTags?: string[];
}

export function UnifiedEditorHeader({
  mode,
  documentId,
  slug,
  initialTitle = '',
  isAuthor = true,
  authorName,
  initialTags = [],
}: UnifiedEditorHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const currentTitle = useStore($currentTitle);
  const modelStatus = useStore($modelStatus);
  const saveStatus = useStore($saveStatus);
  const pendingTags = useStore($pendingTags);
  const embeddingProgress = useStore($embeddingProgress);

  const {
    newDoc,
    importMarkdown,
    exportMarkdown,
    exportPdf,
    save,
    isBusy: actionsBusy,
    canSave,
    saveLabel,
  } = useEditorActions();

  const isBusy =
    modelStatus.phase === 'loading' ||
    saveStatus.phase === 'saving' ||
    (embeddingProgress && embeddingProgress.percent !== null) ||
    actionsBusy ||
    isSaving;

  // Inicializar tags pendientes con los tags existentes
  useEffect(() => {
    if (mode !== 'new' && initialTags.length > 0) {
      setPendingTags(initialTags);
    }
  }, [mode, initialTags]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTagSelector(false);
      }
    }
    if (showTagSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTagSelector]);

  // Reset status message after delay
  useEffect(() => {
    if (status !== 'idle') {
      const timeout = setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Guardar nuevo documento
  const handleSaveNew = useCallback(async () => {
    await save();
  }, [save]);

  // Guardar documento existente (autor) - con embeddings
  const handleSaveEdit = useCallback(async () => {
    const crepe = editorInstance.get();
    if (!crepe || !documentId) return;

    setIsSaving(true);
    setStatus('idle');
    setSaveSaving('Guardando…');
    setEmbeddingProgress({ label: 'Generando embeddings', percent: 0 });

    try {
      // Asegurar modelo listo
      await ensureModelReady();

      const rawMarkdown = await crepe.getMarkdown();
      const title = currentTitle || initialTitle || inferTitle(rawMarkdown);

      const { error } = await actions.documents.save({
        id: documentId,
        title,
        rawMarkdown,
        metadata: {},
      });

      if (error) {
        setStatus('error');
        setStatusMessage('Error al guardar');
        setSaveError('Error al guardar');
        return;
      }

      // Generar embeddings
      const cleanedText = preparePassageText(title, rawMarkdown);
      const embeddingText = `passage: ${cleanedText}`;

      const embedding = await embedPost({
        postId: documentId,
        text: embeddingText,
        onProgress: (payload: unknown) => {
          const p = payload as {
            percent?: number;
            label?: string;
            phase?: string;
            fromCache?: boolean;
          };
          if (p?.phase === 'cached' || p?.phase === 'ready') {
            setEmbeddingProgress({
              label: 'Generando vectores',
              percent: null,
            });
          } else if (p?.phase === 'running') {
            // Solo mostrar porcentaje si es mayor a 0 y menor a 100
            // El worker envía 0 al inicio y 100 al final, pero no hay progreso intermedio
            const rawPct = p.percent;
            if (rawPct != null && rawPct > 0 && rawPct < 100) {
              setEmbeddingProgress({
                label: p.label || 'Generando embeddings',
                percent: rawPct,
              });
            } else if (rawPct === 100) {
              setEmbeddingProgress({
                label: 'Embeddings generados',
                percent: 100,
              });
            } else {
              // rawPct === 0 o null: mostrar sin porcentaje
              setEmbeddingProgress({
                label: p.label || 'Generando embeddings',
                percent: null,
              });
            }
          } else if (p?.phase === 'loading' && p?.percent != null) {
            // Descarga del modelo - mostrar porcentaje
            const pct = Math.max(0, Math.min(100, Math.round(p.percent)));
            setEmbeddingProgress({
              label: p.label || 'Descargando modelo',
              percent: pct,
            });
          }
        },
      });

      // Guardar embedding en DB
      const { error: embError } = await actions.documents.upsertEmbeddings({
        documentId,
        items: [
          {
            chunkIndex: 0,
            chunkText: cleanedText,
            embedding,
            modelId: 'Xenova/multilingual-e5-small',
            device: 'server',
            pooling: 'mean',
            normalize: true,
          },
        ],
      });

      if (embError) {
        console.error('Error guardando embedding:', embError);
        // No fallar el guardado completo por error en embedding
      }

      // Guardar tags si hay cambios
      const currentTags = pendingTags;
      if (currentTags.length > 0 || initialTags.length > 0) {
        try {
          await actions.tags.setForDocument({
            documentId,
            tags: currentTags,
          });
        } catch {
          // No fallar por error en tags
        }
      }

      setStatus('success');
      setStatusMessage('Guardado correctamente');
      setSaveSuccess('Guardado. Redirigiendo...');
      resetEmbeddingProgress();

      setTimeout(() => {
        window.location.href = `/post/${slug}`;
      }, 1000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage('Error inesperado');
      setSaveError('Error inesperado');
      setEmbeddingProgress({ label: 'Error', percent: null });
    } finally {
      setIsSaving(false);
      resetSaveStatus();
    }
  }, [documentId, slug, currentTitle, initialTitle, pendingTags, initialTags]);

  // Enviar propuesta de cambios
  const handleSubmitProposal = useCallback(async () => {
    const crepe = editorInstance.get();
    if (!crepe || !documentId) return;

    setIsSaving(true);
    setStatus('idle');

    try {
      const rawMarkdown = await crepe.getMarkdown();
      const title = currentTitle || initialTitle;

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
      setStatusMessage('Propuesta enviada');
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
  }, [documentId, currentTitle, initialTitle, message]);

  // Handler de guardado según el modo
  const handleSave = useCallback(() => {
    if (mode === 'new') {
      handleSaveNew();
    } else if (mode === 'edit') {
      handleSaveEdit();
    }
  }, [mode, handleSaveNew, handleSaveEdit]);

  // Atajo de teclado Cmd/Ctrl+S
  useSaveShortcut(handleSave);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Banner informativo para modo propuesta */}
      {mode === 'propose' && (
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
            'relative pointer-events-auto shadow-sm w-full transition-all duration-300 ease-out',
            isScrolled ? 'max-w-full rounded-none' : 'max-w-5xl rounded-xl',
          )}
        >
          {/* Borde animado - solo visible cuando isBusy */}
          <AnimatePresence>
            {isBusy && (
              <div
                className={cn(
                  'absolute inset-0 overflow-hidden',
                  isScrolled ? 'rounded-none' : 'rounded-xl',
                )}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 0.3 },
                    rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                  }}
                  className='absolute -inset-full'
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0%, transparent 50%, #06b6d4 70%, #a855f7 85%, #ec4899 95%, transparent 100%)',
                  }}
                />
              </div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              'relative z-10 flex items-center justify-between w-full h-11 px-3 transition-all duration-300 ease-out',
              isBusy
                ? isScrolled
                  ? 'm-px rounded-none'
                  : 'm-px rounded-[11px]'
                : 'border border-border/40',
              isScrolled
                ? 'bg-background/95 backdrop-blur-2xl shadow-lg shadow-black/5 rounded-none'
                : 'bg-background/95 backdrop-blur-xl rounded-xl',
            )}
          >
            {/* Left: Nav + Menu */}
            <div className='flex items-center gap-2 z-20'>
              <Button
                asChild
                variant='ghost'
                size='icon-sm'
                className='text-muted-foreground hover:text-foreground shrink-0'
              >
                <a href={mode === 'new' ? '/' : `/post/${slug}`}>
                  {mode === 'new' ? (
                    <HomeIcon size={20} />
                  ) : (
                    <ArrowLeft size={20} />
                  )}
                </a>
              </Button>

              <div className='h-4 w-px bg-border/60 shrink-0' />

              {mode === 'new' && (
                <Menubar className='border-none shadow-none bg-transparent p-0 h-auto'>
                  <MenubarMenu>
                    <MenubarTrigger className='cursor-pointer font-medium text-sm px-2.5 py-1.5 h-8 data-[state=open]:bg-accent/50 rounded-md transition-colors'>
                      <Menu className='w-4 h-4 sm:hidden' />
                      <span className='hidden sm:inline'>Archivo</span>
                    </MenubarTrigger>
                    <MenubarContent align='start'>
                      <MenubarItem onClick={() => newDoc()}>
                        <FilePlus className='mr-2 h-4 w-4' /> Nuevo{' '}
                        <MenubarShortcut>⌘N</MenubarShortcut>
                      </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={() => importMarkdown()}>
                        <FolderUp className='mr-2 h-4 w-4' /> Importar...
                      </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={() => exportMarkdown()}>
                        <FileJson className='mr-2 h-4 w-4' /> Exportar MD
                      </MenubarItem>
                      <MenubarItem onClick={() => exportPdf()}>
                        <FileText className='mr-2 h-4 w-4' /> Exportar PDF
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              )}

              {mode !== 'new' && (
                <Menubar className='border-none shadow-none bg-transparent p-0 h-auto'>
                  <MenubarMenu>
                    <MenubarTrigger className='cursor-pointer font-medium text-sm px-2.5 py-1.5 h-8 data-[state=open]:bg-accent/50 rounded-md transition-colors'>
                      <Menu className='w-4 h-4 sm:hidden' />
                      <span className='hidden sm:inline'>Archivo</span>
                    </MenubarTrigger>
                    <MenubarContent align='start'>
                      <MenubarItem onClick={() => importMarkdown()}>
                        <FolderUp className='mr-2 h-4 w-4' /> Importar...
                      </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={() => exportMarkdown()}>
                        <FileJson className='mr-2 h-4 w-4' /> Exportar MD
                      </MenubarItem>
                      <MenubarItem onClick={() => exportPdf()}>
                        <FileText className='mr-2 h-4 w-4' /> Exportar PDF
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              )}
            </div>

            {/* Center: Document info (modo new y edit) */}
            {(mode === 'new' || mode === 'edit') && (
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-75 flex justify-center pointer-events-none'>
                <div className='pointer-events-auto'>
                  <DocumentInfo />
                </div>
              </div>
            )}

            {/* Center: Status/Title (modo propose) */}
            {mode === 'propose' && (
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10'>
                <AnimatePresence mode='wait'>
                  {isSaving ? (
                    <motion.div
                      key='propose-saving'
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className='flex items-center gap-2 text-sm text-blue-500'
                    >
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>Enviando propuesta...</span>
                    </motion.div>
                  ) : status === 'success' ? (
                    <motion.div
                      key='propose-success'
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className='flex items-center gap-2 text-sm text-emerald-500'
                    >
                      <Check className='w-4 h-4' />
                      <span>{statusMessage}</span>
                    </motion.div>
                  ) : status === 'error' ? (
                    <motion.div
                      key='propose-error'
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className='flex items-center gap-2 text-sm text-red-500'
                    >
                      <AlertCircle className='w-4 h-4' />
                      <span>{statusMessage}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key='propose-title'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className='text-sm font-medium text-foreground/80 truncate max-w-60 block'>
                        {currentTitle || initialTitle}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Right: Actions */}
            <div className='flex items-center gap-2 z-20'>
              {/* Tag Selector (no en modo propose) */}
              {mode !== 'propose' && (
                <div className='relative' ref={tagDropdownRef}>
                  <Button
                    onClick={() => setShowTagSelector(!showTagSelector)}
                    variant={showTagSelector ? 'secondary' : 'ghost'}
                    size='icon-sm'
                    className='text-muted-foreground hover:text-foreground relative'
                    title='Etiquetas'
                  >
                    <Tags size={18} />
                    {pendingTags.length > 0 && (
                      <span className='absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center'>
                        {pendingTags.length}
                      </span>
                    )}
                  </Button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showTagSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className='absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50'
                      >
                        <div className='p-3'>
                          <div className='flex items-center gap-2 mb-3'>
                            <Tags size={14} className='text-muted-foreground' />
                            <span className='text-sm font-medium'>
                              Etiquetas
                            </span>
                          </div>
                          {mode === 'new' ? (
                            <NewDocTagSelector
                              selectedTags={pendingTags}
                              onChange={setPendingTags}
                            />
                          ) : (
                            <TagSelector
                              documentId={documentId!}
                              initialTags={initialTags.map((name, i) => ({
                                id: `temp-${i}`,
                                name,
                                slug: name.toLowerCase(),
                                color: null,
                              }))}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <ModeToggle />

              {/* Save/Propose buttons */}
              {mode === 'propose' ? (
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
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!canSave || isBusy}
                  className={cn(
                    'relative flex items-center justify-center h-9 px-4 min-w-27.5 rounded-lg text-sm font-medium transition-all duration-200',
                    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95',
                    'disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100',
                  )}
                  aria-label='Guardar documento'
                >
                  <div className='flex items-center gap-2'>
                    <div className='relative w-4 h-4 flex items-center justify-center'>
                      <AnimatePresence mode='popLayout'>
                        {isBusy ? (
                          <Spinner className='w-4 h-4' />
                        ) : (
                          <motion.div
                            key='icon'
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className='absolute inset-0'
                          >
                            <Save className='w-4 h-4' />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <motion.span layout className='whitespace-nowrap'>
                      {mode === 'new'
                        ? saveLabel
                        : isBusy
                        ? 'Guardando...'
                        : 'Guardar'}
                    </motion.span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
