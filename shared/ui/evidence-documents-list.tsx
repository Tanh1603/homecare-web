"use client";

import * as React from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LEGAL_ENTITY_TYPE_LABELS } from "@/features/organizations/contracts/organization";
import { unwrapApiResponse, type ApiResponse } from "@/shared/api/api-envelope";
import { parseUploadedMediaRefs } from "@/shared/api/media-upload";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

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
    <ul className="space-y-2">
      {items.map((item) => {
        const typeLabel =
          LEGAL_ENTITY_TYPE_LABELS[
            item.documentType as keyof typeof LEGAL_ENTITY_TYPE_LABELS
          ] ?? item.documentType;
        const isUrl = /^https?:\/\//i.test(item.objectKey);
        const isOpening = openingKey === item.objectKey;

        return (
          <li
            key={`${item.bucket}-${item.objectKey}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary/70 px-3 py-2 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <FileText
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {item.fileName}
                </p>
                {item.contentType ? (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.contentType}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {typeLabel ? (
                <Badge variant="outline" className="text-[11px]">
                  {typeLabel}
                </Badge>
              ) : null}
              {isUrl ? (
                <a
                  href={item.objectKey}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-2"
                >
                  Xem
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : organizationId ? (
                <Button
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
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
