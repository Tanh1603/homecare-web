"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { organizationsHttpAdapter } from "@/features/organizations/api/organizations.http";
import {
  useUiStore,
  type GovernanceSettingGroup,
} from "@/shared/store/ui-store";
import { cn, formatDateTime } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";

interface SettingItem {
  settingKey: string;
  settingValue: string;
  updatedBy?: string | null;
  updatedAt?: string;
}

interface SettingMetadata {
  label: string;
  description: string;
  group: Exclude<GovernanceSettingGroup, "ALL">;
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

const GROUP_LABELS: Record<GovernanceSettingGroup, string> = {
  ALL: "Tất cả",
  PARTNER: "Đối tác & Hồ sơ",
  PRICING: "Báo giá & Phí",
  OPERATIONS: "Vận hành khác",
};

const GOVERNANCE_SETTINGS_KEY = ["admin", "governance-settings"] as const;

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
  const queryClient = useQueryClient();
  const groupFilter = useUiStore((s) => s.governanceGroupFilter);
  const setGroupFilter = useUiStore((s) => s.setGovernanceGroupFilter);

  const [draftValues, setDraftValues] = React.useState<Record<string, string>>({});
  const [search, setSearch] = React.useState("");

  const settingsQuery = useQuery({
    queryKey: GOVERNANCE_SETTINGS_KEY,
    queryFn: async () => {
      const list = await organizationsHttpAdapter.listGovernanceSettings();
      return [...list].sort((a, b) => a.settingKey.localeCompare(b.settingKey));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { item: SettingItem; value: string }) =>
      organizationsHttpAdapter.updateGovernanceSetting(
        vars.item.settingKey,
        vars.value
      ),
    onSuccess: (updated, vars) => {
      const meta = resolveSettingMeta(vars.item.settingKey);
      queryClient.setQueryData<SettingItem[]>(GOVERNANCE_SETTINGS_KEY, (prev = []) =>
        prev.map((row) =>
          row.settingKey === vars.item.settingKey
            ? { ...row, ...updated, updatedAt: new Date().toISOString() }
            : row
        )
      );
      setDraftValues((prev) => ({
        ...prev,
        [vars.item.settingKey]: updated.settingValue,
      }));
      toast.success(`Đã cập nhật ${meta.label}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Lưu cấu hình thất bại."
      );
    },
  });

  const items = React.useMemo(
    () => settingsQuery.data ?? [],
    [settingsQuery.data]
  );
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

  const handleSave = React.useCallback(
    (item: SettingItem) => {
      const meta = resolveSettingMeta(item.settingKey);
      const raw = (draftValues[item.settingKey] ?? item.settingValue).trim();
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
      saveMutation.mutate({ item, value: raw });
    },
    [draftValues, saveMutation]
  );

  const error =
    settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : settingsQuery.isError
        ? "Không thể tải danh sách cấu hình quản trị."
        : null;
  const savingKey = saveMutation.isPending ? saveMutation.variables?.item.settingKey ?? null : null;

  const columns = React.useMemo<DataTableColumn<SettingItem>[]>(
    () => [
      {
        accessorKey: "settingKey",
        header: "Tham số & Ý nghĩa",
        cell: ({ row }) => {
          const item = row.original;
          const meta = resolveSettingMeta(item.settingKey);
          return (
            <div className="space-y-1 whitespace-normal">
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
          );
        },
      },
      {
        id: "group",
        header: "Nhóm",
        cell: ({ row }) => {
          const meta = resolveSettingMeta(row.original.settingKey);
          return (
            <Badge variant="outline" className="text-xs">
              {GROUP_LABELS[meta.group]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "settingValue",
        header: "Giá trị áp dụng",
        cell: ({ row }) => {
          const item = row.original;
          const meta = resolveSettingMeta(item.settingKey);
          const draft = draftValues[item.settingKey] ?? item.settingValue;
          const isDirty = draft.trim() !== item.settingValue;
          const isSaving = savingKey === item.settingKey;
          return (
            <div>
              <div className="flex items-center gap-2">
                <Input
                  id={`gov-${item.settingKey}`}
                  type={meta.inputMode === "numeric" ? "number" : "text"}
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
                  onClick={() => handleSave(item)}
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
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Cập nhật gần nhất",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                {item.updatedBy || "SYSTEM"}
              </p>
              <p className="mt-0.5 tabular-nums">
                {item.updatedAt ? formatDateTime(item.updatedAt) : "—"}
              </p>
            </div>
          );
        },
      },
    ],
    [draftValues, handleSave, savingKey]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(GROUP_LABELS) as GovernanceSettingGroup[]).map((group) => {
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
              onClick={() => void settingsQuery.refetch()}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : settingsQuery.isPending ? (
        <Card className="overflow-hidden">
          <CardContent
            className="space-y-3 py-4"
            aria-busy="true"
            role="status"
            aria-label="Đang tải cấu hình quản trị"
          >
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[2.6fr_1fr_1.6fr_1fr] items-center gap-3 py-2"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full max-w-56" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          hideSearch
          serverSide
          data={filteredItems}
          columns={columns}
          emptyMessage="Không tìm thấy tham số cấu hình phù hợp."
        />
      )}
    </div>
  );
}
