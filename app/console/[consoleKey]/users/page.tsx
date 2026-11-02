import { UsersExplorer } from "@/components/platform/users-explorer";
import { requirePlatformConsole } from "@/lib/platform/console";

export default async function ConsoleUsersPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <UsersExplorer />;
}
