import { SupportExplorer } from "@/components/platform/support-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { getHelpScoutOpsStatus } from "@/lib/platform/providers";

export default async function PlatformSupportPage() {
  await requirePlatformOpsAccess();
  const status = getHelpScoutOpsStatus();
  return <SupportExplorer status={status} />;
}
