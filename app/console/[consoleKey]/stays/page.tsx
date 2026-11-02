import { StaysExplorer } from "@/components/platform/stays-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleStaysPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <StaysExplorer />;
}
