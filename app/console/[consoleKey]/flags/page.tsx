import { FlagsExplorer } from "@/components/platform/flags-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleFlagsPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <FlagsExplorer />;
}
