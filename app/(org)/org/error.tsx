"use client";

import { ErrorState } from "@/shared/ui/error-state";

export default function OrgPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Không thể tải dữ liệu tổ chức"
      message={error.message}
      onRetry={reset}
    />
  );
}
