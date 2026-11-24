"use client";

import * as React from "react";
import { VIETNAM_PROVINCES, type ProvinceOption } from "@/shared/lib/provinces";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/shared/ui/combobox";

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
  const options = React.useMemo(() => {
    const available = hasCurrentValue || !value
      ? provinces
      : [...provinces, { code: `legacy-${value}`, name: value }];
    return available;
  }, [hasCurrentValue, provinces, value]);

  return (
    <Combobox
      items={options.map((province) => province.name)}
      value={value || null}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        placeholder="Tìm tỉnh / thành phố"
        className={className}
      />
      <ComboboxContent className="max-h-72">
        <ComboboxEmpty>Không tìm thấy tỉnh / thành phố.</ComboboxEmpty>
        <ComboboxList>
          {(province: string) => (
            <ComboboxItem key={province} value={province}>
              {province}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
