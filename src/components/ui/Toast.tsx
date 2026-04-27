import { CheckCircle, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useNotification, type Toast } from "../../context/NotificationContext";

const ICONS = {
  success: <CheckCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
  error: <XCircle size={16} />,
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useNotification();

  return (
    <div className={`toast toast--${toast.tone}`} role="alert" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.tone]}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-dismiss"
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
