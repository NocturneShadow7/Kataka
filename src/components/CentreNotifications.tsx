import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export function CentreNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [audio] = useState(new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8LZhGwU7k9bywn0sBS18zu7aoE4PC1Gg4O+2YhsGPJLU8sByJQUtgc3y2Yk3Bxlnu+znolARDEyl4fC2YRsFO5PW8sJ9LAUufM7u2qBODwtRoODvtmIbBjyS1PLAciUFLYHN8tmJNwcZZ7vs56JQEQ=='));

  useEffect(() => {
    chargerNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const nouvelleNotif = payload.new as Notification;
          setNotifications((prev) => [nouvelleNotif, ...prev]);

          if (nouvelleNotif.priority === 'urgent' || nouvelleNotif.priority === 'high') {
            audio.play().catch(() => {});
            showBrowserNotification(nouvelleNotif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const chargerNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
    }
    setChargement(false);
  };

  const marquerCommeLu = async (notifId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
  };

  const dismisser = async (notifId: string) => {
    await supabase
      .from('notifications')
      .update({ is_dismissed: true })
      .eq('id', notifId);

    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const marquerToutCommeLu = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const showBrowserNotification = (notif: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notif.id,
      });
    }
  };

  const demanderPermissionNotifications = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    demanderPermissionNotifications();
  }, []);

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />;
    }

    switch (type) {
      case 'invoice_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'invoice_rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'order_created':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'payment_received':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'sim_expired':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'sim_renewed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'new_message':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getColorClass = (priority: string, is_read: boolean) => {
    if (is_read) {
      return 'bg-gray-800/50 border-gray-700';
    }

    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 border-red-600 animate-pulse';
      case 'high':
        return 'bg-orange-900/30 border-orange-600';
      case 'normal':
        return 'bg-blue-900/30 border-blue-600';
      case 'low':
        return 'bg-gray-800 border-gray-600';
      default:
        return 'bg-gray-800 border-gray-700';
    }
  };

  const nonLues = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOuvert(false)}
          />
          <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {nonLues > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {nonLues}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {nonLues > 0 && (
                  <button
                    onClick={marquerToutCommeLu}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Tout marquer comme lu
                  </button>
                )}
                <button
                  onClick={() => setOuvert(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[28rem]">
              {chargement ? (
                <div className="p-8 text-center text-gray-400">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-l-4 transition-all hover:bg-gray-800/80 cursor-pointer ${getColorClass(
                        notif.priority,
                        notif.is_read
                      )}`}
                      onClick={() => !notif.is_read && marquerCommeLu(notif.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getIcon(notif.type, notif.priority)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`text-sm font-semibold ${
                                notif.is_read ? 'text-gray-400' : 'text-white'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismisser(notif.id);
                              }}
                              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p
                            className={`text-xs mt-1 ${
                              notif.is_read ? 'text-gray-500' : 'text-gray-300'
                            }`}
                          >
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            {new Date(notif.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
