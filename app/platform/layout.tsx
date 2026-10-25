import type { Metadata } from "next";
import { requirePlatformOpsAccess } from "@/lib/platform/console";
import { ConsoleShell } from "@/components/platform/console-shell";
import "@/app/console.css";

export const metadata: Metadata = {
  title: "Platform Ops Console | Kouchd",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlatformOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformOpsAccess();

  return (
    <ConsoleShell basePath="/platform" admin={admin}>
      {children}
    </ConsoleShell>
  );
}
