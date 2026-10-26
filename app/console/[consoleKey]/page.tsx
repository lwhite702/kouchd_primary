import { OverviewDashboard } from "@/components/platform/overview-dashboard";
import { requirePlatformConsole } from "@/lib/platform/console";
import { getHelpScoutOpsStatus, getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function ConsoleOverviewPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  const helpScoutStatus = getHelpScoutOpsStatus();
  const mintlifyStatus = getMintlifyOpsStatus();

  return (
    <OverviewDashboard
      consoleKey={consoleKey}
      helpScoutStatus={helpScoutStatus}
      mintlifyStatus={mintlifyStatus}
    />
  );
}
