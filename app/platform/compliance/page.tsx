import { ComplianceExplorer } from "@/components/platform/compliance-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformCompliancePage() {
  await requirePlatformOpsAccess();
  return <ComplianceExplorer />;
}
