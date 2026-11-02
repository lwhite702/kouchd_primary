import { ComplianceExplorer } from "@/components/platform/compliance-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleCompliancePage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <ComplianceExplorer />;
}
