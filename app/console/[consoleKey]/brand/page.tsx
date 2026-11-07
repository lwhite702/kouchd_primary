import type { Metadata } from "next";
import { BrandSystemPortal } from "@/components/brand/brand-system-portal";
import { requirePlatformConsole } from "@/lib/platform/console";

export const metadata: Metadata = {
  title: "Brand & Design System | Ops Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConsoleBrandPage({
  params,
}: {
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return (
    <div style={{ padding: "0 var(--space-4, 16px) var(--space-8, 32px)" }}>
      <BrandSystemPortal />
    </div>
  );
}
