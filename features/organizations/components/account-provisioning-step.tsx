"use client";

import * as React from "react";
import { CheckCircle2, RotateCcw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export interface ProvisionedAccountInfo {
  userId: string;
  email: string;
  fullName: string;
}

export function AccountProvisioningStep({
  organizationId,
  provisioned,
  onProvisioned,
}: {
  organizationId: string;
  provisioned: ProvisionedAccountInfo | null;
  onProvisioned: (account: ProvisionedAccountInfo | null) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/org/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          email: email.trim(),
          fullName: fullName.trim(),
          password,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        userId?: string;
        email?: string;
        fullName?: string;
        error?: string;
      };
      if (!res.ok || !json.userId) {
        throw new Error(json.error || "Không thể tạo tài khoản Supabase");
      }
      onProvisioned({
        userId: json.userId,
        email: json.email ?? email.trim(),
        fullName: json.fullName ?? fullName.trim(),
      });
      setEmail("");
      setFullName("");
      setPassword("");
      toast.success("Đã tạo & xác thực tài khoản thành công");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo tài khoản"
      );
    } finally {
      setCreating(false);
    }
  }

  if (provisioned) {
    return (
      <div className="hc-animate-section-in flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {provisioned.fullName}
              </span>
              <Badge variant="success">Đã xác thực</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {provisioned.email}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onProvisioned(null)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Đổi tài khoản
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleCreateAccount}
      className="hc-animate-section-in space-y-3 rounded-lg border border-border bg-secondary/35 p-4"
    >
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">
          1. Tạo & xác thực tài khoản
        </h3>
        <p className="text-xs text-muted-foreground">
          Tài khoản mới được xác thực ngay để gắn vào tổ chức ở bước tiếp theo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="prov-email">Email</Label>
          <Input
            id="prov-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nhanvien@congty.vn"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prov-fullname">Họ tên</Label>
          <Input
            id="prov-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            minLength={2}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prov-password">Mật khẩu tạm</Label>
          <Input
            id="prov-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            minLength={6}
            required
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={creating}
          disabled={creating}
        >
          {!creating ? <UserPlus className="h-4 w-4" /> : null}
          {creating ? "Đang tạo tài khoản..." : "Tạo & xác thực tài khoản"}
        </Button>
      </div>
    </form>
  );
}
