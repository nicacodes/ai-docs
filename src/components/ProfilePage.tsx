/**
 * ProfilePage - Componente principal de la página de perfil
 *
 * Incluye tabs para: Configuración, Publicaciones, Propuestas
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileText,
  GitPullRequest,
  Settings,
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Proposal {
  id: string;
  documentId: string;
  proposerId: string;
  proposedTitle: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  createdAt: Date;
  reviewedAt: Date | null;
  originalTitle: string;
  documentSlug: string;
  authorId: string | null;
  authorName: string | null;
  proposerName: string | null;
}

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
  };
  posts: Post[];
  receivedProposals: Proposal[];
  sentProposals: Proposal[];
}

interface ProfilePageProps {
  profileData: ProfileData;
}

type TabType = 'settings' | 'posts' | 'proposals';

const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    className: 'text-yellow-600 dark:text-yellow-400',
  },
  approved: {
    label: 'Aprobada',
    icon: CheckCircle,
    className: 'text-green-600 dark:text-green-400',
  },
  rejected: {
    label: 'Rechazada',
    icon: XCircle,
    className: 'text-red-600 dark:text-red-400',
  },
  withdrawn: {
    label: 'Retirada',
    icon: AlertCircle,
    className: 'text-muted-foreground',
  },
};

export default function ProfilePage({ profileData }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [name, setName] = useState(profileData.user.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const pendingReceived = profileData.receivedProposals.filter(
    (p) => p.status === 'pending',
  ).length;
  const pendingSent = profileData.sentProposals.filter(
    (p) => p.status === 'pending',
  ).length;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // TODO: Implementar action para actualizar perfil
      // Por ahora simular éxito
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Perfil actualizado' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = profileData.user.name
    ? profileData.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profileData.user.email[0].toUpperCase();

  return (
    <div className='min-h-screen'>
      {/* Header */}
      <header className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border'>
        <div className='container mx-auto px-4 py-4 max-w-5xl'>
          <div className='flex items-center gap-4'>
            <a
              href='/'
              className='p-2 rounded-lg hover:bg-accent transition-colors'
              title='Volver al inicio'
            >
              <ArrowLeft className='w-5 h-5' />
            </a>
            <div className='flex items-center gap-3'>
              {profileData.user.image ? (
                <img
                  src={profileData.user.image}
                  alt={profileData.user.name || 'Usuario'}
                  className='w-12 h-12 rounded-full object-cover'
                />
              ) : (
                <div className='w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-medium'>
                  {initials}
                </div>
              )}
              <div>
                <h1 className='text-xl font-bold'>
                  {profileData.user.name || 'Mi Perfil'}
                </h1>
                <p className='text-sm text-muted-foreground'>
                  {profileData.user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className='border-b border-border bg-background'>
        <div className='container mx-auto px-4 max-w-5xl'>
          <nav className='flex gap-1'>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Settings className='w-4 h-4' />
              Configuración
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'posts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <FileText className='w-4 h-4' />
              Mis Publicaciones
              <span className='ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full'>
                {profileData.posts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'proposals'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <GitPullRequest className='w-4 h-4' />
              Propuestas
              {pendingReceived + pendingSent > 0 && (
                <span className='ml-1 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full'>
                  {pendingReceived + pendingSent}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className='container mx-auto px-4 py-8 max-w-5xl'>
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className='max-w-xl space-y-6'>
            <div>
              <h2 className='text-lg font-semibold mb-4'>
                Información del perfil
              </h2>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-1.5'>
                    Nombre
                  </label>
                  <input
                    type='text'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className='w-full px-3 py-2 rounded-lg border border-border bg-background'
                    placeholder='Tu nombre'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1.5'>
                    Email
                  </label>
                  <input
                    type='email'
                    value={profileData.user.email}
                    disabled
                    className='w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground'
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    El email no se puede cambiar
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1.5'>
                    Miembro desde
                  </label>
                  <p className='text-muted-foreground'>
                    {formatDate(profileData.user.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {saveMessage && (
              <div
                className={cn(
                  'p-3 rounded-lg text-sm',
                  saveMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-destructive/20 text-destructive',
                )}
              >
                {saveMessage.text}
              </div>
            )}

            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Mis Publicaciones</h2>
              <Button asChild size='sm'>
                <a href='/new'>Nueva publicación</a>
              </Button>
            </div>

            {profileData.posts.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                <p>No has creado ninguna publicación</p>
                <Button asChild variant='outline' className='mt-4'>
                  <a href='/new'>Crear tu primera publicación</a>
                </Button>
              </div>
            ) : (
              <div className='space-y-2'>
                {profileData.posts.map((post) => (
                  <div
                    key={post.id}
                    className='flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors'
                  >
                    <div className='min-w-0 flex-1'>
                      <a
                        href={`/post/${post.slug}`}
                        className='font-medium hover:text-primary transition-colors'
                      >
                        {post.title}
                      </a>
                      <p className='text-sm text-muted-foreground'>
                        Creado: {formatDate(post.createdAt)}
                        {post.updatedAt > post.createdAt && (
                          <> · Actualizado: {formatDate(post.updatedAt)}</>
                        )}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 ml-4'>
                      <Button asChild variant='ghost' size='sm'>
                        <a href={`/post/${post.slug}`}>
                          <ExternalLink className='w-4 h-4' />
                        </a>
                      </Button>
                      <Button asChild variant='ghost' size='sm'>
                        <a href={`/edit/${post.slug}`}>Editar</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Proposals Tab */}
        {activeTab === 'proposals' && (
          <div className='space-y-8'>
            {/* Propuestas recibidas */}
            <div>
              <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                Propuestas Recibidas
                {pendingReceived > 0 && (
                  <span className='px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full'>
                    {pendingReceived} pendiente{pendingReceived > 1 ? 's' : ''}
                  </span>
                )}
              </h2>

              {profileData.receivedProposals.length === 0 ? (
                <p className='text-muted-foreground py-4'>
                  No has recibido propuestas de cambios
                </p>
              ) : (
                <div className='space-y-2'>
                  {profileData.receivedProposals.map((proposal) => {
                    const StatusIcon = statusConfig[proposal.status].icon;
                    return (
                      <a
                        key={proposal.id}
                        href={`/proposals/${proposal.id}`}
                        className='flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>
                              {proposal.proposedTitle}
                            </span>
                            <span
                              className={cn(
                                'flex items-center gap-1 text-xs',
                                statusConfig[proposal.status].className,
                              )}
                            >
                              <StatusIcon className='w-3 h-3' />
                              {statusConfig[proposal.status].label}
                            </span>
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            De: {proposal.proposerName} · Para:{' '}
                            {proposal.originalTitle}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {formatDate(proposal.createdAt)}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Propuestas enviadas */}
            <div>
              <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                Propuestas Enviadas
                {pendingSent > 0 && (
                  <span className='px-2 py-0.5 text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full'>
                    {pendingSent} pendiente{pendingSent > 1 ? 's' : ''}
                  </span>
                )}
              </h2>

              {profileData.sentProposals.length === 0 ? (
                <p className='text-muted-foreground py-4'>
                  No has enviado propuestas de cambios
                </p>
              ) : (
                <div className='space-y-2'>
                  {profileData.sentProposals.map((proposal) => {
                    const StatusIcon = statusConfig[proposal.status].icon;
                    return (
                      <a
                        key={proposal.id}
                        href={`/proposals/${proposal.id}`}
                        className='flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>
                              {proposal.proposedTitle}
                            </span>
                            <span
                              className={cn(
                                'flex items-center gap-1 text-xs',
                                statusConfig[proposal.status].className,
                              )}
                            >
                              <StatusIcon className='w-3 h-3' />
                              {statusConfig[proposal.status].label}
                            </span>
                          </div>
                          <p className='text-sm text-muted-foreground'>
                            Para: {proposal.originalTitle} · Autor:{' '}
                            {proposal.authorName}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {formatDate(proposal.createdAt)}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
