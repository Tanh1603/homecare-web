"use client";

import { ErrorState } from "@/shared/ui/error-state";

export default function AdminPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Không thể tải dữ liệu quản trị"
      message={error.message}
      onRetry={reset}
    />
  );
}
