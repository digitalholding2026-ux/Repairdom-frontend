'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { getMe } from '@/lib/api/auth-service';
import {
  listDemandeMessages,
  sendDemandeMessage,
  type ConversationMessage,
} from '@/lib/api/request-service';

const POLL_INTERVAL_MS = 5000;

interface ConversationSectionProps {
  demandeId: string;
  canSend: boolean;
  /* Nom de l’interlocuteur (déjà autorisé par le backend : technicien
   * assigné côté client, client côté technicien). Affiché dans l’état vide
   * au lieu d’un générique « l’autre partie ». */
  peerName?: string | null;
}

export function ConversationSection({ demandeId, canSend, peerName }: ConversationSectionProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setCurrentUserId(me.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const list = await listDemandeMessages(demandeId);
        if (active) setMessages(list);
      } catch {
        // Erreur silencieuse en rafraîchissement périodique.
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [demandeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = content.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      await sendDemandeMessage(demandeId, text);
      setContent('');
      const list = await listDemandeMessages(demandeId);
      setMessages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex max-h-[26rem] flex-col gap-3">
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
      >
        {!loaded ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center" role="status">
            <span className="sr-only">Chargement des messages…</span>
            <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Chargement des messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon name="chat" size="md" />
            </span>
            <p className="text-sm font-medium">Aucun message pour le moment</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {peerName
                ? `Vous pourrez échanger avec ${peerName} ici concernant votre intervention.`
                : 'Vous pourrez échanger avec votre interlocuteur ici concernant votre intervention.'}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            const senderName = [message.sender.firstName, message.sender.lastName]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={message.id}
                className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}
              >
                {!isMine ? (
                  <Avatar size="sm" firstName={message.sender.firstName} lastName={message.sender.lastName} />
                ) : null}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                    isMine
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-border bg-background',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-baseline gap-2',
                      isMine ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <p className="text-xs font-medium opacity-80">{isMine ? 'Vous' : senderName}</p>
                    <p className={cn('text-[10px]', isMine ? 'opacity-70' : 'text-muted-foreground')}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line">{message.content}</p>
                </div>
                {isMine ? (
                  <Avatar size="sm" firstName={message.sender.firstName} lastName={message.sender.lastName} />
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder="Votre message…"
            aria-label="Votre message"
            className="h-11 flex-1 rounded-full"
          />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            isLoading={sending}
            disabled={!content.trim()}
            aria-label="Envoyer le message"
          >
            <Icon name="send" size="sm" />
          </Button>
        </form>
      ) : (
        <p className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          La discussion est verrouillée pour cette mission : vous pouvez relire les messages ci-dessus.
        </p>
      )}

      {error ? <p className="text-sm text-error-ink">{error}</p> : null}
    </div>
  );
}