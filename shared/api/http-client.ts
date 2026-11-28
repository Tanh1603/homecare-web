import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import {
  GatewayApiError,
  unwrapApiResponse,
  type ApiResponse,
} from "./api-envelope";

export const browserHttpClient = axios.create({
  baseURL: "/api/gateway",
  headers: {
    "Content-Type": "application/json",
  },
});

export function gatewayHeaders(opts?: {
  version?: number;
  personal?: boolean;
  scope?: "personal" | "organization";
  organizationId?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts?.scope) {
    headers["x-homecare-scope"] = opts.scope;
  } else if (opts?.personal) {
    headers["x-homecare-scope"] = "personal";
  }
  if (opts?.organizationId) {
    headers["X-Organization-Id"] = opts.organizationId;
  }
  if (typeof opts?.version === "number") {
    headers["If-Match"] = `"v${opts.version}"`;
  }
  return headers;
}

/**
 * Browser HTTP transport for Client Components via Next.js `/api/gateway` BFF proxy.
 * Server Components MUST continue using `gatewayFetch` (Native Fetch) in `gateway-client.ts`.
 */
export async function requestGateway<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await browserHttpClient.request<ApiResponse<T>>(config);
    if (res.status === 204 || res.data == null || (res.data as unknown) === "") {
      return undefined as T;
    }
    return unwrapApiResponse(res.data);
  } catch (err) {
    if (err instanceof GatewayApiError) {
      throw err;
    }
    if (err instanceof AxiosError) {
      const payload = err.response?.data as Partial<ApiResponse<unknown>> | undefined;
      if (payload && typeof payload === "object" && "message" in payload) {
        throw new GatewayApiError({
          message: payload.message || `Gateway HTTP ${err.response?.status ?? 500}`,
          status: payload.code || err.response?.status || 500,
          errorCode: payload.errorCode,
          traceId: payload.traceId,
          fieldErrors: payload.errors,
        });
      }
      throw new GatewayApiError({
        message: err.message || "Không thể kết nối tới HomeCare API Gateway",
        status: err.response?.status ?? 502,
        errorCode: err.response ? undefined : "GATEWAY_UNAVAILABLE",
      });
    }
    throw err;
  }
}
