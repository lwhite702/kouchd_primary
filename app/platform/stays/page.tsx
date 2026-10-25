import { StaysExplorer } from "@/components/platform/stays-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export default async function PlatformStaysPage() {
  await requirePlatformOpsAccess();
  return <StaysExplorer />;
}
