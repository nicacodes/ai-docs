import { useState, useMemo } from 'react';
import { actions } from 'astro:actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface ProposalDetailProps {
  proposal: {
    id: string;
    documentId: string;
    proposerId: string;
    proposedTitle: string;
    proposedMarkdown: string;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    reviewComment: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    // Estructura aplanada
    originalTitle: string;
    originalMarkdown: string;
    documentSlug: string;
    authorId: string | null;
    authorName: string | null;
    proposerName: string | null;
  };
  isAuthor: boolean;
  isProposer: boolean;
  currentUserId: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente de revisión',
    className:
      'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Aprobada',
    className:
      'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  },
  withdrawn: {
    label: 'Retirada',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

type ViewMode = 'split' | 'original' | 'proposed';

export default function ProposalDetail({
  proposal,
  isAuthor,
  isProposer,
}: ProposalDetailProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isPending = proposal.status === 'pending';

  const diffLines = useMemo(() => {
    const originalLines = proposal.originalMarkdown.split('\n');
    const proposedLines = proposal.proposedMarkdown.split('\n');

    // Simple line-by-line diff
    const maxLines = Math.max(originalLines.length, proposedLines.length);
    const diff: Array<{
      lineNum: number;
      original: string | null;
      proposed: string | null;
      type: 'unchanged' | 'added' | 'removed' | 'modified';
    }> = [];

    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i] ?? null;
      const prop = proposedLines[i] ?? null;

      if (orig === prop) {
        diff.push({
          lineNum: i + 1,
          original: orig,
          proposed: prop,
          type: 'unchanged',
        });
      } else if (orig === null) {
        diff.push({
          lineNum: i + 1,
          original: null,
          proposed: prop,
          type: 'added',
        });
      } else if (prop === null) {
        diff.push({
          lineNum: i + 1,
          original: orig,
          proposed: null,
          type: 'removed',
        });
      } else {
        diff.push({
          lineNum: i + 1,
          original: orig,
          proposed: prop,
          type: 'modified',
        });
      }
    }

    return diff;
  }, [proposal.originalMarkdown, proposal.proposedMarkdown]);

  const stats = useMemo(() => {
    return {
      added: diffLines.filter((l) => l.type === 'added').length,
      removed: diffLines.filter((l) => l.type === 'removed').length,
      modified: diffLines.filter((l) => l.type === 'modified').length,
    };
  }, [diffLines]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const result = await actions.proposals.approve({
        proposalId: proposal.id,
        comment: reviewComment || undefined,
      });
      if (result.error) {
        setActionError('Error al aprobar la propuesta');
      } else {
        setActionSuccess(
          'Propuesta aprobada. Los cambios han sido aplicados al documento.',
        );
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setActionError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewComment.trim()) {
      setActionError(
        'Por favor, proporciona un comentario explicando el rechazo',
      );
      return;
    }
    setLoading(true);
    setActionError(null);
    try {
      const result = await actions.proposals.reject({
        proposalId: proposal.id,
        comment: reviewComment,
      });
      if (result.error) {
        setActionError('Error al rechazar la propuesta');
      } else {
        setActionSuccess('Propuesta rechazada.');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setActionError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const result = await actions.proposals.withdraw({ id: proposal.id });
      if (result.error) {
        setActionError('Error al retirar la propuesta');
      } else {
        setActionSuccess('Propuesta retirada.');
        setTimeout(() => (window.location.href = '/proposals'), 1500);
      }
    } catch {
      setActionError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen'>
      {/* Header */}
      <header className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border'>
        <div className='container mx-auto px-4 py-4 max-w-7xl'>
          <div className='flex items-center justify-between gap-4 mb-4'>
            <div className='flex items-center gap-3'>
              <a
                href='/proposals'
                className='p-2 rounded-lg hover:bg-accent transition-colors'
                title='Volver'
              >
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 19l-7-7 7-7'
                  />
                </svg>
              </a>
              <div>
                <h1 className='text-xl font-bold'>{proposal.proposedTitle}</h1>
                <p className='text-sm text-muted-foreground'>
                  Documento original: {proposal.originalTitle}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium border',
                statusLabels[proposal.status].className,
              )}
            >
              {statusLabels[proposal.status].label}
            </span>
          </div>

          {/* Meta info */}
          <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4'>
            <span>
              Propuesto por:{' '}
              <span className='text-foreground font-medium'>
                {proposal.proposerName}
              </span>
            </span>
            <span>
              Autor original:{' '}
              <span className='text-foreground font-medium'>
                {proposal.authorName}
              </span>
            </span>
            <span>{formatDate(proposal.createdAt)}</span>
          </div>

          {/* View mode toggle */}
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground mr-2'>Vista:</span>
            <div className='flex rounded-lg border border-border overflow-hidden'>
              {(['split', 'original', 'proposed'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent',
                  )}
                >
                  {mode === 'split'
                    ? 'Comparación'
                    : mode === 'original'
                    ? 'Original'
                    : 'Propuesto'}
                </button>
              ))}
            </div>

            <div className='ml-auto flex items-center gap-4 text-sm'>
              <span className='text-green-600 dark:text-green-400'>
                +{stats.added} añadidas
              </span>
              <span className='text-red-600 dark:text-red-400'>
                -{stats.removed} eliminadas
              </span>
              <span className='text-yellow-600 dark:text-yellow-400'>
                ~{stats.modified} modificadas
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Message from proposer */}
      {proposal.message && (
        <div className='container mx-auto px-4 max-w-7xl mt-4'>
          <div className='p-4 rounded-lg bg-accent/50 border border-border'>
            <p className='text-sm font-medium mb-1'>
              Mensaje del autor de la propuesta:
            </p>
            <p className='text-sm text-muted-foreground'>{proposal.message}</p>
          </div>
        </div>
      )}

      {/* Review comment (if already reviewed) */}
      {proposal.reviewComment && (
        <div className='container mx-auto px-4 max-w-7xl mt-4'>
          <div
            className={cn(
              'p-4 rounded-lg border',
              proposal.status === 'approved'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30',
            )}
          >
            <p className='text-sm font-medium mb-1'>Comentario del revisor:</p>
            <p className='text-sm text-muted-foreground'>
              {proposal.reviewComment}
            </p>
          </div>
        </div>
      )}

      {/* Diff viewer */}
      <div className='container mx-auto px-4 max-w-7xl py-6'>
        <div className='rounded-lg border border-border overflow-hidden bg-card'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm font-mono'>
              <tbody>
                {diffLines.map((line, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      line.type === 'added' && 'bg-green-500/10',
                      line.type === 'removed' && 'bg-red-500/10',
                      line.type === 'modified' && 'bg-yellow-500/10',
                    )}
                  >
                    {/* Line number */}
                    <td className='px-2 py-0.5 text-right text-muted-foreground select-none border-r border-border w-12'>
                      {line.lineNum}
                    </td>

                    {/* Original (if split or original view) */}
                    {(viewMode === 'split' || viewMode === 'original') && (
                      <td
                        className={cn(
                          'px-3 py-0.5 whitespace-pre-wrap',
                          viewMode === 'split' &&
                            'w-1/2 border-r border-border',
                          (line.type === 'removed' ||
                            line.type === 'modified') &&
                            'text-red-700 dark:text-red-400',
                        )}
                      >
                        {line.type === 'removed' && (
                          <span className='mr-1'>-</span>
                        )}
                        {line.type === 'modified' && (
                          <span className='mr-1'>-</span>
                        )}
                        {line.original ?? ''}
                      </td>
                    )}

                    {/* Proposed (if split or proposed view) */}
                    {(viewMode === 'split' || viewMode === 'proposed') && (
                      <td
                        className={cn(
                          'px-3 py-0.5 whitespace-pre-wrap',
                          (line.type === 'added' || line.type === 'modified') &&
                            'text-green-700 dark:text-green-400',
                        )}
                      >
                        {line.type === 'added' && (
                          <span className='mr-1'>+</span>
                        )}
                        {line.type === 'modified' && (
                          <span className='mr-1'>+</span>
                        )}
                        {line.proposed ?? ''}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action panel (for pending proposals) */}
      {isPending && (isAuthor || isProposer) && (
        <div className='sticky bottom-0 bg-background/95 backdrop-blur border-t border-border'>
          <div className='container mx-auto px-4 py-4 max-w-7xl'>
            {actionSuccess && (
              <div className='mb-4 p-3 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 text-sm'>
                {actionSuccess}
              </div>
            )}
            {actionError && (
              <div className='mb-4 p-3 rounded-lg bg-destructive/20 text-destructive text-sm'>
                {actionError}
              </div>
            )}

            {isAuthor && (
              <div className='space-y-4'>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder='Comentario (opcional para aprobar, requerido para rechazar)...'
                  className='w-full px-3 py-2 rounded-lg border border-border bg-background resize-none h-20'
                />
                <div className='flex items-center gap-3'>
                  <Button
                    onClick={handleApprove}
                    disabled={loading}
                    className='bg-green-600 hover:bg-green-700 text-white'
                  >
                    {loading ? <Spinner className='w-4 h-4 mr-2' /> : null}
                    Aprobar y Aplicar Cambios
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant='destructive'
                  >
                    {loading ? <Spinner className='w-4 h-4 mr-2' /> : null}
                    Rechazar
                  </Button>
                </div>
              </div>
            )}

            {isProposer && !isAuthor && (
              <div className='flex items-center justify-between'>
                <p className='text-sm text-muted-foreground'>
                  Tu propuesta está pendiente de revisión por el autor del
                  documento.
                </p>
                <Button
                  onClick={handleWithdraw}
                  disabled={loading}
                  variant='outline'
                >
                  {loading ? <Spinner className='w-4 h-4 mr-2' /> : null}
                  Retirar Propuesta
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
