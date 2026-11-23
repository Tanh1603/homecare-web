"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

export function ErrorState({
  title = "Không thể tải dữ liệu",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-card px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {message || "Đã xảy ra lỗi khi kết nối tới HomeCare API Gateway. Vui lòng thử lại."}
      </p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      ) : null}
    </div>
  );
}
