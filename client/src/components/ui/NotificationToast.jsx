import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

/**
 * NotificationToast
 * A global toast component that listens for 'erp_notification' events.
 * Use it to show non-intrusive feedback to the user.
 */
export default function NotificationToast() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNotification = (event) => {
      const { message, type = 'info', duration = 5000 } = event.detail || {};
      const id = Date.now();

      setNotifications((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    };

    window.addEventListener('erp_notification', handleNotification);
    return () => window.removeEventListener('erp_notification', handleNotification);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`
            flex items-start gap-3 p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300
            ${n.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
              n.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 
              'bg-indigo-50 border-indigo-100 text-indigo-800'}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {n.type === 'error' ? <ExclamationCircleIcon className="h-5 w-5 text-red-600" /> : 
             n.type === 'success' ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : 
             <InformationCircleIcon className="h-5 w-5 text-indigo-600" />}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight">{n.message}</p>
          </div>

          <button 
            onClick={() => removeNotification(n.id)}
            className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-4 w-4 opacity-50" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Utility to dispatch a notification from anywhere
 */
export const notify = (message, type = 'info', duration = 5000) => {
  window.dispatchEvent(new CustomEvent('erp_notification', {
    detail: { message, type, duration }
  }));
};
