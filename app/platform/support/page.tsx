import { SupportExplorer } from "@/components/platform/support-explorer";
import { getHelpScoutOpsStatus } from "@/lib/platform/providers";

export default async function PlatformSupportPage() {
  const status = getHelpScoutOpsStatus();
  return <SupportExplorer status={status} />;
}
