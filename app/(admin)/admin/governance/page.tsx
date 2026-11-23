import { GovernanceSettingsPanel } from "@/features/admin/components/governance-settings-panel";
import { PageHeader } from "@/shared/ui/page-header";

export default function AdminGovernancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cấu hình quản trị nền tảng"
        description="Quản lý các tham số vận hành, tài chính và hồ sơ đối tác."
      />
      <GovernanceSettingsPanel />
    </div>
  );
}
