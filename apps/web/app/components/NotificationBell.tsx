'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiBell, 
  FiAlertOctagon, 
  FiCheckCircle, 
  FiActivity, 
  FiFolderPlus, 
  FiAlertCircle 
} from 'react-icons/fi';
import { socket } from '../utils/socket';
import { toast } from 'react-hot-toast';

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const notifs = data.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();

      socket.connect();

      const handleNotification = (newNotif: any) => {
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Play subtle alert sound if desired, or trigger toast
        toast((t) => (
          <div 
            onClick={() => {
              toast.dismiss(t.id);
              if (newNotif.incidentId) {
                router.push(`/admin/incidents/${newNotif.incidentId}`);
              }
            }}
            className="cursor-pointer p-1 text-left"
          >
            <div className="font-semibold text-[#f2ddbb] text-sm flex items-center gap-1.5">
              <FiBell className="text-amber-400 shrink-0 animate-bounce" />
              {newNotif.title}
            </div>
            <div className="text-xs text-white/90 mt-0.5">{newNotif.message}</div>
            {newNotif.incidentId && (
              <div className="text-[10px] text-white/40 mt-1 font-light">Click to view incident task</div>
            )}
          </div>
        ), {
          duration: 6000,
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
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.incidentId) {
      router.push(`/admin/incidents/${notif.incidentId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SLA_BREACH':
        return <FiAlertOctagon className="text-sm" />;
      case 'RESOLUTION_SUBMITTED':
        return <FiCheckCircle className="text-sm" />;
      case 'INCIDENT_STARTED':
        return <FiActivity className="text-sm" />;
      case 'INCIDENT_CREATED':
        return <FiFolderPlus className="text-sm" />;
      default:
        return <FiAlertCircle className="text-sm" />;
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

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-[#5E1801] hover:bg-[#faf9f6] rounded-xl relative transition-colors cursor-pointer select-none active:scale-95"
      >
        <FiBell className="text-lg animate-fade-in" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-[#EF6820] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2.5 w-80 bg-white border border-[#E9E1D8] rounded-2xl shadow-xl z-40 overflow-hidden animate-fade-in origin-top-right">
            <div className="px-5 py-4 border-b border-[#E9E1D8] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#2B2523]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-[#EF6820] text-white px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-[#5E1801] hover:underline font-medium cursor-pointer"
                >
                  Mark all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#E9E1D8]/50">
              {notifications.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#faf9f6] border border-[#E9E1D8]/60 flex items-center justify-center text-[#9B9088] mb-3">
                    <FiBell className="text-lg" />
                  </div>
                  <p className="text-sm font-semibold text-[#2B2523]">No alerts yet</p>
                  <p className="text-xs text-[#6F625C] mt-1 font-light">Updates will appear here.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notif.read;
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 flex gap-3 hover:bg-[#faf9f6] transition-colors cursor-pointer text-left relative ${
                        isUnread ? 'bg-[#5E1801]/[0.02]' : ''
                      }`}
                    >
                      <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 border ${
                        notif.type === 'SLA_BREACH' 
                          ? 'bg-red-50 border-red-100 text-red-600' 
                          : notif.type === 'RESOLUTION_SUBMITTED'
                          ? 'bg-green-50 border-green-100 text-green-600'
                          : 'bg-[#faf9f6] border-[#E9E1D8] text-[#5E1801]'
                      }`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-sm truncate ${isUnread ? 'font-semibold text-[#2B2523]' : 'text-[#6F625C]'}`}>
                            {notif.title}
                          </p>
                          <span className="text-xs text-[#9B9088] whitespace-nowrap font-light shrink-0">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F625C] line-clamp-2 mt-1 leading-normal font-light">
                          {notif.message}
                        </p>
                      </div>

                      {isUnread && (
                        <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#EF6820] rounded-full shrink-0"></span>
                          <button 
                            onClick={(e) => markAsRead(notif.id, e)}
                            className="text-xs text-[#5E1801] hover:underline cursor-pointer font-semibold"
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
          </div>
        </>
      )}
    </div>
  );
}
