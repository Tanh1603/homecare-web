"use client";

import * as React from "react";
import { VIETNAM_PROVINCES, type ProvinceOption } from "@/shared/lib/provinces";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";

export function ProvinceSelect({
  id,
  value,
  onChange,
  disabled,
  required,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [provinces, setProvinces] =
    React.useState<ProvinceOption[]>(VIETNAM_PROVINCES);

  React.useEffect(() => {
    let cancelled = false;
    async function loadProvinces() {
      try {
        const res = await fetch("/api/gateway/locations/provinces", {
          cache: "force-cache",
          headers: { "x-homecare-scope": "personal" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          success?: boolean;
          data?: Array<{ code?: string; name?: string }>;
        };
        if (
          !cancelled &&
          json.success &&
          Array.isArray(json.data) &&
          json.data.length > 0
        ) {
          const mapped = json.data
            .filter((item) => item.code && item.name)
            .map((item) => ({
              code: String(item.code),
              name: String(item.name),
            }));
          if (mapped.length > 0) {
            setProvinces(mapped);
          }
        }
      } catch {
        // Fallback to built-in VIETNAM_PROVINCES
      }
    }
    void loadProvinces();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCurrentValue =
    !value || provinces.some((p) => p.name === value);

  return (
    <NativeSelect
      id={id}
      value={value}
      disabled={disabled}
      required={required}
      aria-invalid={ariaInvalid}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <NativeSelectOption value="" disabled>
        Chọn Tỉnh / Thành phố
      </NativeSelectOption>
      {!hasCurrentValue ? (
        <NativeSelectOption value={value}>{value}</NativeSelectOption>
      ) : null}
      {provinces.map((province) => (
        <NativeSelectOption key={province.code} value={province.name}>
          {province.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
