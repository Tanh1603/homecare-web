import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function ServerPagination({
  page,
  totalPages,
  totalItems,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1 && totalItems === 0) return null;

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        if (v && k !== "page") params.set(k, v);
      }
    }
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
      <span>
        Trang <strong className="text-foreground">{page}</strong> /{" "}
        <strong className="text-foreground">{Math.max(1, totalPages)}</strong>{" "}
        ({totalItems} bản ghi)
      </span>
      <div className="flex items-center gap-2">
        {prevDisabled ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Link>
          </Button>
        )}
        {nextDisabled ? (
          <Button variant="outline" size="sm" disabled>
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page + 1)}>
              Sau
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
