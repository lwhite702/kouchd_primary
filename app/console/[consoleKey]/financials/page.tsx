import { FinancialsExplorer } from "@/components/platform/financials-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleFinancialsPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <FinancialsExplorer />;
}
