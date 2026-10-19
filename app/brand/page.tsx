import type { Metadata } from "next";
import { BrandSystemPortal } from "@/components/brand/brand-system-portal";

export const metadata: Metadata = {
  title: "Brand & Design System | Kouchd",
  description:
    "The official Kouchd Brand Building Design System: guidelines deck, 11-step color tokens, vector assets, social media kits, and web UI elements.",
  openGraph: {
    title: "Brand & Design System | Kouchd",
    description:
      "Private shared living made easier to coordinate. Official brand guidelines, design tokens, and components for Kouchd.",
  },
};

export default function BrandPage() {
  return <BrandSystemPortal />;
}
