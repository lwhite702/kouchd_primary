import { OverviewDashboard } from "@/components/platform/overview-dashboard";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { getHelpScoutOpsStatus, getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function PlatformOverviewPage() {
  await requirePlatformOpsAccess();
  const helpScoutStatus = getHelpScoutOpsStatus();
  const mintlifyStatus = getMintlifyOpsStatus();

  return (
    <OverviewDashboard
      basePath="/platform"
      helpScoutStatus={helpScoutStatus}
      mintlifyStatus={mintlifyStatus}
    />
  );
}
