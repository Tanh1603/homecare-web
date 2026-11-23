"use client";

import { organizationsApi } from "@/features/organizations/api";
import {
  LEGAL_ENTITY_EVIDENCE_GUIDE,
  type LegalEntityType,
} from "@/features/organizations/contracts/organization";
import { FileUploader } from "@/shared/ui/file-uploader";

export function OrgEvidenceUploader({
  legalEntityType,
  value,
  onChange,
  onAuthRequired,
  disabled,
  error,
}: {
  legalEntityType: LegalEntityType;
  value: string;
  onChange: (nextValue: string) => void;
  onAuthRequired?: () => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <FileUploader
      value={value}
      onChange={onChange}
      uploadFile={(file) =>
        organizationsApi.uploadEvidenceFile(file, legalEntityType)
      }
      hint={LEGAL_ENTITY_EVIDENCE_GUIDE[legalEntityType]}
      inputLabel="Chọn tài liệu chứng minh pháp lý"
      buttonLabel="Tải tài liệu lên"
      onAuthRequired={onAuthRequired}
      disabled={disabled}
      error={error}
    />
  );
}
