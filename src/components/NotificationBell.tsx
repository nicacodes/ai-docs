import { useEffect, useState, useRef } from 'react';
import { actions } from 'astro:actions';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type:
    | 'proposal_received'
    | 'proposal_approved'
    | 'proposal_rejected'
    | 'proposal_comment';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load unread count on mount
  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const result = await actions.notifications.countUnread({});
        if (!result.error) {
          setUnreadCount(result.data.count);
        }
      } catch {
        // Ignore errors
      }
    }
    loadUnreadCount();
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    async function loadNotifications() {
      if (!isOpen) return;
      setLoading(true);
      try {
        const result = await actions.notifications.list({ limit: 10 });
        if (!result.error) {
          setNotifications(result.data as Notification[]);
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await actions.notifications.markAsRead({ id: notificationId });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore errors
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await actions.notifications.markAllAsRead({});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore errors
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return notifDate.toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'proposal_received':
        return (
          <svg
            className='w-5 h-5 text-blue-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        );
      case 'proposal_approved':
        return (
          <svg
            className='w-5 h-5 text-green-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        );
      case 'proposal_rejected':
        return (
          <svg
            className='w-5 h-5 text-red-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        );
      default:
        return (
          <svg
            className='w-5 h-5 text-muted-foreground'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
            />
          </svg>
        );
    }
  };

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 rounded-lg hover:bg-accent transition-colors'
        title='Notificaciones'
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
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
          />
        </svg>
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center text-xs font-bold text-white bg-destructive rounded-full px-1'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-100'>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
            <h3 className='font-semibold'>Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className='text-xs text-primary hover:underline'
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
              </div>
            ) : notifications.length === 0 ? (
              <div className='py-8 text-center text-muted-foreground text-sm'>
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0',
                    !notification.read && 'bg-accent/30',
                  )}
                >
                  <div className='shrink-0 mt-0.5'>
                    {getIcon(notification.type)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p
                      className={cn(
                        'text-sm truncate',
                        !notification.read && 'font-medium',
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className='text-xs text-muted-foreground line-clamp-2 mt-0.5'>
                      {notification.message}
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className='shrink-0 w-2 h-2 rounded-full bg-primary mt-2' />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <a
              href='/notifications'
              className='block px-4 py-3 text-center text-sm text-primary hover:bg-accent/50 border-t border-border'
            >
              Ver todas las notificaciones
            </a>
          )}
        </div>
      )}
    </div>
  );
}
