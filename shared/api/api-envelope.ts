export interface FieldValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  errorCode?: string;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
  errors?: FieldValidationError[];
}

export interface PaginationMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PageResponse<T> {
  items: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export class GatewayApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly traceId?: string;
  readonly fieldErrors?: FieldValidationError[];

  constructor(params: {
    message: string;
    status: number;
    errorCode?: string;
    traceId?: string;
    fieldErrors?: FieldValidationError[];
  }) {
    super(params.message);
    this.name = "GatewayApiError";
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.traceId = params.traceId;
    this.fieldErrors = params.fieldErrors;
  }
}

export function unwrapApiResponse<T>(payload: ApiResponse<T>): T {
  if (!payload.success) {
    throw new GatewayApiError({
      message: payload.message || "Gateway request failed",
      status: payload.code || 500,
      errorCode: payload.errorCode,
      traceId: payload.traceId,
      fieldErrors: payload.errors,
    });
  }
  return payload.data;
}

export function extractPageItems<T>(
  data: { items?: T[] } | T[] | null | undefined
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.items) ? data.items : [];
}
