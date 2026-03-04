import { afterEach, describe, expect, test } from "bun:test";
import { createPulseClient } from "./pulseClient";

describe("createPulseClient", () => {
  const fetchCalls: { url: string; body: any }[] = [];
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchCalls.length = 0;
  });

  test("includes appContext in tracked events", async () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createPulseClient("sess-1", "svc-1", {
      stageAppId: "app-abc",
      authorEmail: "tom@example.com",
    });

    // Fill buffer to BATCH_SIZE (10) to trigger flush
    for (let i = 0; i < 10; i++) {
      client.track("test_event", { i });
    }

    // Wait for batch to be sent
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    const batch = fetchCalls[0].body.events;
    expect(batch[0].stageAppId).toBe("app-abc");
    expect(batch[0].authorEmail).toBe("tom@example.com");
    expect(batch[0].name).toBe("test_event");
    expect(batch[0].serviceId).toBe("svc-1");
    expect(batch[0].sessionId).toBe("sess-1");
  });

  test("omits appContext fields when not provided", async () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createPulseClient("sess-1", "svc-1");

    for (let i = 0; i < 10; i++) {
      client.track("test_event");
    }

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    const batch = fetchCalls[0].body.events;
    expect(batch[0].stageAppId).toBeUndefined();
    expect(batch[0].authorEmail).toBeUndefined();
  });

  test("sends to batch endpoint", async () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createPulseClient("sess-1", "svc-1", {
      stageAppId: "app-abc",
      authorEmail: "tom@example.com",
    });

    for (let i = 0; i < 10; i++) {
      client.track("ev");
    }

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchCalls[0].url).toBe("/api/v1/pulse/events/batch");
  });
});
