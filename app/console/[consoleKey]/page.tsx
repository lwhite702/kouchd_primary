import { OverviewDashboard } from "@/components/platform/overview-dashboard";

export default async function ConsoleOverviewPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  return <OverviewDashboard consoleKey={consoleKey} />;
}
