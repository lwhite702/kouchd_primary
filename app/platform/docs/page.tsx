import { DocsExplorer } from "@/components/platform/docs-explorer";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function PlatformDocsPage() {
  await requirePlatformOpsAccess();
  const status = getMintlifyOpsStatus();
  return <DocsExplorer status={status} />;
}
