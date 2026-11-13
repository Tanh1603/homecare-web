import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import {
  GatewayApiError,
  unwrapApiResponse,
  type ApiResponse,
} from "./api-envelope";

export interface GatewayFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  organizationId?: string;
  idempotencyKey?: string;
  ifMatch?: string;
  headers?: Record<string, string>;
}

function createCorrelationId(): string {
  return `web-${crypto.randomUUID()}`.slice(0, 64);
}

/**
 * Server-only client for Spring Cloud Gateway (/api/v1).
 * Reads the Supabase session JWT from HttpOnly cookies and attaches standard
 * HomeCare correlation, idempotency, and optimistic-locking headers.
 */
export async function gatewayFetch<T>(
  path: string,
  options: GatewayFetchOptions = {}
): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Correlation-Id": createCorrelationId(),
    ...options.headers,
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  if (options.organizationId) {
    headers["X-Organization-Id"] = options.organizationId;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  if (options.ifMatch) {
    headers["If-Match"] = options.ifMatch;
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) {
    throw new GatewayApiError({
      message: `Gateway HTTP ${res.status}`,
      status: res.status,
    });
  }

  if (!res.ok || !json.success) {
    throw new GatewayApiError({
      message: json.message || `Gateway HTTP ${res.status}`,
      status: json.code || res.status,
      errorCode: json.errorCode,
      traceId: json.traceId,
      fieldErrors: json.errors,
    });
  }

  return unwrapApiResponse(json);
}
