'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiBell, 
  FiAlertOctagon, 
  FiCheckCircle, 
  FiActivity, 
  FiFolderPlus, 
  FiAlertCircle,
  FiCheck,
  FiExternalLink
} from 'react-icons/fi';
import { socket } from '../utils/socket';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../../lib/api/client';

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchNotifications = async (cursor?: string | null) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const query = new URLSearchParams({ limit: '20' });
      if (cursor) query.set('cursor', cursor);
      const data = await apiFetch<{ notifications?: any[]; unreadCount?: number; pagination?: { hasMore?: boolean; nextCursor?: string | null } }>(`/notifications?${query.toString()}`);
      const notifs = data.notifications || [];
      setNotifications((previous) => cursor
        ? [...previous, ...notifs.filter((item) => !previous.some((existing) => existing.id === item.id))]
        : notifs);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : notifs.filter((n: any) => !n.read).length);
      setHasMore(Boolean(data.pagination?.hasMore));
      setNextCursor(data.pagination?.nextCursor ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId && userId !== 'guest' && userId !== 'demo-citizen') {
      fetchNotifications();

      socket.connect();

      const handleNotification = (newNotif: any) => {
        setNotifications((prev) => prev.some((item) => item.id === newNotif.id) ? prev : [newNotif, ...prev]);
        setUnreadCount((prev) => newNotif.read ? prev : prev + 1);

        toast((t) => (
          <div 
            onClick={() => {
              toast.dismiss(t.id);
              if (newNotif.link) router.push(newNotif.link);
            }}
            className="cursor-pointer p-1 text-left font-sans"
          >
            <div className="font-extrabold text-[#0f172a] text-xs flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#143527] animate-ping" />
              {newNotif.title}
            </div>
            <div className="text-[11px] text-[#475569] mt-0.5 line-clamp-2">{newNotif.message}</div>
          </div>
        ), {
          duration: 5000,
          style: {
            borderRadius: '16px',
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #eef1ea',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
          },
        });
      };

      socket.on('notification:received', handleNotification);

      return () => {
        socket.off('notification:received', handleNotification);
        socket.disconnect();
      };
    }
  }, [userId, router]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SLA_BREACH':
        return <FiAlertOctagon className="text-red-500" />;
      case 'RESOLUTION_SUBMITTED':
        return <FiCheckCircle className="text-[#143527]" />;
      case 'INCIDENT_STARTED':
        return <FiActivity className="text-blue-500" />;
      case 'INCIDENT_CREATED':
        return <FiFolderPlus className="text-amber-500" />;
      default:
        return <FiAlertCircle className="text-[#334155]" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredNotifications = activeTab === 'UNREAD' 
    ? notifications.filter((n) => !n.read) 
    : notifications;

  return (
    <div className="relative font-sans">
      {/* Precision Bell Trigger */}
      <button 
        type="button"
        aria-label="Open notifications"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex size-10 items-center justify-center rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
          isOpen 
            ? 'border-[#143527] bg-[#143527]/5 text-[#143527] shadow-xs ring-2 ring-[#143527]/20' 
            : 'border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc] hover:border-[#cbd5e1] shadow-2xs'
        }`}
      >
        <FiBell className={`size-4.5 transition-transform ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#143527] text-[10px] font-bold text-white border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-3 w-88 sm:w-96 rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
            
            {/* Header */}
            <div className="p-4 border-b border-[#eef1ea] bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#143527] text-white font-bold">
                    <FiBell className="size-3.5" />
                  </div>
                  <h3 className="font-bold text-sm text-[#0f172a] tracking-tight">
                    Municipal Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10.5px] font-bold bg-[#143527] text-white px-2 py-0.5 rounded-full shadow-2xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button 
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs font-semibold text-[#143527] hover:text-[#0e271c] cursor-pointer bg-[#143527]/5 hover:bg-[#143527]/10 px-2.5 py-1 rounded-lg transition-colors border border-[#143527]/20"
                  >
                    <FiCheck className="size-3" /> Mark all read
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1.5 p-1 bg-[#f1f5f9] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    activeTab === 'ALL'
                      ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  All Alerts ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('UNREAD')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                    activeTab === 'UNREAD'
                      ? 'bg-white text-[#0f172a] shadow-xs font-bold'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
            </div>

            {/* Notification Items */}
            <div className="max-h-96 overflow-y-auto divide-y divide-[#f1f5f9]">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-[#64748b]">Loading municipal alerts…</div>
              ) : loadError && notifications.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <FiAlertCircle className="size-6 text-[#dc2626] mb-2" />
                  <p className="text-sm font-bold text-[#0f172a]">Alerts are temporarily unavailable</p>
                  <button type="button" onClick={() => fetchNotifications()} className="mt-3 rounded-lg bg-[#143527] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0e271c]">Try again</button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="size-12 rounded-2xl bg-[#143527]/5 border border-[#143527]/20 flex items-center justify-center text-[#143527] mb-3 shadow-2xs">
                    <FiCheckCircle className="size-5" />
                  </div>
                  <p className="text-sm font-black text-[#0f172a]">All Caught Up!</p>
                  <p className="text-xs text-[#64748b] mt-1 font-medium max-w-xs">
                    No new municipal alerts or SLA escalation notices for your area right now.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isUnread = !notif.read;
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 flex gap-3 hover:bg-[#f8fafc] transition-colors cursor-pointer text-left relative group ${
                        isUnread ? 'bg-[#143527]/5' : 'bg-white'
                      }`}
                    >
                      {/* Status Icon Container */}
                      <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                        notif.type === 'SLA_BREACH' 
                          ? 'bg-red-50 border-red-200 text-red-600' 
                          : notif.type === 'RESOLUTION_SUBMITTED'
                          ? 'bg-[#143527]/10 border-[#143527]/20 text-[#143527]'
                          : 'bg-white border-[#eef1ea] text-[#334155]'
                      }`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className={`text-xs truncate ${isUnread ? 'font-black text-[#0f172a]' : 'font-semibold text-[#475569]'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-[#94a3b8] whitespace-nowrap font-medium shrink-0">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        {notif.link && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-bold text-[#143527]">
                            <span>Track incident</span>
                            <FiExternalLink className="size-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Unread marker & Dismiss button */}
                      {isUnread && (
                        <div className="flex flex-col items-end justify-between py-1 shrink-0">
                          <span className="size-2 bg-[#143527] rounded-full ring-2 ring-[#143527]/30" />
                          <button 
                            type="button"
                            onClick={(e) => markAsRead(notif.id, e)}
                            className="text-[10px] font-bold text-[#64748b] hover:text-[#0f172a] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark as read"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {hasMore && (
              <div className="border-t border-[#eef1ea] p-2 text-center">
                <button type="button" disabled={isLoading} onClick={() => fetchNotifications(nextCursor)} className="text-xs font-bold text-[#143527] hover:underline disabled:opacity-50">
                  {isLoading ? 'Loading…' : 'Load older alerts'}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 border-t border-[#eef1ea] bg-white flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-[#64748b]">
                Real-time updates via Socket.IO
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/profile');
                }}
                className="font-black text-[#143527] hover:underline"
              >
                View History →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
