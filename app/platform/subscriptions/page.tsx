import { SubscriptionsExplorer } from "@/components/platform/subscriptions-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformSubscriptionsPage() {
  await requirePlatformOpsAccess();
  return <SubscriptionsExplorer />;
}
