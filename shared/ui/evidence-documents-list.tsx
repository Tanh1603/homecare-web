"use client";

import * as React from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
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
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/shared/ui/attachment";

export function EvidenceDocumentsList({
  value,
  organizationId,
  emptyText = "Chưa có tài liệu chứng minh pháp lý nào được tải lên.",
}: {
  value?: string | null;
  organizationId?: string;
  emptyText?: string;
}) {
  const items = parseUploadedMediaRefs(value);
  const [openingKey, setOpeningKey] = React.useState<string | null>(null);

  async function handleOpenSigned(objectKey: string) {
    if (!organizationId) return;
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
    <AttachmentGroup aria-label="Danh sách tài liệu đã tải lên">
      {items.map((item) => {
        const typeLabel =
          LEGAL_ENTITY_TYPE_LABELS[
            item.documentType as keyof typeof LEGAL_ENTITY_TYPE_LABELS
          ] ?? item.documentType;
        const isUrl = /^https?:\/\//i.test(item.objectKey);
        const isOpening = openingKey === item.objectKey;

        return (
          <Attachment
            key={`${item.bucket}-${item.objectKey}`}
            size="sm"
            className="max-w-full rounded-lg border-border bg-surface-secondary/70"
          >
            <AttachmentMedia>
              <FileText aria-hidden="true" />
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
                  <a href={item.objectKey} target="_blank" rel="noreferrer">
                  Xem
                  <ExternalLink className="h-3 w-3" />
                  </a>
                </AttachmentAction>
              ) : organizationId ? (
                <AttachmentAction
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isOpening}
                  onClick={() => void handleOpenSigned(item.objectKey)}
                  className="h-7 px-2 text-xs text-primary"
                >
                  {isOpening ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3" />
                  )}
                  Xem
                </AttachmentAction>
              ) : null}
            </AttachmentActions>
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}
