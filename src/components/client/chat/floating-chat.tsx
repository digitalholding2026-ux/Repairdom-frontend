'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { ConversationSection } from '@/components/mission/conversation-section';
import { getMe } from '@/lib/api/auth-service';
import { listDemandeMessages } from '@/lib/api/request-service';

const UNREAD_POLL_MS = 15000;

export interface FloatingChatProps {
  demandeId: string;
  peerName?: string | null;
  peerFirstName?: string;
  peerLastName?: string | null;
  canSend: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/* Chat flottant Messenger : déclencheur fixe + fenêtre popover embarquant
 * le fil réel (`ConversationSection`, même source de vérité que la section
 * inline). Le badge compte les messages du technicien reçus quand la
 * fenêtre est fermée (poll léger, aucune donnée inventée). */
export function FloatingChat({
  demandeId,
  peerName,
  peerFirstName,
  peerLastName,
  canSend,
  open: controlledOpen,
  onOpenChange,
}: FloatingChatProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const lastSeenRef = useRef<string>(new Date().toISOString());

  /* Portail vers body : les ancêtres animés (transform persistant du
   * `slide-up` du layout) captureraient sinon le `fixed`, qui défilerait
   * avec la page au lieu de suivre le viewport. */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      lastSeenRef.current = new Date().toISOString();
      setUnread(0);
    }
  }, [open ]);

  useEffect(() => {
    if (open) return;
    let active = true;
    let myId: string | null = null;
    const check = async () => {
      try {
        if (!myId) {
          try {
            myId = (await getMe()).id;
          } catch {
            return;
          }
        }
        const list = await listDemandeMessages(demandeId);
        if (!active) return;
        setUnread(
          list.filter(
            (message) => message.senderId !== myId && message.createdAt > lastSeenRef.current,
          ).length,
        );
      } catch {
        // Erreur silencieuse : le badge reste simplement à zéro.
      }
    };
    void check();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void check();
    }, UNREAD_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, demandeId]);

  const toggle = () => setOpen(!open);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <div
          role="dialog"
          aria-label={`Discussion avec ${peerName ?? 'le technicien'}`}
          className="animate-pop-in flex h-[540px] max-h-[72dvh] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-pop"
        >
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <Avatar firstName={peerFirstName} lastName={peerLastName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{peerName ?? 'Technicien'}</p>
              <p className="text-xs text-muted-foreground">Technicien assigné</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Fermer la discussion"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3 [&>div]:h-full [&>div]:max-h-none">
            <ConversationSection demandeId={demandeId} canSend={canSend} peerName={peerName} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          open
            ? 'Fermer la discussion'
            : `Ouvrir la discussion${unread > 0 ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`
        }
        className="relative flex size-14 items-center justify-center rounded-full bg-relio-orange text-white shadow-lg shadow-relio-orange/30 transition-colors hover:bg-relio-orange-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Icon name={open ? 'x' : 'chat'} size="lg" />
        {!open && unread > 0 ? (
          <span
            aria-hidden
            className={cn(
              'absolute -right-1 -top-1 flex size-6 animate-pulse items-center justify-center',
              'rounded-full border-2 border-background bg-relio-orange-bright text-xs font-bold text-white',
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </div>,
    document.body,
  );
}
