import { MarketingExplorer } from "@/components/platform/marketing-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleMarketingPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <MarketingExplorer />;
}
