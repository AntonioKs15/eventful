import { ApiClientError } from "./api-error";
import { getAccessToken, setAccessToken } from "./token-holder";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const HTTP_UNAUTHORIZED = 401;
const HTTP_NO_CONTENT = 204;
const FALLBACK_ERROR_MESSAGE = "We couldn't reach the server. Please try again.";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  skipAuthRetry?: boolean;
}

interface ApiErrorResponseBody {
  error?: { code?: string; message?: string; details?: unknown };
}

let inFlightRefresh: Promise<boolean> | null = null;

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function rawRequest(path: string, options: ApiRequestOptions): Promise<Response> {
  const token = getAccessToken();

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await rawRequest("/auth/refresh", { method: "POST", skipAuthRetry: true });
    if (!response.ok) {
      setAccessToken(null);
      return false;
    }

    const data = (await response.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

function tryRefreshOnce(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function parseErrorBody(response: Response): Promise<ApiErrorResponseBody | null> {
  try {
    return (await response.json()) as ApiErrorResponseBody;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, options);

  const shouldRetryAfterRefresh = response.status === HTTP_UNAUTHORIZED && !options.skipAuthRetry;
  if (shouldRetryAfterRefresh) {
    const refreshed = await tryRefreshOnce();
    if (refreshed) {
      response = await rawRequest(path, options);
    }
  }

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiClientError(
      (body?.error?.code as ApiClientError["code"]) ?? "UNKNOWN_ERROR",
      body?.error?.message ?? FALLBACK_ERROR_MESSAGE,
      body?.error?.details,
    );
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  // NestJS sends an empty body (not the literal "null") for handlers that return
  // null/undefined, even with a 200 status — response.json() would throw on that.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
