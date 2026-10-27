import React, { useEffect, useState, useCallback } from 'react';
import { notificationsApi } from '../../api/notifications.api';
import { Notification } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../api/client';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      success('All notifications marked as read.');
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    if (type.includes('APPROVED') || type.includes('ALLOCATED')) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    }
    if (type.includes('REJECTED') || type.includes('CHANGES') || type.includes('CANCELLED')) {
      return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
    return <Info className="w-5 h-5 text-indigo-600" />;
  };

  if (isLoading) {
    return <PageLoading message="Loading notifications center..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System announcements, workflow updates, and academic decision alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter('ALL')}
          className={`pb-3 text-xs font-semibold px-3 border-b-2 transition ${
            filter === 'ALL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`pb-3 text-xs font-semibold px-3 border-b-2 transition ${
            filter === 'UNREAD'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-10 h-10 text-slate-400" />}
          title="No Notifications"
          description={
            filter === 'UNREAD'
              ? 'You have caught up with all notifications.'
              : 'There are no notifications in your history.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={`transition hover:border-slate-300 ${
                !n.isRead ? 'bg-indigo-50/20 border-indigo-100' : ''
              }`}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${!n.isRead ? 'text-indigo-950' : 'text-slate-800'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" title="Unread" />
                      )}
                      <Badge variant="default" className="text-[10px]">
                        {n.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-indigo-600 hover:text-indigo-800 shrink-0"
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
