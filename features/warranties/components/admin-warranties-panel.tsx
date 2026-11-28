"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  warrantiesHttpApi,
  type HouseholdWarrantyItem,
  type WarrantyClaimItem,
} from "../api/warranties.http";
import { useUiStore } from "@/shared/store/ui-store";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatDate, formatShortId } from "@/shared/lib/utils";

const ADMIN_WARRANTIES_KEY = ["admin", "warranties"] as const;
const ADMIN_CLAIMS_KEY = ["admin", "warranty-claims"] as const;

export function AdminWarrantiesPanel({
  initialWarranties,
  initialClaims,
  initialError = null,
}: {
  initialWarranties: HouseholdWarrantyItem[];
  initialClaims: WarrantyClaimItem[];
  initialError?: string | null;
}) {
  const queryClient = useQueryClient();
  const tab = useUiStore((s) => s.adminWarrantiesActiveTab);
  const setTab = useUiStore((s) => s.setAdminWarrantiesActiveTab);

  const [verifyWarrantyTarget, setVerifyWarrantyTarget] =
    React.useState<HouseholdWarrantyItem | null>(null);
  const [verifyClaimTarget, setVerifyClaimTarget] =
    React.useState<WarrantyClaimItem | null>(null);
  const [decision, setDecision] = React.useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [note, setNote] = React.useState("");

  const warrantiesQuery = useQuery({
    queryKey: ADMIN_WARRANTIES_KEY,
    queryFn: () => warrantiesHttpApi.adminListWarranties(),
    initialData: initialWarranties,
    enabled: false,
  });

  const claimsQuery = useQuery({
    queryKey: ADMIN_CLAIMS_KEY,
    queryFn: () => warrantiesHttpApi.adminListClaims(),
    initialData: initialClaims,
    enabled: false,
  });

  const verifyWarrantyMutation = useMutation({
    mutationFn: (vars: {
      warrantyId: string;
      verificationStatus: "VERIFIED" | "REJECTED";
      note?: string;
      version?: number;
    }) =>
      warrantiesHttpApi.adminVerifyWarranty(
        vars.warrantyId,
        { verificationStatus: vars.verificationStatus, note: vars.note },
        vars.version
      ),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<HouseholdWarrantyItem[]>(
        ADMIN_WARRANTIES_KEY,
        (prev = []) => prev.map((w) => (w.id === updated.id ? updated : w))
      );
      toast.success(
        vars.verificationStatus === "VERIFIED"
          ? "Đã xác minh bảo hành hãng (D-14)"
          : "Đã từ chối xác minh"
      );
      setVerifyWarrantyTarget(null);
      setNote("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Xác minh thất bại");
    },
  });

  const verifyClaimMutation = useMutation({
    mutationFn: (vars: {
      claimId: string;
      decision: "VERIFIED" | "REJECTED";
      note?: string;
      version?: number;
    }) =>
      warrantiesHttpApi.adminVerifyClaim(
        vars.claimId,
        {
          warrantyVerificationStatus: vars.decision,
          authorizationVerificationStatus: vars.decision,
          note: vars.note,
        },
        vars.version
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData<WarrantyClaimItem[]>(ADMIN_CLAIMS_KEY, (prev = []) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      toast.success("Đã cập nhật kết quả xác minh claim (D-14)");
      setVerifyClaimTarget(null);
      setNote("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Xác minh thất bại");
    },
  });

  const warranties = warrantiesQuery.data ?? [];
  const claims = claimsQuery.data ?? [];
  const reloading = warrantiesQuery.isFetching || claimsQuery.isFetching;
  const saving = verifyWarrantyMutation.isPending || verifyClaimMutation.isPending;
  const loadError =
    initialError ??
    (warrantiesQuery.error instanceof Error
      ? warrantiesQuery.error.message
      : claimsQuery.error instanceof Error
        ? claimsQuery.error.message
        : null);

  const warrantyColumns = React.useMemo<DataTableColumn<HouseholdWarrantyItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Mã BH",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{formatShortId(row.original.id)}</span>
        ),
      },
      {
        accessorKey: "providerName",
        header: "Đơn vị / Hãng",
      },
      {
        accessorKey: "warrantyCategory",
        header: "Phân loại",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.warrantyCategory ?? "PRODUCT_MANUFACTURER"} /{" "}
            {row.original.warrantyIssuer ?? "MANUFACTURER"}
          </span>
        ),
      },
      {
        accessorKey: "verificationStatus",
        header: "Xác minh (D-14)",
        cell: ({ row }) => (
          <StatusBadge status={row.original.verificationStatus ?? "UNVERIFIED"} />
        ),
      },
      {
        accessorKey: "endsOn",
        header: "Hạn BH",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.endsOn ? formatDate(row.original.endsOn) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setVerifyWarrantyTarget(w);
                  setDecision("VERIFIED");
                  setNote("");
                }}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Xác minh
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const claimColumns = React.useMemo<DataTableColumn<WarrantyClaimItem>[]>(
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
        header: "Loại / Issuer",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.warrantyCategory} ({row.original.warrantyIssuer})
          </span>
        ),
      },
      {
        accessorKey: "claimStatus",
        header: "Trạng thái xử lý",
        cell: ({ row }) => <StatusBadge status={row.original.claimStatus} />,
      },
      {
        accessorKey: "warrantyVerificationStatus",
        header: "Xác minh BH / Ủy quyền",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.warrantyVerificationStatus} /{" "}
            {row.original.authorizationVerificationStatus}
          </span>
        ),
      },
      {
        accessorKey: "providerNoResponse",
        header: "SLA 48h",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.providerNoResponse ? (
              <span className="font-medium text-warning">Quá hạn 48h</span>
            ) : (
              "—"
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setVerifyClaimTarget(c);
                  setDecision("VERIFIED");
                  setNote("");
                }}
              >
                Xác minh
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  async function handleReload() {
    await Promise.all([warrantiesQuery.refetch(), claimsQuery.refetch()]);
  }

  function handleVerifyWarrantySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verifyWarrantyTarget) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Vui lòng nhập lý do từ chối xác minh.");
      return;
    }
    verifyWarrantyMutation.mutate({
      warrantyId: verifyWarrantyTarget.id,
      verificationStatus: decision,
      note: note.trim() || undefined,
      version: verifyWarrantyTarget.version,
    });
  }

  function handleVerifyClaimSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verifyClaimTarget) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Vui lòng nhập lý do từ chối xác minh.");
      return;
    }
    verifyClaimMutation.mutate({
      claimId: verifyClaimTarget.id,
      decision,
      note: note.trim() || undefined,
      version: verifyClaimTarget.version,
    });
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={tab === "WARRANTIES" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("WARRANTIES")}
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Bảo hành thiết bị ({warranties.length})
          </Button>
          <Button
            variant={tab === "CLAIMS" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("CLAIMS")}
          >
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            Yêu cầu bảo hành / SLA ({claims.length})
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleReload()} disabled={reloading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {tab === "WARRANTIES" ? (
        warranties.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Chưa có hồ sơ bảo hành cần xác minh"
            description="Bảo hành sản phẩm/hãng mới sẽ hiển thị tại đây để Admin xác minh theo D-14."
          />
        ) : (
          <DataTable
            hideSearch
            serverSide
            data={warranties}
            columns={warrantyColumns}
          />
        )
      ) : claims.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Chưa có yêu cầu bảo hành"
          description="WarrantyClaim quá hạn SLA 48h hoặc chờ xác minh hãng sẽ hiển thị tại đây."
        />
      ) : (
        <DataTable
          hideSearch
          serverSide
          data={claims}
          columns={claimColumns}
        />
      )}

      <FormDrawer
        open={Boolean(verifyWarrantyTarget)}
        onClose={() => setVerifyWarrantyTarget(null)}
        title="Xác minh Bảo hành Hãng (Admin — D-14)"
        description="Chỉ Admin HomeCare được chuyển trạng thái sang VERIFIED sau khi kiểm tra bằng chứng."
        onSubmit={handleVerifyWarrantySubmit}
        saving={saving}
        submitLabel="Lưu kết quả"
      >
        <FormSection title="Quyết định xác minh">
          <FormField label="Trạng thái xác minh">
            <NativeSelect
              value={decision}
              onChange={(e) => setDecision(e.target.value as "VERIFIED" | "REJECTED")}
            >
              <NativeSelectOption value="VERIFIED">VERIFIED (Đã xác minh)</NativeSelectOption>
              <NativeSelectOption value="REJECTED">REJECTED (Từ chối)</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField label="Ghi chú / Lý do">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bắt buộc nếu chọn REJECTED"
            />
          </FormField>
        </FormSection>
      </FormDrawer>

      <FormDrawer
        open={Boolean(verifyClaimTarget)}
        onClose={() => setVerifyClaimTarget(null)}
        title="Xác minh Bằng chứng Claim (Admin — D-14)"
        description="VERIFIED chỉ xác nhận bằng chứng hợp lệ, không tự động chuyển claimStatus sang ACCEPTED."
        onSubmit={handleVerifyClaimSubmit}
        saving={saving}
        submitLabel="Cập nhật xác minh"
      >
        <FormSection title="Kết quả kiểm duyệt">
          <FormField label="Trạng thái xác minh">
            <NativeSelect
              value={decision}
              onChange={(e) => setDecision(e.target.value as "VERIFIED" | "REJECTED")}
            >
              <NativeSelectOption value="VERIFIED">VERIFIED</NativeSelectOption>
              <NativeSelectOption value="REJECTED">REJECTED</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField label="Ghi chú kiểm duyệt">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bắt buộc nếu chọn REJECTED"
            />
          </FormField>
        </FormSection>
      </FormDrawer>
    </div>
  );
}
