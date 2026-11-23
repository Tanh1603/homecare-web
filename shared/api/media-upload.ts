import { unwrapApiResponse, type ApiResponse } from "./api-envelope";

export interface UploadedMediaRef {
  documentType: string;
  fileName: string;
  objectKey: string;
  bucket: string;
  contentType?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  bucket: string;
  objectKey: string;
  token?: string | null;
  expiresInSeconds: number;
  method: string;
  localFallback: boolean;
}

export async function requestPresignedUpload(
  presignUrl: string,
  input: {
    fileName: string;
    contentType: string;
    documentType?: string;
  },
  scope: "personal" | "org" = "personal"
): Promise<PresignedUploadResponse> {
  const res = await fetch(presignUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-homecare-scope": scope,
    },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<PresignedUploadResponse>;
  return unwrapApiResponse(json);
}

export async function uploadFileViaPresignedUrl(options: {
  presignUrl: string;
  file: File;
  documentType?: string;
  scope?: "personal" | "org";
}): Promise<UploadedMediaRef> {
  const { presignUrl, file, documentType = "MEDIA", scope = "personal" } = options;
  const presigned = await requestPresignedUpload(
    presignUrl,
    {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      documentType,
    },
    scope
  );
  const uploadRes = await fetch(presigned.uploadUrl, {
    method: presigned.method || "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Tải tệp "${file.name}" thất bại (${uploadRes.status}).`);
  }
  return {
    documentType,
    fileName: file.name,
    objectKey: presigned.objectKey,
    bucket: presigned.bucket,
    contentType: file.type || undefined,
  };
}

export function parseUploadedMediaRefs(raw?: string | null): UploadedMediaRef[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is UploadedMediaRef =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as UploadedMediaRef).objectKey === "string"
      );
    }
  } catch {
    // Fallback for legacy comma-separated string references
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ref) => ({
      documentType: "LEGAL_DOCUMENT",
      fileName: ref.split("/").pop() || ref,
      objectKey: ref,
      bucket: "organization-evidence",
    }));
}

export function serializeUploadedMediaRefs(refs: UploadedMediaRef[]): string {
  return refs.length > 0 ? JSON.stringify(refs) : "";
}
