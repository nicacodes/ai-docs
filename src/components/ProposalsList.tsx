import { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

interface Proposal {
  id: string;
  documentId: string;
  proposerId: string;
  proposedTitle: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewComment: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  // Estructura aplanada del ProposalWithDetails
  originalTitle: string;
  documentSlug: string;
  authorId: string | null;
  authorName: string | null;
  proposerName: string | null;
}

interface ProposalsListProps {
  userId: string;
}

type TabType = 'received' | 'sent';

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  },
  approved: {
    label: 'Aprobada',
    className: 'bg-green-500/20 text-green-600 dark:text-green-400',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400',
  },
  withdrawn: { label: 'Retirada', className: 'bg-muted text-muted-foreground' },
};

export default function ProposalsList({ userId }: ProposalsListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      setError(null);

      try {
        const result =
          activeTab === 'received'
            ? await actions.proposals.listReceived({})
            : await actions.proposals.listSent({});

        if (result.error) {
          setError('Error al cargar propuestas');
          return;
        }

        setProposals(result.data as Proposal[]);
      } catch (e) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    loadProposals();
  }, [activeTab]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Tabs */}
      <div className='flex border-b border-border mb-6'>
        <button
          onClick={() => setActiveTab('received')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'received'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Recibidas
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'sent'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Enviadas
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Spinner className='w-8 h-8' />
        </div>
      ) : error ? (
        <div className='text-center py-12 text-destructive'>{error}</div>
      ) : proposals.length === 0 ? (
        <div className='text-center py-12 text-muted-foreground'>
          {activeTab === 'received'
            ? 'No has recibido propuestas de cambios'
            : 'No has enviado propuestas de cambios'}
        </div>
      ) : (
        <div className='space-y-4'>
          {proposals.map((proposal) => (
            <a
              key={proposal.id}
              href={`/proposals/${proposal.id}`}
              className='block p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h3 className='font-medium truncate'>
                      {proposal.proposedTitle}
                    </h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                        statusLabels[proposal.status].className,
                      )}
                    >
                      {statusLabels[proposal.status].label}
                    </span>
                  </div>

                  <p className='text-sm text-muted-foreground mb-2'>
                    Documento:{' '}
                    <span className='text-foreground'>
                      {proposal.originalTitle}
                    </span>
                    {activeTab === 'received' && proposal.proposerName && (
                      <>
                        {' '}
                        · Propuesto por:{' '}
                        <span className='text-foreground'>
                          {proposal.proposerName}
                        </span>
                      </>
                    )}
                    {activeTab === 'sent' && proposal.authorName && (
                      <>
                        {' '}
                        · Autor:{' '}
                        <span className='text-foreground'>
                          {proposal.authorName}
                        </span>
                      </>
                    )}
                  </p>

                  {proposal.message && (
                    <p className='text-sm text-muted-foreground line-clamp-2 mb-2'>
                      "{proposal.message}"
                    </p>
                  )}

                  <p className='text-xs text-muted-foreground'>
                    {formatDate(proposal.createdAt)}
                    {proposal.reviewedAt && (
                      <> · Revisada: {formatDate(proposal.reviewedAt)}</>
                    )}
                  </p>
                </div>

                <svg
                  className='w-5 h-5 text-muted-foreground shrink-0'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
