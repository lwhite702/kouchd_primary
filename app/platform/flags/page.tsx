import { FlagsExplorer } from "@/components/platform/flags-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformFlagsPage() {
  await requirePlatformOpsAccess();
  return <FlagsExplorer />;
}
