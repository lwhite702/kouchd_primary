import { DocsExplorer } from "@/components/platform/docs-explorer";
import { getMintlifyOpsStatus } from "@/lib/platform/providers";

export default async function PlatformDocsPage() {
  const status = getMintlifyOpsStatus();
  return <DocsExplorer status={status} />;
}
