import { MarketingExplorer } from "@/components/platform/marketing-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformMarketingPage() {
  await requirePlatformOpsAccess();
  return <MarketingExplorer />;
}
