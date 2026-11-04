export interface PoliteFetchOptions {
  /** Minimum time between the start of one request and the next. */
  minGapMs: number;
  /** Extra attempts after an HTTP 429 "too many requests". */
  maxRetries: number;
  /** First back-off when the server gives no Retry-After; doubles each retry. */
  backoffMs: number;
  /** Never wait longer than this for one retry, whatever Retry-After says. */
  maxWaitMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wraps fetch so AltPadi behaves like a considerate visitor: one request at a time, a small gap
 * between them, and a back-off when Jumia answers 429. Jumia rate-limits bursts, and a burst is
 * exactly what a search (several result pages, then several product pages) would otherwise be.
 */
export function createPoliteFetch(
  fetchOnce: (url: string) => Promise<Response>,
  options: PoliteFetchOptions
): (url: string) => Promise<Response> {
  const { minGapMs, maxRetries, backoffMs, maxWaitMs, sleep = defaultSleep, now = Date.now } = options;
  let lastStart: number | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function send(url: string): Promise<Response> {
    if (lastStart !== undefined) {
      const wait = lastStart + minGapMs - now();
      if (wait > 0) await sleep(wait);
    }
    lastStart = now();
    return fetchOnce(url);
  }

  async function withRetries(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response = await send(url);
      if (response.status !== 429 || attempt >= maxRetries) return response;
      await sleep(Math.min(retryAfterMs(response) ?? backoffMs * 2 ** attempt, maxWaitMs));
    }
  }

  return (url) => {
    const result = queue.then(() => withRetries(url));
    queue = result.catch(() => {});
    return result;
  };
}

function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}
