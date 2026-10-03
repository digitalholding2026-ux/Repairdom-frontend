/* Client SSE robuste (serveur → client uniquement, sans dépendance).
 *
 * Stratégie : EventSource natif avec `withCredentials: true` d'abord
 * (cookies cross-site envoyés), bascule automatique sur fetch-streaming
 * (fetch + ReadableStream + parsing manuel) après 2 échecs consécutifs.
 * Reconnexion : backoff 1s → 2s → 4s → 8s → 16s → 30s (plafond), reset
 * après 30 s de connexion stable. Après 5 échecs consécutifs : statut
 * `polling` (les écrans réactivent leur polling existant en fallback).
 * Une connexion partagée par URL (plusieurs abonnés = un seul flux).
 * Injectabilité (`createEventSource`, `fetchImpl`) pour les tests Node.
 */

export type RealtimeStatus = 'sse' | 'polling' | 'offline';

export interface RealtimeMessage {
  type: string;
  channel: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}

export type RealtimeHandler = (message: RealtimeMessage) => void;
export type RealtimeStatusHandler = (status: RealtimeStatus) => void;

const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_BACKOFF_MS = 30000;
const STABLE_RESET_MS = 30000;
const FAILURES_BEFORE_FETCH_FALLBACK = 2;
const FAILURES_BEFORE_POLLING = 5;

interface TransportDeps {
  createEventSource?: (url: string) => EventSource;
  fetchImpl?: typeof fetch;
}

interface Connection {
  url: string;
  handlers: Set<RealtimeHandler>;
  failures: number;
  backoffIndex: number;
  useFetchTransport: boolean;
  eventSource: EventSource | null;
  abort: AbortController | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  stableTimer: ReturnType<typeof setTimeout> | null;
  open: boolean;
}

/** Découpe un buffer SSE en événements complets (+ reste). Pur et testé. */
export function parseServerSentEvents(buffer: string): { events: RealtimeMessage[]; rest: string } {
  const events: RealtimeMessage[] = [];
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }
    if (dataLines.length === 0) continue;
    try {
      const parsed = JSON.parse(dataLines.join('\n')) as Partial<RealtimeMessage>;
      if (typeof parsed.type === 'string') {
        events.push({
          type: parsed.type,
          channel: typeof parsed.channel === 'string' ? parsed.channel : '',
          payload:
            parsed.payload && typeof parsed.payload === 'object'
              ? (parsed.payload as Record<string, unknown>)
              : {},
          emittedAt: typeof parsed.emittedAt === 'string' ? parsed.emittedAt : new Date().toISOString(),
        });
      }
    } catch {
      // Trame non-JSON (ex. retry:) : ignorée sans casser le flux.
    }
  }
  return { events, rest };
}

export class SseClient {
  private readonly createEventSource: ((url: string) => EventSource) | null;
  private readonly fetchImpl: typeof fetch | null;
  private readonly connections = new Map<string, Connection>();
  private readonly statusListeners = new Set<RealtimeStatusHandler>();
  private status: RealtimeStatus = 'offline';

  constructor(deps: TransportDeps = {}) {
    this.createEventSource =
      deps.createEventSource ??
      (typeof EventSource !== 'undefined' ? (url) => new EventSource(url, { withCredentials: true }) : null);
    this.fetchImpl =
      deps.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  onStatusChange(handler: RealtimeStatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  subscribe(url: string, handler: RealtimeHandler): () => void {
    let connection = this.connections.get(url);
    if (!connection) {
      connection = {
        url,
        handlers: new Set(),
        failures: 0,
        backoffIndex: 0,
        useFetchTransport: false,
        eventSource: null,
        abort: null,
        reconnectTimer: null,
        stableTimer: null,
        open: false,
      };
      this.connections.set(url, connection);
    }
    connection.handlers.add(handler);
    if (!connection.open && !connection.reconnectTimer) {
      this.connect(connection);
    }
    const current = connection;
    return () => {
      current.handlers.delete(handler);
      if (current.handlers.size === 0) this.teardown(current);
    };
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch {
        // Un listener ne doit jamais casser le hub.
      }
    }
  }

  private connect(connection: Connection): void {
    if (connection.handlers.size === 0) return;
    this.teardownTransport(connection);
    if (!connection.useFetchTransport && this.createEventSource) {
      try {
        const source = this.createEventSource(connection.url);
        connection.eventSource = source;
        source.onopen = () => this.handleOpen(connection);
        source.onerror = () => this.handleFailure(connection);
        source.onmessage = (event) => this.dispatchMessage(connection, event.data);
        return;
      } catch {
        this.handleFailure(connection);
        return;
      }
    }
    void this.connectFetch(connection);
  }

  private async connectFetch(connection: Connection): Promise<void> {
    if (!this.fetchImpl) {
      this.handleFailure(connection);
      return;
    }
    const abort = new AbortController();
    connection.abort = abort;
    try {
      const response = await this.fetchImpl(connection.url, {
        headers: { Accept: 'text/event-stream' },
        credentials: 'include',
        signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error(`SSE fetch ${response.status}`);
      this.handleOpen(connection);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseServerSentEvents(buffer);
        buffer = parsed.rest;
        for (const message of parsed.events) this.dispatch(connection, message);
        if (connection.handlers.size === 0) break;
      }
      // Fin de flux inattendue avec abonnés : échec → reconnexion.
      if (connection.handlers.size > 0) this.handleFailure(connection);
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      this.handleFailure(connection);
    }
  }

  private dispatchMessage(connection: Connection, data: unknown): void {
    if (typeof data !== 'string') return;
    const { events } = parseServerSentEvents(`${data}\n\n`);
    for (const message of events) this.dispatch(connection, message);
  }

  private dispatch(connection: Connection, message: RealtimeMessage): void {
    for (const handler of connection.handlers) {
      try {
        handler(message);
      } catch {
        // Un abonné ne doit jamais casser le flux des autres.
      }
    }
  }

  private handleOpen(connection: Connection): void {
    connection.open = true;
    this.recomputeStatus();
    if (connection.stableTimer) clearTimeout(connection.stableTimer);
    connection.stableTimer = setTimeout(() => {
      connection.failures = 0;
      connection.backoffIndex = 0;
      connection.useFetchTransport = false;
    }, STABLE_RESET_MS);
  }

  private handleFailure(connection: Connection): void {
    connection.open = false;
    connection.failures += 1;
    if (connection.failures > FAILURES_BEFORE_FETCH_FALLBACK) {
      connection.useFetchTransport = true;
    }
    this.teardownTransport(connection);
    this.recomputeStatus();
    if (connection.failures > FAILURES_BEFORE_POLLING) return;
    const delay = BACKOFF_STEPS_MS[Math.min(connection.backoffIndex, BACKOFF_STEPS_MS.length - 1)] ?? MAX_BACKOFF_MS;
    connection.backoffIndex += 1;
    if (connection.reconnectTimer) clearTimeout(connection.reconnectTimer);
    connection.reconnectTimer = setTimeout(() => {
      if (connection.handlers.size > 0) this.connect(connection);
    }, delay);
  }

  private teardownTransport(connection: Connection): void {
    if (connection.eventSource) {
      try {
        connection.eventSource.close();
      } catch {
        // Fermeture best-effort.
      }
      connection.eventSource = null;
    }
    if (connection.abort) {
      try {
        connection.abort.abort();
      } catch {
        // Annulation best-effort.
      }
      connection.abort = null;
    }
    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
      connection.reconnectTimer = null;
    }
    if (connection.stableTimer) {
      clearTimeout(connection.stableTimer);
      connection.stableTimer = null;
    }
  }

  private teardown(connection: Connection): void {
    this.teardownTransport(connection);
    this.connections.delete(connection.url);
    this.recomputeStatus();
  }

  /* Statut global : 'sse' si au moins un flux est ouvert, 'polling' si tous
   * les flux restants ont dépassé le seuil d'échecs, 'offline' sinon
   * (aucun abonné ou échecs transitoires en backoff). */
  private recomputeStatus(): void {
    let polling = false;
    for (const connection of this.connections.values()) {
      if (connection.open) {
        this.setStatus('sse');
        return;
      }
      if (connection.failures > FAILURES_BEFORE_POLLING) polling = true;
    }
    this.setStatus(this.connections.size === 0 ? 'offline' : polling ? 'polling' : 'offline');
  }
}

/** Instance partagée par l'application (une connexion par URL). */
export const realtimeClient = new SseClient();
