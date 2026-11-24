import { Skeleton } from "@/shared/ui/skeleton";

export default function OrganizationWorkspaceLoading() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      role="status"
      aria-label="Đang tải không gian tổ chức"
    >
      <div className="rounded-xl border border-border bg-surface px-5 py-4 space-y-3">
        <Skeleton className="h-3.5 w-44" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <div className="hidden lg:block rounded-xl border border-border bg-surface p-2 space-y-1.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
