"use client";

import * as React from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { GatewayApiError } from "@/shared/api/api-envelope";
import {
  parseUploadedMediaRefs,
  serializeUploadedMediaRefs,
  uploadFileViaPresignedUrl,
  type UploadedMediaRef,
} from "@/shared/api/media-upload";
import { Button } from "@/shared/ui/button";

const DEFAULT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export interface FileUploaderProps {
  value: string;
  onChange: (nextValue: string) => void;
  presignUrl?: string;
  uploadFile?: (file: File) => Promise<UploadedMediaRef>;
  documentType?: string;
  scope?: "personal" | "org";
  hint?: string;
  accept?: string;
  allowedMimeTypes?: string[];
  maxSizeMb?: number;
  multiple?: boolean;
  inputLabel?: string;
  buttonLabel?: string;
  formatLabel?: string;
  disabled?: boolean;
  error?: string;
  onAuthRequired?: () => void;
}

export function FileUploader({
  value,
  onChange,
  presignUrl,
  uploadFile,
  documentType = "MEDIA",
  scope = "personal",
  hint,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp",
  allowedMimeTypes = DEFAULT_MIME_TYPES,
  maxSizeMb = 10,
  multiple = true,
  inputLabel = "Chọn tệp tải lên",
  buttonLabel = "Tải tệp lên",
  formatLabel = `PDF, JPG, PNG, WEBP · Tối đa ${maxSizeMb}MB/tệp`,
  disabled,
  error,
  onAuthRequired,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const items = React.useMemo(() => parseUploadedMediaRefs(value), [value]);
  const maxBytes = maxSizeMb * 1024 * 1024;

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
        toast.error(`Định dạng "${file.name}" chưa được hỗ trợ.`);
        return;
      }
      if (file.size > maxBytes) {
        toast.error(`Tệp "${file.name}" vượt quá giới hạn ${maxSizeMb}MB.`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploader =
        uploadFile ??
        ((file: File) => {
          if (!presignUrl) {
            throw new Error("Thiếu cấu hình presignUrl cho FileUploader.");
          }
          return uploadFileViaPresignedUrl({
            presignUrl,
            file,
            documentType,
            scope,
          });
        });

      const uploaded = await Promise.all(files.map(uploader));
      const next = multiple ? [...items, ...uploaded] : uploaded.slice(0, 1);
      onChange(serializeUploadedMediaRefs(next));
      toast.success(`Đã tải lên ${uploaded.length} tệp.`);
    } catch (err) {
      if (err instanceof GatewayApiError && err.status === 401) {
        onAuthRequired?.();
        toast.error("Vui lòng đăng nhập trước khi tải tệp.");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Không thể tải tệp lên."
        );
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(objectKey: string) {
    const next = items.filter((item) => item.objectKey !== objectKey);
    onChange(serializeUploadedMediaRefs(next));
  }

  return (
    <div className="space-y-3">
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => void handleFilesSelected(e)}
          disabled={disabled || uploading}
          aria-label={inputLabel}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Đang tải lên..." : buttonLabel}
        </Button>
        <span className="text-xs text-muted-foreground">{formatLabel}</span>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-2" aria-label="Danh sách tệp đã tải lên">
          {items.map((item) => (
            <li
              key={item.objectKey}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-medium text-foreground">
                  {item.fileName}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || uploading}
                aria-label={`Xóa tệp ${item.fileName}`}
                onClick={() => handleRemove(item.objectKey)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
