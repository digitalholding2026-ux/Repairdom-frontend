'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { formatTime } from '@/lib/format';
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
}

export function ConversationSection({ demandeId, canSend }: ConversationSectionProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
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
    <div className="space-y-3">
      <div
        ref={listRef}
        className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
      >
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun message pour le moment. Échangez avec {canSend ? 'l\'autre partie' : 'votre interlocuteur'} ici.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            const senderName = [message.sender.firstName, message.sender.lastName]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={message.id} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine ? (
                  <Avatar size="sm" firstName={message.sender.firstName} lastName={message.sender.lastName} />
                ) : null}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-border bg-background'
                  }`}
                >
                  <div className={`flex items-baseline gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-xs font-medium opacity-80">{isMine ? 'Vous' : senderName}</p>
                    <p className={`text-[10px] ${isMine ? 'opacity-70' : 'text-muted-foreground'}`}>
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
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            placeholder="Votre message…"
            className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
      ) : null}

      {error ? <p className="text-sm text-error-ink">{error}</p> : null}
    </div>
  );
}