"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  warrantiesHttpApi,
  type HouseholdWarrantyItem,
  type WarrantyClaimItem,
} from "../api/warranties.http";
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

export function AdminWarrantiesPanel({
  initialWarranties,
  initialClaims,
  initialError = null,
}: {
  initialWarranties: HouseholdWarrantyItem[];
  initialClaims: WarrantyClaimItem[];
  initialError?: string | null;
}) {
  const [tab, setTab] = React.useState<"WARRANTIES" | "CLAIMS">("WARRANTIES");
  const [warranties, setWarranties] = React.useState<HouseholdWarrantyItem[]>(initialWarranties);
  const [claims, setClaims] = React.useState<WarrantyClaimItem[]>(initialClaims);
  const [loadError, setLoadError] = React.useState<string | null>(initialError);
  const [reloading, setReloading] = React.useState(false);

  const [verifyWarrantyTarget, setVerifyWarrantyTarget] = React.useState<HouseholdWarrantyItem | null>(null);
  const [verifyClaimTarget, setVerifyClaimTarget] = React.useState<WarrantyClaimItem | null>(null);
  const [decision, setDecision] = React.useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleReload() {
    setReloading(true);
    setLoadError(null);
    try {
      const [nextW, nextC] = await Promise.all([
        warrantiesHttpApi.adminListWarranties(),
        warrantiesHttpApi.adminListClaims(),
      ]);
      setWarranties(nextW);
      setClaims(nextC);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không thể tải dữ liệu bảo hành.");
    } finally {
      setReloading(false);
    }
  }

  async function handleVerifyWarrantySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verifyWarrantyTarget) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Vui lòng nhập lý do từ chối xác minh.");
      return;
    }
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.adminVerifyWarranty(
        verifyWarrantyTarget.id,
        { verificationStatus: decision, note: note.trim() || undefined },
        verifyWarrantyTarget.version
      );
      setWarranties((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success(decision === "VERIFIED" ? "Đã xác minh bảo hành hãng (D-14)" : "Đã từ chối xác minh");
      setVerifyWarrantyTarget(null);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xác minh thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyClaimSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verifyClaimTarget) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Vui lòng nhập lý do từ chối xác minh.");
      return;
    }
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.adminVerifyClaim(
        verifyClaimTarget.id,
        {
          warrantyVerificationStatus: decision,
          authorizationVerificationStatus: decision,
          note: note.trim() || undefined,
        },
        verifyClaimTarget.version
      );
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Đã cập nhật kết quả xác minh claim (D-14)");
      setVerifyClaimTarget(null);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xác minh thất bại");
    } finally {
      setSaving(false);
    }
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
        <Button variant="outline" size="sm" onClick={handleReload} disabled={reloading}>
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
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã BH</TableHead>
                    <TableHead>Đơn vị / Hãng</TableHead>
                    <TableHead>Phân loại</TableHead>
                    <TableHead>Xác minh (D-14)</TableHead>
                    <TableHead>Hạn BH</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warranties.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{formatShortId(w.id)}</TableCell>
                      <TableCell>{w.providerName}</TableCell>
                      <TableCell className="text-xs">
                        {w.warrantyCategory ?? "PRODUCT_MANUFACTURER"} / {w.warrantyIssuer ?? "MANUFACTURER"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={w.verificationStatus ?? "UNVERIFIED"} />
                      </TableCell>
                      <TableCell className="text-xs">{w.endsOn ? formatDate(w.endsOn) : "—"}</TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : claims.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Chưa có yêu cầu bảo hành"
          description="WarrantyClaim quá hạn SLA 48h hoặc chờ xác minh hãng sẽ hiển thị tại đây."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Claim</TableHead>
                  <TableHead>Loại / Issuer</TableHead>
                  <TableHead>Trạng thái xử lý</TableHead>
                  <TableHead>Xác minh BH / Ủy quyền</TableHead>
                  <TableHead>SLA 48h</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{formatShortId(c.id)}</TableCell>
                    <TableCell className="text-xs">
                      {c.warrantyCategory} ({c.warrantyIssuer})
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.claimStatus} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.warrantyVerificationStatus} / {c.authorizationVerificationStatus}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.providerNoResponse ? (
                        <span className="font-medium text-warning">Quá hạn 48h</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
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
