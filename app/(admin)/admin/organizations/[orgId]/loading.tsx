export default function OrganizationWorkspaceLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Đang tải không gian tổ chức">
      <div className="rounded-xl border border-border bg-surface px-5 py-4 space-y-3">
        <div className="h-3.5 w-44 rounded bg-secondary" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-64 rounded bg-secondary" />
            <div className="h-3.5 w-80 rounded bg-secondary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-secondary" />
            <div className="h-8 w-8 rounded-lg bg-secondary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <div className="hidden lg:block rounded-xl border border-border bg-surface p-2 space-y-1.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-8 rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-24 rounded-xl border border-border bg-surface" />
          <div className="h-64 rounded-xl border border-border bg-surface" />
        </div>
      </div>
    </div>
  );
}
