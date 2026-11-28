"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { warrantiesHttpApi, type WarrantyClaimItem } from "../api/warranties.http";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatDate, formatShortId } from "@/shared/lib/utils";

const ORG_CLAIMS_KEY = ["org", "warranty-claims"] as const;

/**
 * Org Partner incoming WarrantyClaims panel (D-05, D-14, D-28, D-30).
 * Providers may submit authorization evidence and respond to WORKMANSHIP claims
 * (accept -> spawns 0 VND REWORK Booking), but NEVER self-verify manufacturer status.
 */
export function OrgWarrantyClaimsPanel() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = React.useState<WarrantyClaimItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [evidenceTarget, setEvidenceTarget] = React.useState<WarrantyClaimItem | null>(null);
  const [evidenceRef, setEvidenceRef] = React.useState("");

  const claimsQuery = useQuery({
    queryKey: ORG_CLAIMS_KEY,
    queryFn: () => warrantiesHttpApi.orgListClaims(),
    retry: false,
  });

  const respondMutation = useMutation({
    mutationFn: (vars: {
      claimId: string;
      accepted: boolean;
      rejectionReason?: string;
      version?: number;
    }) =>
      warrantiesHttpApi.orgRespondClaim(
        vars.claimId,
        { accepted: vars.accepted, rejectionReason: vars.rejectionReason },
        vars.version
      ),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<WarrantyClaimItem[]>(ORG_CLAIMS_KEY, (prev = []) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      if (vars.accepted) {
        toast.success(
          updated.reworkBookingId
            ? `Đã chấp nhận bảo hành & tạo lịch REWORK 0 VND (${formatShortId(updated.reworkBookingId)})`
            : "Đã chấp nhận yêu cầu bảo hành"
        );
      } else {
        toast.success("Đã từ chối yêu cầu bảo hành (không tự tạo đơn trả phí — D-05)");
        setRejectTarget(null);
        setRejectReason("");
      }
    },
    onError: (err, vars) => {
      toast.error(
        err instanceof Error
          ? err.message
          : vars.accepted
            ? "Không thể chấp nhận yêu cầu"
            : "Từ chối thất bại"
      );
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: (vars: { claimId: string; evidenceRef: string }) =>
      warrantiesHttpApi.orgAppendClaimEvidence(vars.claimId, {
        evidenceKind: "AUTHORIZATION",
        evidenceRef: vars.evidenceRef,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<WarrantyClaimItem[]>(ORG_CLAIMS_KEY, (prev = []) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      toast.success("Đã nộp bằng chứng ủy quyền (chờ Admin xác minh theo D-14)");
      setEvidenceTarget(null);
      setEvidenceRef("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể nộp bằng chứng");
    },
  });

  const claims = React.useMemo(() => claimsQuery.data ?? [], [claimsQuery.data]);
  const saving = respondMutation.isPending || evidenceMutation.isPending;

  const columns = React.useMemo<DataTableColumn<WarrantyClaimItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã Claim",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{formatShortId(row.original.id)}</span>
        ),
      },
      {
        accessorKey: "warrantyCategory",
        header: "Loại BH",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.warrantyCategory}</span>
        ),
      },
      {
        accessorKey: "issueDescription",
        header: "Mô tả sự cố",
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-xs">
            {row.original.issueDescription}
          </span>
        ),
      },
      {
        accessorKey: "claimStatus",
        header: "Trạng thái",
        cell: ({ row }) => <StatusBadge status={row.original.claimStatus} />,
      },
      {
        accessorKey: "reportedAt",
        header: "Ngày báo",
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.reportedAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const c = row.original;
          const canRespond =
            c.claimStatus === "SUBMITTED" || c.claimStatus === "PENDING_VERIFICATION";
          return (
            <div className="space-x-1.5 text-right">
              {canRespond && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={saving}
                    onClick={() =>
                      respondMutation.mutate({
                        claimId: c.id,
                        accepted: true,
                        version: c.version,
                      })
                    }
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setRejectTarget(c);
                      setRejectReason("");
                    }}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Từ chối
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEvidenceTarget(c);
                  setEvidenceRef("");
                }}
              >
                <FileUp className="mr-1 h-3.5 w-3.5" />
                Nộp bằng chứng
              </Button>
            </div>
          );
        },
      },
    ],
    [respondMutation, saving]
  );

  if (claimsQuery.isPending) {
    return null;
  }

  function handleRejectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    respondMutation.mutate({
      claimId: rejectTarget.id,
      accepted: false,
      rejectionReason: rejectReason.trim(),
      version: rejectTarget.version,
    });
  }

  function handleEvidenceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!evidenceTarget || !evidenceRef.trim()) return;
    evidenceMutation.mutate({
      claimId: evidenceTarget.id,
      evidenceRef: evidenceRef.trim(),
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Yêu cầu Bảo hành đến Tổ chức (SLA 48h)</h2>
        <p className="text-xs text-muted-foreground">
          Chấp nhận claim bảo hành tay nghề sẽ tự động tạo lịch REWORK 0 VND (D-30). Xác minh bảo hành hãng do Admin thực hiện (D-14).
        </p>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Chưa có yêu cầu bảo hành nào"
          description="Khi khách hàng gửi yêu cầu bảo hành tay nghề hoặc linh kiện, yêu cầu sẽ xuất hiện tại đây."
        />
      ) : (
        <DataTable
          hideSearch
          serverSide
          data={claims}
          columns={columns}
        />
      )}

      <FormDrawer
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Từ chối yêu cầu bảo hành"
        description="Ghi rõ lý do từ chối. Hệ thống không tự chuyển sang sửa chữa trả phí."
        onSubmit={handleRejectSubmit}
        saving={saving}
        submitLabel="Xác nhận từ chối"
      >
        <FormSection title="Lý do từ chối">
          <FormField label="Lý do (bắt buộc)">
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Lỗi ngoài hạng mục công việc đã thực hiện"
            />
          </FormField>
        </FormSection>
      </FormDrawer>

      <FormDrawer
        open={Boolean(evidenceTarget)}
        onClose={() => setEvidenceTarget(null)}
        title="Nộp bằng chứng ủy quyền hãng"
        description="Bằng chứng sẽ được gửi tới Admin HomeCare xem xét (D-14)."
        onSubmit={handleEvidenceSubmit}
        saving={saving}
        submitLabel="Gửi bằng chứng"
      >
        <FormSection title="Tài liệu ủy quyền">
          <FormField label="Đường dẫn / mã tài liệu">
            <Input
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              placeholder="https://..."
            />
          </FormField>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
