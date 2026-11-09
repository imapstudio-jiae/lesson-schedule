import React from 'react';
import { Bell, CheckCircle, Info, X } from 'lucide-react';

export default function ToastNotification({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const IconComponent = toast.type === 'lesson' ? Bell : (toast.type === 'success' ? CheckCircle : Info);

        return (
          <div key={toast.id} className={`toast-item toast-${toast.type || 'info'}`}>
            <div className="toast-icon-wrap">
              <IconComponent size={18} />
            </div>
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              <div className="toast-message">{toast.message}</div>
              <span className="toast-time">{toast.timeStr || '방금 전'}</span>
            </div>
            <button
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              title="닫기"
              aria-label="알림 닫기"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
