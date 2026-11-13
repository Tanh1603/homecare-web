import { organizationsHttpAdapter } from "./organizations.http";
import { organizationsMockAdapter } from "./organizations.mock";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const organizationsApi = useMock
  ? organizationsMockAdapter
  : organizationsHttpAdapter;
