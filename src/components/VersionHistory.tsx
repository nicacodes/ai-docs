/**
 * VersionHistory - Panel de historial de versiones
 *
 * Muestra una lista de versiones del documento con la opción de ver
 * el contenido y restaurar versiones anteriores.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Clock,
  RotateCcw,
  Eye,
  ChevronRight,
  Loader2,
  FileText,
  Check,
} from 'lucide-react';
import { actions } from 'astro:actions';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

// Formatear tiempo relativo en español
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'hace unos segundos';
  if (diffMins < 60)
    return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24)
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7)
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  if (diffWeeks < 4)
    return `hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  if (diffMonths < 12)
    return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;

  return date.toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface VersionSummary {
  id: number;
  versionNumber: number;
  title: string;
  changeMessage: string | null;
  contentLength: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
}

interface VersionHistoryProps {
  documentId: string;
  currentSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({
  documentId,
  isOpen,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Cargar versiones
  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await actions.versions.list({
        documentId,
        limit: 50,
      });

      if (error) {
        console.error('Error cargando versiones:', error);
        return;
      }

      setVersions(
        data.versions.map((v) => ({
          ...v,
          createdAt: new Date(v.createdAt),
        })),
      );
      setTotal(data.total);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      loadVersions();
      setSelectedVersion(null);
      setPreviewContent(null);
      setPreviewTitle(null);
      setRestoreSuccess(false);
    }
  }, [isOpen, loadVersions]);

  // Cargar preview de una versión
  const loadPreview = async (versionId: number) => {
    setSelectedVersion(versionId);
    setIsLoadingPreview(true);
    setPreviewContent(null);
    setPreviewTitle(null);

    try {
      const { data, error } = await actions.versions.get({ versionId });

      if (error) {
        console.error('Error cargando versión:', error);
        return;
      }

      setPreviewContent(data.rawMarkdown);
      setPreviewTitle(data.title);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Restaurar versión
  const handleRestore = async (versionId: number) => {
    if (
      !confirm('¿Restaurar esta versión? El contenido actual será reemplazado.')
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await actions.versions.restore({ versionId });

      if (error) {
        alert('Error al restaurar: ' + error.message);
        return;
      }

      setRestoreSuccess(true);
      setTimeout(() => {
        window.location.href = `/post/${data.slug}`;
      }, 1500);
    } catch (err) {
      console.error('Error:', err);
      alert('Error inesperado al restaurar');
    } finally {
      setIsRestoring(false);
    }
  };

  // Formatear tamaño
  const formatSize = (chars: number) => {
    if (chars < 1000) return `${chars} chars`;
    return `${(chars / 1000).toFixed(1)}k chars`;
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction='right'
    >
      <DrawerContent className='h-full w-full max-w-4xl! sm:max-w-xl'>
        {/* Header */}
        <DrawerHeader className='border-b border-border'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-primary/10'>
              <History className='w-5 h-5 text-primary' />
            </div>
            <div>
              <DrawerTitle>Historial de versiones</DrawerTitle>
              <DrawerDescription>{total} versiones guardadas</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Lista de versiones */}
          <div className='w-1/2 border-r border-border overflow-y-auto'>
            {isLoading ? (
              <div className='flex items-center justify-center h-32'>
                <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
              </div>
            ) : versions.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-32 text-muted-foreground'>
                <FileText className='w-8 h-8 mb-2 opacity-50' />
                <p className='text-sm'>Sin versiones guardadas</p>
              </div>
            ) : (
              <div className='divide-y divide-border'>
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => loadPreview(version.id)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                      selectedVersion === version.id && 'bg-muted',
                    )}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-mono bg-muted px-1.5 py-0.5 rounded'>
                            v{version.versionNumber}
                          </span>
                          {index === 0 && (
                            <span className='text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded'>
                              Actual
                            </span>
                          )}
                        </div>
                        <p className='text-sm font-medium truncate mt-1'>
                          {version.title}
                        </p>
                        {version.changeMessage && (
                          <p className='text-xs text-muted-foreground truncate'>
                            {version.changeMessage}
                          </p>
                        )}
                        <div className='flex items-center gap-3 mt-1.5 text-xs text-muted-foreground'>
                          <span className='flex items-center gap-1'>
                            <Clock className='w-3 h-3' />
                            {formatRelativeTime(version.createdAt)}
                          </span>
                          <span>{formatSize(version.contentLength)}</span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform',
                          selectedVersion === version.id && 'rotate-90',
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className='w-1/2 flex flex-col'>
            {selectedVersion === null ? (
              <div className='flex-1 flex flex-col items-center justify-center text-muted-foreground'>
                <Eye className='w-8 h-8 mb-2 opacity-50' />
                <p className='text-sm'>Selecciona una versión para ver</p>
              </div>
            ) : isLoadingPreview ? (
              <div className='flex-1 flex items-center justify-center'>
                <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
              </div>
            ) : restoreSuccess ? (
              <div className='flex-1 flex flex-col items-center justify-center text-green-500'>
                <Check className='w-12 h-12 mb-2' />
                <p className='font-medium'>Versión restaurada</p>
                <p className='text-sm text-muted-foreground'>Redirigiendo...</p>
              </div>
            ) : (
              <>
                {/* Preview header */}
                <div className='p-3 border-b border-border shrink-0'>
                  <h3 className='font-medium text-sm truncate'>
                    {previewTitle}
                  </h3>
                  <Button
                    onClick={() => handleRestore(selectedVersion)}
                    disabled={isRestoring}
                    size='sm'
                    className='mt-2 gap-2 w-full'
                  >
                    {isRestoring ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <RotateCcw className='w-4 h-4' />
                    )}
                    {isRestoring ? 'Restaurando...' : 'Restaurar esta versión'}
                  </Button>
                </div>

                {/* Preview content */}
                <div className='flex-1 overflow-y-auto p-3'>
                  <pre className='text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed'>
                    {previewContent}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
