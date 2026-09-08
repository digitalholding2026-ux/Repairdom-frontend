'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
        className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            const senderName = [message.sender.firstName, message.sender.lastName]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background'
                  }`}
                >
                  <p className="text-xs font-medium opacity-80">{isMine ? 'Vous' : senderName}</p>
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <div className="flex items-center gap-2">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSend();
            }}
            maxLength={2000}
            placeholder="Votre message…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={handleSend} isLoading={sending} disabled={!content.trim()}>
            Envoyer
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}