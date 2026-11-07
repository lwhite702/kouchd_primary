import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Brand & Design System | Kouchd",
  description:
    "The official Kouchd Brand Building Design System: guidelines deck, 11-step color tokens, vector assets, social media kits, and web UI elements.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BrandPage() {
  notFound();
}
