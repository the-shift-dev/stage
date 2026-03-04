/**
 * Ledger audit client for Stage apps.
 *
 * Provides explicit audit trail control for apps that want to log
 * data access events beyond the automatic proxy instrumentation.
 * Fire-and-forget — silently drops on network failure.
 *
 * Usage:
 *   import { ledger } from '@stage/ledger';
 *   ledger.audit("read", { source: { service: "google-calendar" } });
 *   ledger.auditPiiRead(["attendee.email", "organizer.email"], {
 *     source: { service: "google-calendar" }
 *   });
 */

export interface AuditOptions {
  source?: { service: string; location?: string };
  destination?: { service: string; location?: string };
  dataRefs?: Array<{ field: string; classification: "pii" | "sensitive" | "internal" | "public" }>;
  status?: "pass" | "fail" | "warn";
  meta?: Record<string, string | number | boolean>;
}

export interface LedgerClient {
  /** Log an audit event with a given operation type. Fire-and-forget. */
  audit(
    operation: "read" | "write" | "transform" | "delete" | "share" | "export",
    opts?: AuditOptions,
  ): void;

  /** Convenience: log a PII read with field names auto-classified as "pii". */
  auditPiiRead(
    fields: string[],
    opts?: Omit<AuditOptions, "dataRefs">,
  ): void;
}

const LEDGER_ENDPOINT = "/api/v1/ledger/events";

export interface AppContext {
  stageAppId?: string;
  authorEmail?: string;
}

export function createLedgerClient(
  sessionId: string,
  serviceId: string,
  actorEmail?: string,
  appContext?: AppContext,
): LedgerClient {
  function send(body: Record<string, unknown>) {
    fetch(LEDGER_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // Fire-and-forget: silently drop on failure
    });
  }

  function buildEvent(
    operation: string,
    opts?: AuditOptions,
  ): Record<string, unknown> {
    return {
      operation,
      serviceId,
      actor: actorEmail || "unknown",
      actorType: "user",
      timestamp: new Date().toISOString(),
      source: opts?.source,
      destination: opts?.destination,
      dataRefs: opts?.dataRefs ?? [],
      status: opts?.status ?? "pass",
      meta: {
        stageSessionId: sessionId,
        ...opts?.meta,
      },
      stageAppId: appContext?.stageAppId,
      authorEmail: appContext?.authorEmail,
    };
  }

  return {
    audit(operation, opts) {
      send(buildEvent(operation, opts));
    },

    auditPiiRead(fields, opts) {
      const dataRefs = fields.map((field) => ({
        field,
        classification: "pii" as const,
      }));
      send(buildEvent("read", { ...opts, dataRefs }));
    },
  };
}
