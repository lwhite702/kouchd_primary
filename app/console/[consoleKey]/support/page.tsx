import { SupportExplorer } from "@/components/platform/support-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";
import { getFreshdeskOpsStatus } from "@/lib/platform/providers";

export default async function ConsoleSupportPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  const status = getFreshdeskOpsStatus();
  return <SupportExplorer status={status} />;
}
