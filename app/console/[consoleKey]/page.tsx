import { OverviewDashboard } from "@/components/platform/overview-dashboard";
import { requirePlatformConsole } from "@/lib/platform/console";
import { getFreshdeskOpsStatus, getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function ConsoleOverviewPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  const freshdeskStatus = getFreshdeskOpsStatus();
  const mintlifyStatus = getMintlifyOpsStatus();

  return (
    <OverviewDashboard
      consoleKey={consoleKey}
      freshdeskStatus={freshdeskStatus}
      mintlifyStatus={mintlifyStatus}
    />
  );
}
