"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { reviewsHttpApi, type AdminReviewItem } from "../api/reviews.http";
import type { PaginationMeta } from "@/shared/api/api-envelope";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { StatusBadge } from "@/shared/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDate, formatShortId } from "@/shared/lib/utils";

export function AdminReviewsPanel({
  initialItems,
  initialPagination,
  initialError = null,
}: {
  initialItems: AdminReviewItem[];
  initialPagination: PaginationMeta;
  initialError?: string | null;
}) {
  const [items, setItems] = React.useState<AdminReviewItem[]>(initialItems);
  const [pagination, setPagination] = React.useState<PaginationMeta>(initialPagination);
  const [loadError, setLoadError] = React.useState<string | null>(initialError);
  const [loading, setLoading] = React.useState(false);
  const [resyncing, setResyncing] = React.useState(false);

  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [ratingFilter, setRatingFilter] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [hideTarget, setHideTarget] = React.useState<AdminReviewItem | null>(null);
  const [hideReason, setHideReason] = React.useState("");
  const [restoreTarget, setRestoreTarget] = React.useState<AdminReviewItem | null>(null);
  const [restoreNote, setRestoreNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function fetchReviews(page = 1) {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await reviewsHttpApi.adminListServiceReviews({
        status: statusFilter,
        rating: ratingFilter ? Number(ratingFilter) : null,
        providerId: providerFilter.trim() || undefined,
        q: searchQuery.trim() || undefined,
        page,
        size: pagination.size || 20,
      });
      setItems(next.items);
      setPagination(next.pagination);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không thể tải danh sách đánh giá.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void fetchReviews(1);
  }

  async function handleHideSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hideTarget) return;
    if (hideReason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do ẩn tối thiểu 5 ký tự.");
      return;
    }
    setSaving(true);
    try {
      const updated = await reviewsHttpApi.adminHideServiceReview(
        hideTarget.id,
        hideReason.trim(),
        hideTarget.version
      );
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success("Đã ẩn đánh giá và đồng bộ lại điểm Provider.");
      setHideTarget(null);
      setHideReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể ẩn đánh giá.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restoreTarget) return;
    setSaving(true);
    try {
      const updated = await reviewsHttpApi.adminRestoreServiceReview(
        restoreTarget.id,
        restoreNote.trim() || undefined,
        restoreTarget.version
      );
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success("Đã khôi phục đánh giá và đồng bộ lại điểm Provider.");
      setRestoreTarget(null);
      setRestoreNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể khôi phục đánh giá.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResync(providerId?: string) {
    setResyncing(true);
    try {
      const result = await reviewsHttpApi.adminResyncRating(providerId);
      toast.success(`Đã phát tín hiệu đồng bộ cho ${result.resyncedProviders} đối tác.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đồng bộ điểm thất bại.");
    } finally {
      setResyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span className="text-destructive">{loadError}</span>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void fetchReviews(pagination.page)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </Button>
        </Card>
      ) : null}

      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-5">
          <Input
            aria-label="Tìm đánh giá"
            placeholder="Tìm nội dung, khách hàng, Booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:col-span-2"
          />
          <NativeSelect
            aria-label="Lọc trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <NativeSelectOption value="ALL">Tất cả trạng thái</NativeSelectOption>
            <NativeSelectOption value="PUBLISHED">Đang hiển thị (PUBLISHED)</NativeSelectOption>
            <NativeSelectOption value="HIDDEN">Đã ẩn (HIDDEN)</NativeSelectOption>
            <NativeSelectOption value="DELETED">Đã xóa (DELETED)</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Lọc số sao"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <NativeSelectOption value="">Tất cả số sao</NativeSelectOption>
            <NativeSelectOption value="5">5 sao</NativeSelectOption>
            <NativeSelectOption value="4">4 sao</NativeSelectOption>
            <NativeSelectOption value="3">3 sao</NativeSelectOption>
            <NativeSelectOption value="2">2 sao</NativeSelectOption>
            <NativeSelectOption value="1">1 sao</NativeSelectOption>
          </NativeSelect>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={loading} className="flex-1">
              <Search className="h-3.5 w-3.5" />
              Lọc
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={resyncing}
              onClick={() => void handleResync(providerFilter.trim() || undefined)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
              Resync Rating
            </Button>
          </div>
          <Input
            aria-label="Lọc Provider ID"
            placeholder="Lọc theo Provider UUID (tùy chọn)..."
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="md:col-span-2 font-mono text-xs"
          />
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Không có đánh giá dịch vụ nào"
          description="Thử thay đổi bộ lọc trạng thái, số sao hoặc từ khóa tìm kiếm."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking / Provider</TableHead>
                  <TableHead>Khách hàng &amp; Nội dung</TableHead>
                  <TableHead>Nhật ký kiểm duyệt</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      <p>BK #{formatShortId(r.bookingId)}</p>
                      <p className="text-muted-foreground">PRV #{formatShortId(r.providerId)}</p>
                      <button
                        type="button"
                        className="mt-1 text-[11px] font-sans font-medium text-primary hover:underline"
                        disabled={resyncing}
                        onClick={() => void handleResync(r.providerId)}
                      >
                        Đồng bộ Provider này
                      </button>
                    </TableCell>
                    <TableCell className="max-w-md text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 tabular-nums">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          {r.rating}/5
                        </span>
                        <span className="font-medium">{r.authorName || formatShortId(r.authorProfileId)}</span>
                        {r.editCount > 0 ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Đã sửa ({r.editCount}/1)
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{r.comment}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                        Gửi lúc {formatDate(r.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {r.hiddenReason ? (
                        <div>
                          <p className="font-medium text-foreground">Lý do ẩn: {r.hiddenReason}</p>
                          <p className="tabular-nums">
                            Ẩn bởi {formatShortId(r.hiddenBy ?? "")} {r.hiddenAt ? `· ${formatDate(r.hiddenAt)}` : ""}
                          </p>
                        </div>
                      ) : null}
                      {r.restoredAt ? (
                        <p className="mt-1 text-emerald-700 tabular-nums">
                          Khôi phục bởi {formatShortId(r.restoredBy ?? "")} · {formatDate(r.restoredAt)}
                          {r.restoreNote ? ` (${r.restoreNote})` : ""}
                        </p>
                      ) : null}
                      {!r.hiddenReason && !r.restoredAt ? "—" : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {r.status === "PUBLISHED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setHideTarget(r);
                            setHideReason("");
                          }}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Ẩn đánh giá
                        </Button>
                      ) : r.status === "HIDDEN" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRestoreTarget(r);
                            setRestoreNote("");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Khôi phục
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không khả dụng</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              Trang {pagination.page} / {Math.max(1, pagination.totalPages)} · Tổng {pagination.totalItems} đánh giá
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || pagination.page <= 1}
                onClick={() => void fetchReviews(pagination.page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trước
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() => void fetchReviews(pagination.page + 1)}
              >
                Sau
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <FormDrawer
        open={Boolean(hideTarget)}
        onClose={() => setHideTarget(null)}
        title={`Ẩn đánh giá #${formatShortId(hideTarget?.id ?? "")}`}
        description="Đánh giá sẽ chuyển sang HIDDEN (không xóa vật lý), bị loại khỏi danh sách công khai và cập nhật lại điểm trung bình Provider (D-31)."
        isDirty={Boolean(hideReason.trim())}
        saving={saving}
        submitLabel="Xác nhận ẩn"
        onSubmit={handleHideSubmit}
      >
        <FormSection title="Lý do kiểm duyệt">
          <FormField label="Lý do ẩn bắt buộc (tối thiểu 5 ký tự)" htmlFor="rev-hide-reason" required>
            <Input
              id="rev-hide-reason"
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="VD: Ngôn từ xúc phạm / spam không đúng sự thật"
            />
          </FormField>
        </FormSection>
      </FormDrawer>

      <FormDrawer
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title={`Khôi phục đánh giá #${formatShortId(restoreTarget?.id ?? "")}`}
        description="Đưa đánh giá trở lại trạng thái PUBLISHED và đồng bộ lại điểm trung bình Provider."
        isDirty={Boolean(restoreNote.trim())}
        saving={saving}
        submitLabel="Khôi phục đánh giá"
        onSubmit={handleRestoreSubmit}
      >
        <FormSection title="Ghi chú khôi phục">
          <FormField label="Ghi chú kiểm toán (tùy chọn)" htmlFor="rev-restore-note">
            <Input
              id="rev-restore-note"
              value={restoreNote}
              onChange={(e) => setRestoreNote(e.target.value)}
              placeholder="VD: Đã xác minh lại nội dung hợp lệ"
            />
          </FormField>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
