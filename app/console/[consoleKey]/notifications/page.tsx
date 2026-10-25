import { NotificationsExplorer } from "@/components/platform/notifications-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleNotificationsPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <NotificationsExplorer />;
}
