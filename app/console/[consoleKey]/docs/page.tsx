import { DocsExplorer } from "@/components/platform/docs-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";
import { getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function ConsoleDocsPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  const status = getMintlifyOpsStatus();
  return <DocsExplorer status={status} />;
}
