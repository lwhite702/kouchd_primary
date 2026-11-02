import { OverviewDashboard } from "@/components/platform/overview-dashboard";
import { getHelpScoutOpsStatus, getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function PlatformOverviewPage() {
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
