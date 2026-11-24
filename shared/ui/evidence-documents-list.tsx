"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LEGAL_ENTITY_TYPE_LABELS } from "@/features/organizations/contracts/organization";
import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import { parseUploadedMediaRefs } from "@/shared/api/media-upload";
import { Badge } from "@/shared/ui/badge";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/shared/ui/attachment";

const QUALIFICATION_TYPE_LABELS: Record<string, string> = {
  AC_REPAIR_INSTALL: "Sửa chữa & Lắp đặt máy lạnh",
  ELECTRICAL_REPAIR: "Sửa chữa điện dân dụng",
  WATER_HEATER_GAS: "Máy nước nóng & Thiết bị gas",
};

function isImageMedia(contentType?: string, nameOrKey?: string): boolean {
  if (contentType?.startsWith("image/")) return true;
  return Boolean(nameOrKey && /\.(png|jpe?g|webp|gif)$/i.test(nameOrKey));
}

export function EvidenceDocumentsList({
  value,
  organizationId,
  emptyText = "Chưa có tài liệu chứng minh pháp lý nào được tải lên.",
  onRemove,
  removingKey,
  disabled = false,
}: {
  value?: string | null;
  organizationId?: string;
  emptyText?: string;
  onRemove?: (objectKey: string) => void;
  removingKey?: string | null;
  disabled?: boolean;
}) {
  const items = React.useMemo(() => parseUploadedMediaRefs(value), [value]);
  const [openingKey, setOpeningKey] = React.useState<string | null>(null);
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!organizationId || items.length === 0) return;
    const imageItems = items.filter(
      (it) =>
        isImageMedia(it.contentType, it.fileName || it.objectKey) &&
        !/^https?:\/\//i.test(it.objectKey) &&
        !signedUrls[it.objectKey]
    );
    if (imageItems.length === 0) return;
    let cancelled = false;
    void Promise.all(
      imageItems.map(async (it) => {
        try {
          const res = await fetch(
            `/api/gateway/organizations/${encodeURIComponent(organizationId)}/evidence/signed-url?objectKey=${encodeURIComponent(it.objectKey)}`,
            { headers: { "x-homecare-scope": "personal" } }
          );
          if (!res.ok) return null;
          const json = (await res.json()) as ApiResponse<{ signedUrl?: string }>;
          const data = unwrapApiResponse(json);
          return data.signedUrl ? ([it.objectKey, data.signedUrl] as const) : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      if (cancelled) return;
      const updates: Record<string, string> = {};
      for (const pair of pairs) {
        if (pair) updates[pair[0]] = pair[1];
      }
      if (Object.keys(updates).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...updates }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [items, organizationId, signedUrls]);

  async function handleOpenSigned(objectKey: string) {
    if (!organizationId) return;
    const cached = signedUrls[objectKey];
    if (cached) {
      window.open(cached, "_blank", "noopener,noreferrer");
      return;
    }
    setOpeningKey(objectKey);
    try {
      const res = await fetch(
        `/api/gateway/organizations/${encodeURIComponent(organizationId)}/evidence/signed-url?objectKey=${encodeURIComponent(objectKey)}`,
        { headers: { "x-homecare-scope": "personal" } }
      );
      const json = (await res.json()) as ApiResponse<{ signedUrl?: string }>;
      const data = unwrapApiResponse(json);
      if (!data.signedUrl) {
        toast.error("Không thể tạo liên kết xem tài liệu.");
        return;
      }
      setSignedUrls((prev) => ({ ...prev, [objectKey]: data.signedUrl! }));
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể mở tài liệu."
      );
    } finally {
      setOpeningKey(null);
    }
  }

  if (items.length === 0) {
    if (value && value.trim()) {
      return (
        <p className="rounded-md border border-border-subtle bg-surface-secondary px-3 py-2 font-mono text-xs text-foreground break-all">
          {value.trim()}
        </p>
      );
    }
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div
      role="list"
      aria-label="Danh sách tài liệu đã tải lên"
      className="flex min-w-0 flex-col gap-2"
    >
      {items.map((item) => {
        const typeLabel =
          LEGAL_ENTITY_TYPE_LABELS[
            item.documentType as keyof typeof LEGAL_ENTITY_TYPE_LABELS
          ] ??
          QUALIFICATION_TYPE_LABELS[item.documentType] ??
          item.documentType;
        const isUrl = /^https?:\/\//i.test(item.objectKey);
        const previewSrc = isUrl
          ? item.objectKey
          : signedUrls[item.objectKey];
        const showThumb =
          Boolean(previewSrc) &&
          isImageMedia(item.contentType, item.fileName || item.objectKey);
        const isOpening = openingKey === item.objectKey;
        const isRemoving = removingKey === item.objectKey;

        return (
          <Attachment
            key={`${item.bucket}-${item.objectKey}`}
            size="sm"
            role="listitem"
            className="w-full rounded-lg border-border bg-surface-secondary/70"
          >
            <AttachmentMedia variant={showThumb ? "image" : "icon"}>
              {showThumb && previewSrc ? (
                <Image
                  src={previewSrc}
                  alt={item.fileName}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText aria-hidden="true" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{item.fileName}</AttachmentTitle>
              <AttachmentDescription>
                {item.contentType ?? "Tệp đính kèm"}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              {typeLabel ? (
                <Badge variant="outline" className="text-[11px]">
                  {typeLabel}
                </Badge>
              ) : null}
              {isUrl ? (
                <AttachmentAction asChild size="sm" variant="ghost">
                  <a
                    href={item.objectKey}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Xem ${item.fileName}`}
                  >
                    Xem
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AttachmentAction>
              ) : organizationId ? (
                <AttachmentAction
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isOpening || isRemoving || disabled}
                  onClick={() => void handleOpenSigned(item.objectKey)}
                  className="h-7 px-2 text-xs text-primary"
                  aria-label={`Xem ${item.fileName}`}
                >
                  {isOpening ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Xem
                </AttachmentAction>
              ) : null}
              {onRemove ? (
                <AttachmentAction
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isRemoving || disabled}
                  onClick={() => onRemove(item.objectKey)}
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={`Xóa tệp ${item.fileName}`}
                >
                  {isRemoving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </AttachmentAction>
              ) : null}
            </AttachmentActions>
          </Attachment>
        );
      })}
    </div>
  );
}
