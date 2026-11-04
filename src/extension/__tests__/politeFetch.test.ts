import { describe, expect, it, vi } from "vitest";
import { createPoliteFetch, type PoliteFetchOptions } from "@extension/politeFetch";

/** A fake clock: sleep() advances time, so tests can read exactly how long we waited. */
function fakeClock() {
  let time = 0;
  const waits: number[] = [];
  return {
    waits,
    now: () => time,
    sleep: async (ms: number) => {
      waits.push(ms);
      time += ms;
    }
  };
}

const respond = (status: number, headers: Record<string, string> = {}) => new Response("html", { status, headers });

function setup(responses: Response[], options: Partial<PoliteFetchOptions> = {}) {
  const clock = fakeClock();
  const fetchOnce = vi.fn(async () => responses.shift() ?? respond(200));
  const politeFetch = createPoliteFetch(fetchOnce, {
    minGapMs: 500,
    maxRetries: 2,
    backoffMs: 1000,
    maxWaitMs: 8000,
    sleep: clock.sleep,
    now: clock.now,
    ...options
  });
  return { clock, fetchOnce, politeFetch };
}

describe("createPoliteFetch", () => {
  it("leaves a gap between requests so Jumia isn't flooded", async () => {
    const { clock, politeFetch } = setup([]);
    await politeFetch("a");
    await politeFetch("b");
    await politeFetch("c");
    expect(clock.waits).toEqual([500, 500]);
  });

  it("queues requests made at the same time instead of firing them together", async () => {
    const { clock, fetchOnce, politeFetch } = setup([]);
    await Promise.all([politeFetch("a"), politeFetch("b")]);
    expect(fetchOnce).toHaveBeenCalledTimes(2);
    expect(clock.waits).toEqual([500]);
  });

  it("backs off and retries when told 'too many requests'", async () => {
    const { clock, fetchOnce, politeFetch } = setup([respond(429), respond(429), respond(200)]);
    const response = await politeFetch("a");
    expect(response.status).toBe(200);
    expect(fetchOnce).toHaveBeenCalledTimes(3);
    expect(clock.waits).toEqual([1000, 2000]);
  });

  it("follows the server's Retry-After, within a limit", async () => {
    const { clock, politeFetch } = setup([respond(429, { "Retry-After": "3" }), respond(429, { "Retry-After": "60" })]);
    await politeFetch("a");
    expect(clock.waits).toEqual([3000, 8000]);
  });

  it("gives up after the last retry and hands back the 429", async () => {
    const { fetchOnce, politeFetch } = setup([respond(429), respond(429), respond(429), respond(200)]);
    expect((await politeFetch("a")).status).toBe(429);
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });

  it("does not retry other failures", async () => {
    const { fetchOnce, politeFetch } = setup([respond(500)]);
    expect((await politeFetch("a")).status).toBe(500);
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
});
