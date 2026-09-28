import type { Metadata } from "next";
import { requirePlatformConsole } from "@/lib/platform/console";
import { ConsoleShell } from "@/components/platform/console-shell";
import "@/app/console.css";

export const metadata: Metadata = {
  title: "Platform Console | Kouchd",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConsoleLayout({
  params,
  children,
}: {
  params: Promise<{ consoleKey: string }>;
  children: React.ReactNode;
}) {
  const { consoleKey } = await params;
  const admin = await requirePlatformConsole(consoleKey);

  return (
    <ConsoleShell consoleKey={consoleKey} admin={admin}>
      {children}
    </ConsoleShell>
  );
}
