"use client";

import * as React from "react";
import Image from "next/image";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { GatewayApiError } from "@/shared/api/api-envelope";
import {
  parseUploadedMediaRefs,
  serializeUploadedMediaRefs,
  uploadFileViaPresignedUrl,
  type UploadedMediaRef,
} from "@/shared/api/media-upload";
import { Button } from "@/shared/ui/button";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/shared/ui/attachment";
import { Progress } from "@/shared/ui/progress";

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
  const previewUrls = React.useRef(new Map<string, string>());
  const [previewByKey, setPreviewByKey] = React.useState<Record<string, string>>({});
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const items = React.useMemo(() => parseUploadedMediaRefs(value), [value]);
  const maxBytes = maxSizeMb * 1024 * 1024;

  React.useEffect(
    () => () => {
      for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
    []
  );

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
    setUploadProgress(0);
    const selectedPreviews = files.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
    try {
      const fileProgress = files.map(() => 0);
      const uploaded = await Promise.all(
        files.map((file, index) => {
          const updateProgress = (percentage: number) => {
            fileProgress[index] = percentage;
            setUploadProgress(
              Math.round(fileProgress.reduce((sum, item) => sum + item, 0) / files.length)
            );
          };
          if (uploadFile) return uploadFile(file).then((result) => {
            updateProgress(100);
            return result;
          });
          if (!presignUrl) {
            throw new Error("Thiếu cấu hình presignUrl cho FileUploader.");
          }
          return uploadFileViaPresignedUrl({
            presignUrl,
            file,
            documentType,
            scope,
            onProgress: updateProgress,
          });
        })
      );
      if (!multiple) {
        for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
        previewUrls.current.clear();
        setPreviewByKey({});
      }
      const nextPreviews: Record<string, string> = {};
      uploaded.forEach((item, index) => {
        const previewUrl = selectedPreviews[index];
        if (previewUrl) {
          previewUrls.current.set(item.objectKey, previewUrl);
          nextPreviews[item.objectKey] = previewUrl;
          selectedPreviews[index] = null;
        }
      });
      if (Object.keys(nextPreviews).length > 0) {
        setPreviewByKey((current) =>
          multiple ? { ...current, ...nextPreviews } : nextPreviews
        );
      }
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
      selectedPreviews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function handleRemove(objectKey: string) {
    const previewUrl = previewUrls.current.get(objectKey);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrls.current.delete(objectKey);
    setPreviewByKey((current) => {
      const next = { ...current };
      delete next[objectKey];
      return next;
    });
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
          {!uploading ? (
            <Upload className="h-4 w-4" />
          ) : null}
          {uploading ? "Đang tải lên..." : buttonLabel}
        </Button>
        <span className="text-xs text-muted-foreground">{formatLabel}</span>
      </div>

      {uploading ? (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <Progress value={uploadProgress} aria-label={`Tiến độ tải lên ${uploadProgress}%`} />
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{uploadProgress}%</span>
        </div>
      ) : null}

      {items.length > 0 ? (
        <AttachmentGroup aria-label="Danh sách tệp đã tải lên">
          {items.map((item) => {
            const previewUrl = previewByKey[item.objectKey];
            return (
              <Attachment
                key={item.objectKey}
                size="sm"
                className="max-w-full rounded-lg border-border bg-muted/30"
              >
                <AttachmentMedia variant={previewUrl ? "image" : "icon"}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                    />
                  ) : (
                    <FileText aria-hidden="true" />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{item.fileName}</AttachmentTitle>
                  <AttachmentDescription>
                    {item.contentType ?? "Tệp đã tải lên"}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || uploading}
                    aria-label={`Xóa tệp ${item.fileName}`}
                    onClick={() => handleRemove(item.objectKey)}
                  >
                    <Trash2 aria-hidden="true" />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            );
          })}
        </AttachmentGroup>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
