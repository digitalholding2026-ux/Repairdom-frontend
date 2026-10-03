/* Client SSE : parser, reconnexion, bascule polling, cleanup.
 *   node --test src/lib/realtime/sse-client.test.ts
 * Transports injectés (aucun réseau réel, timers mockés Node).
 */

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { SseClient, parseServerSentEvents } from './sse-client.ts';

void test('parser : commentaires ignorés, multi-data joints, reste conservé', () => {
  const { events, rest } = parseServerSentEvents(
    ': ping\n\nevent: mission.message_created\ndata: {"type":"mission.message_created","channel":"mission:d-1","payload":{"a":1}}\n\nevent: x\ndata: {"type":',
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, 'mission.message_created');
  assert.equal(events[0]?.channel, 'mission:d-1');
  assert.deepEqual(events[0]?.payload, { a: 1 });
  assert.ok(rest.includes('"type":'));
});

void test('parser : JSON invalide ignoré sans casser le flux', () => {
  const { events } = parseServerSentEvents('event: x\ndata: not-json\n\n');
  assert.equal(events.length, 0);
});

interface FakeSource {
  onopen: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  closed: boolean;
  fail(): void;
  succeed(): void;
  push(type: string, payload: unknown): void;
  close(): void;
}

function fakeEventSourceFactory(scenarios: Array<'fail' | 'ok'>) {
  const created: FakeSource[] = [];
  let calls = 0;
  const createEventSource = () => {
    calls += 1;
    const behavior = scenarios[Math.min(calls - 1, scenarios.length - 1)] ?? 'fail';
    const source: FakeSource = {
      onopen: null,
      onerror: null,
      onmessage: null,
      closed: false,
      fail() {
        this.onerror?.();
      },
      succeed() {
        this.onopen?.();
      },
      push(type, payload) {
        this.onmessage?.({
          data: `event: ${type}\ndata: ${JSON.stringify({ type, channel: 'c', payload })}\n\n`,
        });
      },
      close() {
        this.closed = true;
      },
    };
    created.push(source);
    if (behavior === 'fail') {
      queueMicrotask(() => source.fail());
    } else {
      queueMicrotask(() => source.succeed());
    }
    return source as unknown as EventSource;
  };
  return { createEventSource, created, calls: () => calls };
}

void test('reconnexion : 2 échecs ES (1s, 2s) puis fetch-streaming OK', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const factory = fakeEventSourceFactory(['fail']);
    const encoder = new TextEncoder();
    const fetchImpl = (async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: mission.message_created\ndata: {"type":"mission.message_created","channel":"mission:d-1","payload":{}}\n\n',
            ),
          );
        },
      });
      return { ok: true, body: stream };
    }) as unknown as typeof fetch;
    const client = new SseClient({ createEventSource: factory.createEventSource, fetchImpl });
    const received: string[] = [];
    const statuses: string[] = [];
    client.onStatusChange((status) => statuses.push(status));
    const unsubscribe = client.subscribe('https://api/x', (message) => received.push(message.type));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(factory.calls(), 1);
    mock.timers.tick(1000);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(factory.calls(), 2);
    // 4e tentative : transport fetch (bascule auto après 3 échecs ES).
    mock.timers.tick(2000);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(factory.calls(), 3);
    mock.timers.tick(4000);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(factory.calls(), 3);
    assert.equal(client.getStatus(), 'sse');
    assert.deepEqual(received, ['mission.message_created']);
    assert.ok(!statuses.includes('polling'));
    unsubscribe();
    assert.equal(client.getStatus(), 'offline');
  } finally {
    mock.timers.reset();
  }
});

void test('après 5 échecs : bascule polling', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    // Toujours en échec, sans fetch (transport ES seul).
    const factory = fakeEventSourceFactory(['fail']);
    const client = new SseClient({
      createEventSource: factory.createEventSource,
      fetchImpl: (async () => {
        throw new Error('réseau coupé');
      }) as unknown as typeof fetch,
    });
    const statuses: string[] = [];
    client.onStatusChange((status) => statuses.push(status));
    const unsubscribe = client.subscribe('https://api/x', () => undefined);
    // 1s, 2s, 4s, 8s, 16s, 30s : 7 échecs (ES puis fetch) → polling.
    for (const ms of [1000, 2000, 4000, 8000, 16000, 30000]) {
      mock.timers.tick(ms);
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(client.getStatus(), 'polling');
    assert.ok(statuses.includes('polling'));
    unsubscribe();
  } finally {
    mock.timers.reset();
  }
});

void test('unsubscribe : fermeture et plus de reconnexion', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const factory = fakeEventSourceFactory(['fail']);
    const client = new SseClient({ createEventSource: factory.createEventSource });
    const unsubscribe = client.subscribe('https://api/x', () => undefined);
    await new Promise((resolve) => setImmediate(resolve));
    const callsAfterFirstFailure = factory.calls();
    unsubscribe();
    mock.timers.tick(60000);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(factory.calls(), callsAfterFirstFailure);
    assert.equal(client.getStatus(), 'offline');
  } finally {
    mock.timers.reset();
  }
});
