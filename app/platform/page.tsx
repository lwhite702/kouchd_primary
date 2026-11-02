import { OverviewDashboard } from "@/components/platform/overview-dashboard";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { getFreshdeskOpsStatus, getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function PlatformOverviewPage() {
  await requirePlatformOpsAccess();
  const freshdeskStatus = getFreshdeskOpsStatus();
  const mintlifyStatus = getMintlifyOpsStatus();

  return (
    <OverviewDashboard
      basePath="/platform"
      freshdeskStatus={freshdeskStatus}
      mintlifyStatus={mintlifyStatus}
    />
  );
}
