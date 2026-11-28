import { create } from "zustand";

export type AdminDisputesTab = "DISPUTES" | "NOTIFICATION_FAILED";
export type AdminWarrantiesTab = "WARRANTIES" | "CLAIMS";
export type GovernanceSettingGroup = "ALL" | "PARTNER" | "PRICING" | "OPERATIONS";
export type OrgScheduleWorkspaceTab = "calendar" | "requests";

interface UiState {
  adminDisputesActiveTab: AdminDisputesTab;
  setAdminDisputesActiveTab: (tab: AdminDisputesTab) => void;
  adminWarrantiesActiveTab: AdminWarrantiesTab;
  setAdminWarrantiesActiveTab: (tab: AdminWarrantiesTab) => void;
  governanceGroupFilter: GovernanceSettingGroup;
  setGovernanceGroupFilter: (group: GovernanceSettingGroup) => void;
  orgScheduleRequestsStatus: string;
  setOrgScheduleRequestsStatus: (status: string) => void;
  orgScheduleWorkspaceTab: OrgScheduleWorkspaceTab;
  setOrgScheduleWorkspaceTab: (tab: OrgScheduleWorkspaceTab) => void;
  orgBookingsStatusFilter: string;
  setOrgBookingsStatusFilter: (status: string) => void;
  orgRequestsStatusFilter: string;
  setOrgRequestsStatusFilter: (status: string) => void;
  resetUiStore: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  adminDisputesActiveTab: "DISPUTES",
  setAdminDisputesActiveTab: (tab) => set({ adminDisputesActiveTab: tab }),
  adminWarrantiesActiveTab: "WARRANTIES",
  setAdminWarrantiesActiveTab: (tab) => set({ adminWarrantiesActiveTab: tab }),
  governanceGroupFilter: "ALL",
  setGovernanceGroupFilter: (group) => set({ governanceGroupFilter: group }),
  orgScheduleRequestsStatus: "PENDING",
  setOrgScheduleRequestsStatus: (status) => set({ orgScheduleRequestsStatus: status }),
  orgScheduleWorkspaceTab: "calendar",
  setOrgScheduleWorkspaceTab: (tab) => set({ orgScheduleWorkspaceTab: tab }),
  orgBookingsStatusFilter: "ALL",
  setOrgBookingsStatusFilter: (status) => set({ orgBookingsStatusFilter: status }),
  orgRequestsStatusFilter: "ALL",
  setOrgRequestsStatusFilter: (status) => set({ orgRequestsStatusFilter: status }),
  resetUiStore: () =>
    set({
      adminDisputesActiveTab: "DISPUTES",
      adminWarrantiesActiveTab: "WARRANTIES",
      governanceGroupFilter: "ALL",
      orgScheduleRequestsStatus: "PENDING",
      orgScheduleWorkspaceTab: "calendar",
      orgBookingsStatusFilter: "ALL",
      orgRequestsStatusFilter: "ALL",
    }),
}));
