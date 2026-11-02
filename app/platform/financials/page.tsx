import { FinancialsExplorer } from "@/components/platform/financials-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformFinancialsPage() {
  await requirePlatformOpsAccess();
  return <FinancialsExplorer />;
}
