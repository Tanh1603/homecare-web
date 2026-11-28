"use client";

import * as React from "react";
import { CheckCircle2, FileUp, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { warrantiesHttpApi, type WarrantyClaimItem } from "../api/warranties.http";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormDrawer, FormField, FormSection } from "@/shared/ui/form-drawer";
import { Input } from "@/shared/ui/input";
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

/**
 * Org Partner incoming WarrantyClaims panel (D-05, D-14, D-28, D-30).
 * Providers may submit authorization evidence and respond to WORKMANSHIP claims
 * (accept -> spawns 0 VND REWORK Booking), but NEVER self-verify manufacturer status.
 */
export function OrgWarrantyClaimsPanel() {
  const [claims, setClaims] = React.useState<WarrantyClaimItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rejectTarget, setRejectTarget] = React.useState<WarrantyClaimItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [evidenceTarget, setEvidenceTarget] = React.useState<WarrantyClaimItem | null>(null);
  const [evidenceRef, setEvidenceRef] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    warrantiesHttpApi
      .orgListClaims()
      .then((list) => {
        if (active) setClaims(list);
      })
      .catch(() => {
        // Non-blocking secondary panel on /org/warranties
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleAccept(claim: WarrantyClaimItem) {
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.orgRespondClaim(
        claim.id,
        { accepted: true },
        claim.version
      );
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(
        updated.reworkBookingId
          ? `Đã chấp nhận bảo hành & tạo lịch REWORK 0 VND (${formatShortId(updated.reworkBookingId)})`
          : "Đã chấp nhận yêu cầu bảo hành"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể chấp nhận yêu cầu");
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.orgRespondClaim(
        rejectTarget.id,
        { accepted: false, rejectionReason: rejectReason.trim() },
        rejectTarget.version
      );
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Đã từ chối yêu cầu bảo hành (không tự tạo đơn trả phí — D-05)");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Từ chối thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleEvidenceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!evidenceTarget || !evidenceRef.trim()) return;
    setSaving(true);
    try {
      const updated = await warrantiesHttpApi.orgAppendClaimEvidence(evidenceTarget.id, {
        evidenceKind: "AUTHORIZATION",
        evidenceRef: evidenceRef.trim(),
      });
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Đã nộp bằng chứng ủy quyền (chờ Admin xác minh theo D-14)");
      setEvidenceTarget(null);
      setEvidenceRef("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể nộp bằng chứng");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return null;
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Claim</TableHead>
                  <TableHead>Loại BH</TableHead>
                  <TableHead>Mô tả sự cố</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày báo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((c) => {
                  const canRespond = c.claimStatus === "SUBMITTED" || c.claimStatus === "PENDING_VERIFICATION";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{formatShortId(c.id)}</TableCell>
                      <TableCell className="text-xs">{c.warrantyCategory}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{c.issueDescription}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.claimStatus} />
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(c.reportedAt)}</TableCell>
                      <TableCell className="space-x-1.5 text-right">
                        {canRespond && (
                          <>
                            <Button size="sm" variant="default" disabled={saving} onClick={() => handleAccept(c)}>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
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
