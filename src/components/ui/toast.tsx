'use client';

import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { useToast, type Toast, type ToastVariant } from '@/lib/toast-context';

interface VariantStyle {
  container: string;
  icon: IconName;
}

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  default: { container: 'border-border bg-card text-card-foreground', icon: 'info' },
  success: {
    container: 'border-success-border bg-success-soft text-success-ink',
    icon: 'check-circle',
  },
  error: { container: 'border-error-border bg-error-soft text-error-ink', icon: 'alert' },
  warning: {
    container: 'border-warning-border bg-warning-soft text-warning-ink',
    icon: 'alert',
  },
  info: { container: 'border-info-border bg-info-soft text-info-ink', icon: 'info' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const style = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.default;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto w-full animate-pop-in overflow-hidden rounded-xl border shadow-float',
        style.container,
      )}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 shrink-0">
          <Icon name={style.icon} size="sm" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-xs leading-snug opacity-80">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer la notification"
          className="shrink-0 rounded-md p-2.5 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="x" size="xs" />
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col-reverse items-center gap-2 px-4 pb-24 pt-4 sm:px-6 lg:bottom-6 lg:max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>,
    document.body,
  );
}