'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
  className?: string;
  /* Variante bottom-sheet mobile : panneau ancré en bas, coins hauts
   * arrondis, hauteur plafonnée — le contenu défile, le footer reste
   * visible. Sur desktop, comportement centré classique. */
  sheet?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  centered = false,
  className,
  sheet = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex items-end justify-center sm:items-center", sheet ? "p-0 sm:p-6" : "p-4 sm:p-6")} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-describedby={description ? descriptionId : undefined}>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 animate-[fade-in_150ms_ease-out]",
          sheet ? "bg-slate-900/40 backdrop-blur-md" : "bg-black/50 backdrop-blur-[2px]",
        )}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden animate-[slide-up_180ms_ease-out] border bg-card shadow-pop focus:outline-none',
          sheet
            ? 'max-h-[75vh] max-w-md rounded-t-[2.5rem] border-slate-200/60 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:max-h-[85vh] sm:max-w-sm sm:rounded-3xl sm:pb-0 dark:bg-slate-950/95'
            : 'mx-auto w-[95%] max-w-lg rounded-2xl border-border sm:w-full',
          !sheet && 'max-h-[90dvh]',
          centered && !sheet ? 'sm:max-w-sm' : '',
          !sheet && !centered ? 'sm:mx-4' : '',
          className,
        )}
      >
        <div className={cn("mx-auto shrink-0 rounded-full sm:hidden", sheet ? "mt-2.5 h-1 w-10 bg-slate-200 dark:bg-white/20" : "mt-2 h-1 w-10 bg-border")} />
        <div className={cn("flex shrink-0 items-center justify-between gap-3", sheet ? "border-b border-border px-3.5 py-2.5" : "items-start px-5 pt-4")}>
          <div className="min-w-0 space-y-0.5">
            {title ? <h2 id={titleId} className={sheet ? "text-xs font-bold leading-tight tracking-tight text-slate-900 dark:text-white" : "text-sm sm:text-base font-semibold tracking-tight"}>{title}</h2> : null}
            {description ? <p id={descriptionId} className={sheet ? "text-[10px] text-slate-500 dark:text-slate-400" : "text-sm text-muted-foreground"}>{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className={sheet
              ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/10 dark:text-slate-300"
              : "flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}
          >
            <Icon name="x" size="3.5" />
          </button>
        </div>
        {children ? <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", sheet ? "space-y-2 p-3" : "px-5 py-4")}>{children}</div> : null}
        {footer ? <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end [&_button]:min-h-12 [&_button]:text-sm sm:[&_button]:text-base">{footer}</div> : null}
      </div>
    </div>
  );
}