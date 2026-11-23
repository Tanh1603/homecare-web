import { ExternalLink, FileText } from "lucide-react";
import { LEGAL_ENTITY_TYPE_LABELS } from "@/features/organizations/contracts/organization";
import { parseUploadedMediaRefs } from "@/shared/api/media-upload";
import { Badge } from "@/shared/ui/badge";

export function EvidenceDocumentsList({
  value,
  emptyText = "Chưa có tài liệu chứng minh pháp lý nào được tải lên.",
}: {
  value?: string | null;
  emptyText?: string;
}) {
  const items = parseUploadedMediaRefs(value);

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
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {item.objectKey}
                </p>
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
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
