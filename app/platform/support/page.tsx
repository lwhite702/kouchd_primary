import { SupportExplorer } from "@/components/platform/support-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { getFreshdeskOpsStatus } from "@/lib/platform/providers";

export default async function PlatformSupportPage() {
  await requirePlatformOpsAccess();
  const status = getFreshdeskOpsStatus();
  return <SupportExplorer status={status} />;
}
