type ReliabilityEvent = {
  eventType: "browser.error" | "browser.rejection" | "network.error" | "recovery.success";
  message: string;
  stack?: string;
  route?: string;
  browser?: string;
  release?: string;
  requestUrl?: string;
  statusCode?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

const EVENT_ENDPOINT = "/api/reliability/events";
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4_000;
const MAX_URL_LENGTH = 500;
const MAX_METADATA_KEYS = 12;
const SENSITIVE_KEY = /password|passwd|cookie|token|secret|authorization|credential|body|payload|query|api[-_]?key/i;

let installed = false;
let reporting = false;
const failedRequests = new Map<string, number>();

function trim(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanPath(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin === window.location.origin ? "" : url.origin}${url.pathname}`.slice(0, MAX_URL_LENGTH);
  } catch {
    return value.split(/[?#]/, 1)[0].slice(0, MAX_URL_LENGTH);
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, MAX_METADATA_KEYS)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string") result[key.slice(0, 60)] = value.slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) result[key.slice(0, 60)] = value;
    else if (typeof value === "boolean") result[key.slice(0, 60)] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function route() {
  return window.location.pathname.slice(0, 300);
}

function report(event: ReliabilityEvent) {
  if (reporting || event.requestUrl?.includes(EVENT_ENDPOINT)) return;
  reporting = true;
  const payload = {
    ...event,
    message: trim(event.message, MAX_MESSAGE_LENGTH) || "Unknown browser reliability event",
    stack: trim(event.stack, MAX_STACK_LENGTH) || undefined,
    route: trim(event.route, 300) || route(),
    browser: navigator.userAgent.slice(0, 120),
    release: (import.meta.env.VITE_RELEASE || import.meta.env.MODE || "development").slice(0, 120),
    requestUrl: event.requestUrl ? cleanPath(event.requestUrl) : undefined,
    metadata: sanitizeMetadata(event.metadata),
  };

  void window.fetch(EVENT_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined).finally(() => {
    reporting = false;
  });
}

function requestKey(input: RequestInfo | URL) {
  const value = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return cleanPath(value);
}

export function installBrowserReliabilityCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    report({
      eventType: "browser.error",
      message: event.message || "Unhandled browser error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      metadata: { source: "window.error", filename: event.filename || undefined },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason : String(event.reason ?? "Unhandled promise rejection");
    report({
      eventType: "browser.rejection",
      message: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      metadata: { source: "window.unhandledrejection" },
    });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const key = requestKey(input);
    if (key.includes(EVENT_ENDPOINT)) return originalFetch(input, init);
    const startedAt = performance.now();
    try {
      const response = await originalFetch(input, init);
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      if (!response.ok) {
        failedRequests.set(key, Date.now());
        report({
          eventType: "network.error",
          message: `Request failed with HTTP ${response.status}`,
          requestUrl: key,
          statusCode: response.status,
          durationMs,
          metadata: { source: "fetch", method: init?.method || "GET" },
        });
      } else if (failedRequests.has(key)) {
        failedRequests.delete(key);
        report({
          eventType: "recovery.success",
          message: "Request recovered after a previous failure",
          requestUrl: key,
          statusCode: response.status,
          durationMs,
          metadata: { source: "fetch", method: init?.method || "GET" },
        });
      }
      return response;
    } catch (error) {
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      failedRequests.set(key, Date.now());
      report({
        eventType: "network.error",
        message: error instanceof Error ? error.message : "Network request failed",
        stack: error instanceof Error ? error.stack : undefined,
        requestUrl: key,
        durationMs,
        metadata: { source: "fetch", method: init?.method || "GET" },
      });
      throw error;
    }
  };
}