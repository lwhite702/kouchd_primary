import { UsersExplorer } from "@/components/platform/users-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformUsersPage() {
  await requirePlatformOpsAccess();
  return <UsersExplorer />;
}
