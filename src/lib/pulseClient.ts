/**
 * Pulse telemetry client for Stage apps.
 *
 * Batches events and sends them to the Pulse API via the gateway.
 * Fire-and-forget — silently drops on network failure.
 *
 * Usage:
 *   import { pulse } from '@stage/pulse';
 *   pulse.track("dashboard_loaded");
 *   pulse.track("search_executed", { query: "standup", results: 5 });
 */

export interface PulseEvent {
  name: string;
  serviceId?: string;
  sessionId?: string;
  userId?: string;
  source?: string;
  timestamp?: string;
  meta?: Record<string, string | number | boolean>;
  stageAppId?: string;
  authorEmail?: string;
}

export interface PulseClient {
  /** Track a named event with optional metadata. Fire-and-forget. */
  track(name: string, meta?: Record<string, string | number | boolean>): void;
  /** Force-flush any buffered events immediately. */
  flush(): Promise<void>;
}

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5_000;
const BATCH_ENDPOINT = "/api/v1/pulse/events/batch";

export interface AppContext {
  stageAppId?: string;
  authorEmail?: string;
}

export function createPulseClient(
  sessionId: string,
  serviceId: string,
  appContext?: AppContext,
): PulseClient {
  const buffer: PulseEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      doFlush();
    }, FLUSH_INTERVAL_MS);
  }

  function doFlush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0);
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    sendBatch(batch);
  }

  function sendBatch(events: PulseEvent[]) {
    fetch(BATCH_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    }).catch(() => {
      // Fire-and-forget: silently drop on failure
    });
  }

  return {
    track(name, meta) {
      buffer.push({
        name,
        serviceId,
        sessionId,
        source: "web",
        timestamp: new Date().toISOString(),
        meta,
        stageAppId: appContext?.stageAppId,
        authorEmail: appContext?.authorEmail,
      });

      if (buffer.length >= BATCH_SIZE) {
        doFlush();
      } else {
        scheduleFlush();
      }
    },

    async flush() {
      doFlush();
    },
  };
}
