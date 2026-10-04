'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { cn } from '@/lib/cn';
import {
  getBackofficeAgentStatus,
  postBackofficeAgentChat,
  type BackofficeAgentMessage,
} from '@/lib/api/admin-service';

/* Assistant Backoffice — outil interne d'administration (pas un chatbot
 * public) : question → recherche en lecture seule → réponse vérifiable.
 * Conversation en session uniquement (non persistée, 10 derniers messages
 * transmis au backend). Aucun prompt prédéfini imposé. */

export default function AdminAssistantPage() {
  const [messages, setMessages] = useState<BackofficeAgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ available: boolean; reason: string | null } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getBackofficeAgentStatus()
      .then((result) => {
        if (!cancelled) setStatus({ available: result.available, reason: result.reason });
      })
      .catch(() => {
        if (!cancelled) setStatus({ available: false, reason: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const next = [...messages, { role: 'user', content: text } as BackofficeAgentMessage];
    setMessages(next);
    setInput('');
    try {
      const result = await postBackofficeAgentChat(text, next);
      setMessages([...next, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(toUserErrorMessage(err, "Erreur lors de l'envoi."));
      setMessages(next);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assistant"
        description="Interrogez les données Relio en langage naturel — lecture seule, chiffres réels, aucune modification."
      />

      {status && !status.available ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {status.reason ?? "L'assistant est momentanément indisponible."} Les pages du
              back-office restent accessibles normalement.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div ref={listRef} className="max-h-[32rem] space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            icon={<Icon name="chat" size="md" />}
            title="Aucun message"
            description="Posez votre question sur l'activité Relio : demandes, missions, conversations, paiements, litiges."
          />
        ) : (
          messages.map((message, index) => (
            <div key={index} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                  message.role === 'user'
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md border border-border bg-background',
                )}
              >
                <p className="whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {sending ? <SkeletonCard /> : null}
      </div>

      {error ? <p className="text-sm text-error-ink">{error}</p> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={2000}
          placeholder="Votre question sur les données Relio…"
          aria-label="Votre question"
          className="h-11 flex-1 rounded-full"
          disabled={sending}
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          isLoading={sending}
          disabled={!input.trim()}
          aria-label="Envoyer la question"
        >
          <Icon name="send" size="sm" />
        </Button>
        {messages.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={sending}>
            Nouvelle conversation
          </Button>
        ) : null}
      </form>

      <p className="text-2xs leading-relaxed text-muted-foreground">
        Lecture seule : l'assistant consulte les données réelles et ne modifie jamais rien. Conversation
        en session uniquement, non conservée.
      </p>
    </div>
  );
}
