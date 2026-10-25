import { NotificationsExplorer } from "@/components/platform/notifications-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformNotificationsPage() {
  await requirePlatformOpsAccess();
  return <NotificationsExplorer />;
}
