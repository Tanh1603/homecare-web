"use client";

import * as React from "react";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";
import { cn, formatDateTime } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

type SettingGroup = "ALL" | "PARTNER" | "PRICING" | "OPERATIONS";

interface SettingItem {
  settingKey: string;
  settingValue: string;
  updatedBy?: string | null;
  updatedAt?: string;
}

interface SettingMetadata {
  label: string;
  description: string;
  group: Exclude<SettingGroup, "ALL">;
  unit: string;
  inputMode: "numeric" | "text";
}

const SETTING_REGISTRY: Record<string, SettingMetadata> = {
  inspection_fee_soft_warning_vnd: {
    label: "Ngưỡng cảnh báo mềm phí khảo sát",
    description:
      "Bật cảnh báo cho khách hàng và gắn cờ hậu kiểm khi phí khảo sát vượt ngưỡng.",
    group: "PRICING",
    unit: "VNĐ",
    inputMode: "numeric",
  },
  organization_max_resubmit_count: {
    label: "Số lần nộp lại tối đa khi hồ sơ bị từ chối",
    description:
      "Số lần tối đa tổ chức bị từ chối được chỉnh sửa và gửi duyệt lại hồ sơ.",
    group: "PARTNER",
    unit: "lần",
    inputMode: "numeric",
  },
};

const GROUP_LABELS: Record<SettingGroup, string> = {
  ALL: "Tất cả",
  PARTNER: "Đối tác & Hồ sơ",
  PRICING: "Báo giá & Phí",
  OPERATIONS: "Vận hành khác",
};

function resolveSettingMeta(key: string): SettingMetadata {
  const known = SETTING_REGISTRY[key];
  if (known) return known;
  return {
    label: key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    description: "Tham số quản trị hệ thống.",
    group: "OPERATIONS",
    unit: "",
    inputMode: "text",
  };
}

export function GovernanceSettingsPanel() {
  const [items, setItems] = React.useState<SettingItem[]>([]);
  const [draftValues, setDraftValues] = React.useState<Record<string, string>>(
    {}
  );
  const [search, setSearch] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<SettingGroup>("ALL");
  const [loading, setLoading] = React.useState(true);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await organizationsHttpAdapter.listGovernanceSettings();
      const sorted = [...list].sort((a, b) =>
        a.settingKey.localeCompare(b.settingKey)
      );
      setItems(sorted);
      const nextDrafts: Record<string, string> = {};
      for (const item of sorted) {
        nextDrafts[item.settingKey] = item.settingValue;
      }
      setDraftValues(nextDrafts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách cấu hình quản trị."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const meta = resolveSettingMeta(item.settingKey);
      if (groupFilter !== "ALL" && meta.group !== groupFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.settingKey.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q)
      );
    });
  }, [items, search, groupFilter]);

  async function handleSave(item: SettingItem) {
    const meta = resolveSettingMeta(item.settingKey);
    const raw = (draftValues[item.settingKey] ?? "").trim();
    if (!raw) {
      toast.error("Giá trị cấu hình không được để trống.");
      return;
    }
    if (meta.inputMode === "numeric") {
      const num = Number(raw);
      if (!Number.isInteger(num) || num < 0) {
        toast.error("Giá trị phải là số nguyên không âm.");
        return;
      }
    }
    setSavingKey(item.settingKey);
    try {
      const updated = await organizationsHttpAdapter.updateGovernanceSetting(
        item.settingKey,
        raw
      );
      setItems((prev) =>
        prev.map((row) =>
          row.settingKey === item.settingKey
            ? { ...row, ...updated, updatedAt: new Date().toISOString() }
            : row
        )
      );
      setDraftValues((prev) => ({
        ...prev,
        [item.settingKey]: updated.settingValue,
      }));
      toast.success(`Đã cập nhật ${meta.label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Lưu cấu hình thất bại."
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(GROUP_LABELS) as SettingGroup[]).map((group) => {
            const count =
              group === "ALL"
                ? items.length
                : items.filter(
                    (it) => resolveSettingMeta(it.settingKey).group === group
                  ).length;
            const active = groupFilter === group;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setGroupFilter(group)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  active
                    ? "border-primary/30 bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span>{GROUP_LABELS[group]}</span>
                <span className="tabular-nums opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc key cấu hình..."
            aria-label="Tìm tham số cấu hình"
            className="pl-8"
          />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadSettings()}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">Tham số &amp; Ý nghĩa</TableHead>
                <TableHead className="w-[16%]">Nhóm</TableHead>
                <TableHead className="w-[26%]">Giá trị áp dụng</TableHead>
                <TableHead className="w-[16%]">Cập nhật gần nhất</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Đang tải cấu hình quản trị...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Không tìm thấy tham số cấu hình phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const meta = resolveSettingMeta(item.settingKey);
                  const draft = draftValues[item.settingKey] ?? "";
                  const isDirty = draft.trim() !== item.settingValue;
                  const isSaving = savingKey === item.settingKey;

                  return (
                    <TableRow key={item.settingKey}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`gov-${item.settingKey}`}
                            className="text-sm font-medium text-foreground"
                          >
                            {meta.label}
                          </Label>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {meta.description}
                          </p>
                          <code className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {item.settingKey}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-xs">
                          {GROUP_LABELS[meta.group]}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <Input
                            id={`gov-${item.settingKey}`}
                            type={
                              meta.inputMode === "numeric" ? "number" : "text"
                            }
                            min={meta.inputMode === "numeric" ? 0 : undefined}
                            step={meta.inputMode === "numeric" ? 1 : undefined}
                            value={draft}
                            disabled={isSaving}
                            onChange={(e) =>
                              setDraftValues((prev) => ({
                                ...prev,
                                [item.settingKey]: e.target.value,
                              }))
                            }
                            className="h-8 tabular-nums"
                          />
                          {meta.unit ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {meta.unit}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!isDirty || isSaving}
                            onClick={() => void handleSave(item)}
                          >
                            {isSaving ? "Đang lưu..." : "Lưu"}
                          </Button>
                          {isDirty ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isSaving}
                              onClick={() =>
                                setDraftValues((prev) => ({
                                  ...prev,
                                  [item.settingKey]: item.settingValue,
                                }))
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Hoàn tác
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {item.updatedBy || "SYSTEM"}
                        </p>
                        <p className="mt-0.5 tabular-nums">
                          {item.updatedAt
                            ? formatDateTime(item.updatedAt)
                            : "—"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
