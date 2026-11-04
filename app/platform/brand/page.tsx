import type { Metadata } from "next";
import { BrandSystemPortal } from "@/components/brand/brand-system-portal";
import { requirePlatformOpsAccess } from "@/lib/platform/console";

export const metadata: Metadata = {
  title: "Brand & Design System | Platform Ops",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlatformBrandPage() {
  await requirePlatformOpsAccess();
  return (
    <div style={{ padding: "0 var(--space-4, 16px) var(--space-8, 32px)" }}>
      <BrandSystemPortal />
    </div>
  );
}
