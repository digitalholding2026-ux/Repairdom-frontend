'use client';

import { useEffect, useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SkeletonRow } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { AiAgentMessage } from '@/lib/api/admin-service';
import { AI_AGENT_SUGGESTIONS, type UseAiAgent } from './use-ai-agent';

/* IA-11 — vues conversationnelles admin (Desktop : colonne large + suggestions
 * latérales ; Mobile : colonne compacte + suggestions en wrap). */

function MessageList({ messages }: { messages: AiAgentMessage[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);
  return (
    <div
      ref={listRef}
      className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="chat" size="md" />
          </span>
          <p className="text-sm font-medium">Agent IA Relio</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Posez une question sur l’activité Relio — chiffres réels du back-office, lecture seule.
          </p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
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
    </div>
  );
}

function Composer({ controller }: { controller: UseAiAgent }) {
  const disabled = controller.sending || (!controller.statusLoading && controller.status?.available === false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        controller.send();
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={controller.input}
        onChange={(event) => controller.setInput(event.target.value)}
        maxLength={1000}
        placeholder="Combien de techniciens sont disponibles ?"
        aria-label="Votre question à l’agent IA"
        className="h-11 flex-1 rounded-full"
        disabled={controller.sending}
      />
      <Button
        type="submit"
        variant="secondary"
        size="icon"
        isLoading={controller.sending}
        disabled={!controller.input.trim() || disabled}
        aria-label="Envoyer la question"
      >
        <Icon name="send" size="sm" />
      </Button>
    </form>
  );
}

function Suggestions({ controller, vertical = false }: { controller: UseAiAgent; vertical?: boolean }) {
  return (
    <div className={cn('flex gap-2', vertical ? 'flex-col items-stretch' : 'flex-wrap')} aria-label="Questions rapides">
      {AI_AGENT_SUGGESTIONS.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className={vertical ? 'justify-start' : undefined}
          disabled={controller.sending}
          onClick={() => controller.send(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}

function StatusBanner({ controller }: { controller: UseAiAgent }) {
  if (controller.statusLoading) return null;
  if (controller.status?.available) return null;
  return (
    <Alert variant="warning">
      Service IA indisponible ({controller.status?.reason ?? 'non configuré'}) — les pages du back-office
      restent accessibles normalement.
    </Alert>
  );
}

function NewConversation({ controller }: { controller: UseAiAgent }) {
  return (
    <Button variant="ghost" size="sm" onClick={controller.reset} disabled={controller.sending || controller.messages.length === 0}>
      <Icon name="plus" size="sm" />
      <span className="ml-1">Nouvelle conversation</span>
    </Button>
  );
}

export function AiAgentDesktop({ controller }: { controller: UseAiAgent }) {
  if (controller.statusLoading && controller.messages.length === 0) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <StatusBanner controller={controller} />
      <div className="grid grid-cols-[1fr_240px] items-start gap-4">
        <Card>
          <CardContent className="flex max-h-[32rem] min-h-[24rem] flex-col gap-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Conversation (session uniquement, non conservée)</p>
              <NewConversation controller={controller} />
            </div>
            <MessageList messages={controller.messages} />
            {controller.error ? <Alert variant="error">{controller.error}</Alert> : null}
            <Composer controller={controller} />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions rapides</p>
          <Suggestions controller={controller} vertical />
          <p className="text-2xs leading-relaxed text-muted-foreground">
            Lecture seule : l’agent consulte les chiffres réels et ne modifie jamais les données.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AiAgentMobile({ controller }: { controller: UseAiAgent }) {
  if (controller.statusLoading && controller.messages.length === 0) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Chargement…</span>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <StatusBanner controller={controller} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Session uniquement, non conservée</p>
        <NewConversation controller={controller} />
      </div>
      <Suggestions controller={controller} />
      <Card>
        <CardContent className="flex max-h-[28rem] min-h-[20rem] flex-col gap-3 py-4">
          <MessageList messages={controller.messages} />
          {controller.error ? <Alert variant="error">{controller.error}</Alert> : null}
          <Composer controller={controller} />
        </CardContent>
      </Card>
      <p className="text-2xs leading-relaxed text-muted-foreground">
        Lecture seule : l’agent consulte les chiffres réels et ne modifie jamais les données.
      </p>
    </div>
  );
}
