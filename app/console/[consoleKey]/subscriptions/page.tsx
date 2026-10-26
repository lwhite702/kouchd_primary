import { SubscriptionsExplorer } from "@/components/platform/subscriptions-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleSubscriptionsPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <SubscriptionsExplorer />;
}
