"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";

export default function OrganizationWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/organizations">
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách tổ chức
        </Link>
      </Button>
      <ErrorState
        title="Không thể hiển thị không gian tổ chức"
        message={
          error?.message ||
          "Đã xảy ra sự cố khi tải dữ liệu tổ chức đối tác. Vui lòng thử lại."
        }
        onRetry={reset}
      />
    </div>
  );
}
