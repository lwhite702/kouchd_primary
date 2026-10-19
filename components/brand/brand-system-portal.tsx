"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Grid,
  Home,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  BookOpen,
  Presentation,
} from "lucide-react";

import { BrandGuidelinesDocument } from "@/components/brand/brand-guidelines-document";
import {
  KouchdLogoLockup,
  KouchdLogoClearspace,
  renderKouchdLogoSvgString,
  KouchdLogoVariant,
  KouchdLogoTheme,
} from "@/components/brand/kouchd-logo";
import {
  BrandShape,
  BrandImageMask,
  BrandIllustrationCard,
  RELATABLE_BRAND_SHAPES,
  RELATABLE_SHAPE_METADATA,
} from "@/components/brand/brand-shapes";
import { BrandButton, BrandSocialButton, BrandButtonVariant, BrandButtonSize } from "@/components/ui/brand-button";
import { BrandTag, BrandTagVariant, BrandTagSize } from "@/components/ui/brand-tag";
import {
  BrandSpacer,
  BrandSpacerSize,
  BrandDivider,
  BrandCard,
} from "@/components/ui/brand-layout-primitives";

type TabId = "guidelines" | "assets" | "social" | "carousel" | "elements";

export function BrandSystemPortal() {
  const [activeTab, setActiveTab] = React.useState<TabId>("guidelines");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // fallback
    }
  };

  const downloadSvgFile = (svgContent: string, fileName: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="brand-portal-root min-h-screen bg-[var(--kouchd-neutral-0)] text-[var(--kouchd-forest-90)] font-sans selection:bg-[var(--kouchd-lime-40)] selection:text-[var(--kouchd-forest-90)]">
      {/* Brand Portal Header */}
      <header
        className="sticky top-0 z-40 bg-[var(--kouchd-surface)]/95 backdrop-blur-md border-b border-[var(--kouchd-neutral-20)] px-4 sm:px-8 py-3.5 flex items-center justify-between"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(255, 253, 248, 0.95)",
        }}
      >
        <div className="flex items-center gap-4" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" className="inline-flex items-center hover:opacity-85 transition-opacity" aria-label="Kouchd Home" style={{ display: "inline-flex", alignItems: "center" }}>
            <KouchdLogoLockup variant="horizontal" theme="dark" size="sm" />
          </Link>
          <span className="hidden sm:inline-block h-4 w-px bg-[var(--kouchd-neutral-30)]" />
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-lime-60)]"
            style={{ alignItems: "center", gap: "6px" }}
          >
            <Sparkles className="w-3 h-3" style={{ width: 12, height: 12, flexShrink: 0 }} /> Design System v1.0
          </span>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "guidelines"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              ...(activeTab === "guidelines"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            Brand Guidelines
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "assets"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              ...(activeTab === "assets"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "social"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              ...(activeTab === "social"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            Social Kits
          </button>
          <button
            onClick={() => setActiveTab("carousel")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "carousel"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              ...(activeTab === "carousel"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            Carousels
          </button>
          <button
            onClick={() => setActiveTab("elements")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "elements"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              ...(activeTab === "elements"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            Web Elements
          </button>
        </nav>

        <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)] transition-colors"
            style={{ alignItems: "center", gap: "6px", padding: "6px 12px" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ width: 14, height: 14, flexShrink: 0 }} /> Back to App
          </Link>
        </div>
      </header>

      {/* Main Tab Panels */}
      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {activeTab === "guidelines" && (
          <BrandGuidelinesTab
            copiedKey={copiedKey}
            onCopy={copyToClipboard}
            onDownload={downloadSvgFile}
          />
        )}
        {activeTab === "assets" && (
          <AssetsRepositoryTab
            copiedKey={copiedKey}
            onCopy={copyToClipboard}
            onDownload={downloadSvgFile}
          />
        )}
        {activeTab === "social" && <SocialMediaTab />}
        {activeTab === "carousel" && <MarketingCarouselTab />}
        {activeTab === "elements" && <WebElementsTab />}
      </main>

      {/* Brand Portal Footer */}
      <footer className="brand-portal-footer mt-20 border-t border-[var(--kouchd-neutral-20)] py-8 px-4 text-center text-xs text-[var(--kouchd-neutral-60)]">
        <p className="mb-2">
          <strong>Kouchd Brand Building Design System</strong> · Operated by{" "}
          <strong>Wrelik Brands LLC</strong>
        </p>
        <p
          className="flex justify-center items-center gap-4 flex-wrap"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
            marginTop: "12px",
          }}
        >
          <Link
            href="/"
            className="hover:underline text-[var(--kouchd-forest-80)]"
            style={{ display: "inline-flex", padding: "6px 10px" }}
          >
            Home
          </Link>
          <Link
            href="/privacy"
            className="hover:underline text-[var(--kouchd-forest-80)]"
            style={{ display: "inline-flex", padding: "6px 10px" }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:underline text-[var(--kouchd-forest-80)]"
            style={{ display: "inline-flex", padding: "6px 10px" }}
          >
            Terms of Service
          </Link>
          <Link
            href="/sms-opt-in"
            className="hover:underline text-[var(--kouchd-forest-80)]"
            style={{ display: "inline-flex", padding: "6px 10px" }}
          >
            SMS Opt-In
          </Link>
          <a
            href="https://help.kouchd.com"
            target="_blank"
            rel="noreferrer"
            className="hover:underline text-[var(--kouchd-forest-80)]"
            style={{ display: "inline-flex", padding: "6px 10px" }}
          >
            Help Center
          </a>
        </p>
      </footer>
    </div>
  );
}

/* =========================================================================
   1. BRAND GUIDELINES (Document Mode + 16:10 Presentation Deck Toggle)
   ========================================================================= */

interface BrandGuidelinesTabProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onDownload: (svgContent: string, fileName: string) => void;
}

function BrandGuidelinesTab({ copiedKey, onCopy, onDownload }: BrandGuidelinesTabProps) {
  const [viewMode, setViewMode] = React.useState<"document" | "deck">("document");

  return (
    <div className="space-y-6">
      {/* Top View Mode Switcher Header */}
      <div className="bg-[var(--kouchd-surface)] rounded-2xl border border-[var(--kouchd-neutral-20)] p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-sm sm:text-base font-bold text-[var(--kouchd-forest-90)]">
              Brand Guidelines &amp; Identity Standards
            </h2>
            <p className="text-xs text-[var(--kouchd-neutral-60)]">
              {viewMode === "document"
                ? "Full scrollable editorial guide with interactive color tokens, SVG vector downloads & live type tester."
                : "16:10 presentation deck viewer for team reviews and pitch meetings."}
            </p>
          </div>
        </div>

        {/* View Switch Buttons */}
        <div
          className="flex items-center gap-1.5 bg-[var(--kouchd-neutral-10)] p-1 rounded-xl border border-[var(--kouchd-neutral-20)]"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <button
            onClick={() => setViewMode("document")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "document"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:text-[var(--kouchd-forest-90)]"
            }`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "8px",
              ...(viewMode === "document"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            <BookOpen className="w-3.5 h-3.5" style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>Document View (Default)</span>
          </button>
          <button
            onClick={() => setViewMode("deck")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "deck"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "text-[var(--kouchd-forest-70)] hover:text-[var(--kouchd-forest-90)]"
            }`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "8px",
              ...(viewMode === "deck"
                ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                : { color: "var(--kouchd-forest-70)" }),
            }}
          >
            <Presentation className="w-3.5 h-3.5" style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>16:10 Presentation Deck</span>
          </button>
        </div>
      </div>

      {viewMode === "document" ? (
        <BrandGuidelinesDocument
          copiedKey={copiedKey}
          onCopy={onCopy}
          onDownload={onDownload}
        />
      ) : (
        <GuidelinesDeckTab />
      )}
    </div>
  );
}

interface SlideItem {
  id: string;
  number: string;
  title: string;
  category: string;
  render: () => React.ReactNode;
}

function GuidelinesDeckTab() {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const slides: SlideItem[] = [
    {
      id: "cover",
      number: "00",
      title: "Brand Guidelines & System",
      category: "Introduction",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-forest-90)] text-[#ffffff] p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-20 -top-20 opacity-10">
            <BrandShape type="cushion" size={480} color="var(--kouchd-lime-40)" />
          </div>
          <div className="flex items-center justify-between z-10">
            <KouchdLogoLockup variant="horizontal" theme="cream" size="md" />
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider bg-[var(--kouchd-forest-80)] border border-[var(--kouchd-forest-70)] text-[var(--kouchd-lime-40)]">
              BRAND GUIDELINES 16:10
            </span>
          </div>
          <div className="z-10 my-auto py-8">
            <div className="text-xs uppercase tracking-widest text-[var(--kouchd-lime-40)] font-bold mb-3">
              Kouchd Design Foundation
            </div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[#ffffff] max-w-2xl mb-4">
              Private shared living made easier to coordinate.
            </h1>
            <p className="text-base md:text-xl text-[var(--kouchd-neutral-20)] font-sans max-w-xl font-normal leading-relaxed">
              Warm, homey, calm, and capable. Our principles, voice, tokens, components, and social guidelines.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-40)] border-t border-[var(--kouchd-forest-80)] pt-4 z-10">
            <span>Operated by Wrelik Brands LLC</span>
            <span>Slide 00 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "story",
      number: "01",
      title: "Mission & Brand Story",
      category: "Foundations",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                01 · Brand Foundation
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Our Story &amp; Purpose
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto py-6">
            <div className="space-y-4">
              <h3 className="font-heading text-xl md:text-2xl font-bold leading-snug text-[var(--kouchd-forest-90)]">
                Shared living shouldn&apos;t feel like running an accounts payable department.
              </h3>
              <p className="text-sm md:text-base text-[var(--kouchd-neutral-80)] leading-relaxed">
                When friends, family, or housemates share a home or weekend stay, financial ambiguity and forgotten chores create subtle strain. Spreadsheets feel cold and confrontational; group texts bury important check-in agreements.
              </p>
              <p className="text-sm md:text-base text-[var(--kouchd-neutral-80)] leading-relaxed">
                Kouchd brings warmth, privacy, and gentle transparency to private households. We keep everyone aligned without awkward debt dynamics.
              </p>
            </div>
            <div className="bg-[var(--kouchd-sage-10)] p-6 md:p-8 rounded-2xl border border-[var(--kouchd-sage-30)] flex flex-col justify-between">
              <div className="space-y-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] inline-block">
                  Brand Promise
                </span>
                <p className="font-heading text-lg md:text-xl font-bold text-[var(--kouchd-forest-90)] italic">
                  &ldquo;A calm, private shared-stay workspace where everyone knows what to expect, what to contribute, and how to relax together.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-[var(--kouchd-sage-30)] flex items-center gap-3">
                <BrandShape type="lamp" size={40} color="var(--kouchd-forest-70)" />
                <span className="text-xs font-semibold text-[var(--kouchd-forest-80)]">
                  Harmony · Privacy · Clarity
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 01 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "audience",
      number: "02",
      title: "Audience & Two-Sided Trust",
      category: "Strategy",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                02 · People &amp; Roles
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Hosts &amp; Guests in Harmony
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto py-4">
            <div className="bg-[var(--kouchd-neutral-10)] p-6 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
                <Home className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">The Host</h3>
              <p className="text-xs md:text-sm text-[var(--kouchd-neutral-70)] leading-relaxed">
                Welcoming people into their home or family cabin. They want house rules respected and shared costs covered without feeling like a nagging landlord.
              </p>
              <ul className="text-xs text-[var(--kouchd-neutral-80)] space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Share wifi, access &amp; stay dates once
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Log utilities &amp; groceries into the Ledger
                </li>
              </ul>
            </div>

            <div className="bg-[var(--kouchd-neutral-10)] p-6 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">The Guest</h3>
              <p className="text-xs md:text-sm text-[var(--kouchd-neutral-70)] leading-relaxed">
                Staying with friends or family. They want to be courteous, pull their fair weight, and avoid the guesswork of what they owe or when check-out happens.
              </p>
              <ul className="text-xs text-[var(--kouchd-neutral-80)] space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Clear visibility into house agreements
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Transparent contribution ledger
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 02 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "voice",
      number: "03",
      title: "Tone of Voice & Terminology Rules",
      category: "Voice & Tone",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                03 · Brand Voice &amp; Policy
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Plainspoken, Respectful &amp; Calm
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto py-4">
            <div className="bg-emerald-50/60 border border-emerald-200/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approved Vocabulary (Always Use)</span>
              </div>
              <ul className="text-xs text-emerald-950 space-y-2">
                <li>
                  <strong>&ldquo;Host&rdquo; &amp; &ldquo;Guest&rdquo;</strong>: Private individuals coordinating a stay.
                </li>
                <li>
                  <strong>&ldquo;Stay&rdquo;</strong>: The shared occasion or household living arrangement.
                </li>
                <li>
                  <strong>&ldquo;Ledger&rdquo; &amp; &ldquo;Contribution&rdquo;</strong>: A shared memory of financial participation.
                </li>
                <li>
                  <strong>&ldquo;Add contribution&rdquo;</strong>: Recording what was spent or agreed upon.
                </li>
                <li>
                  <strong>Plainspoken, warm sentences</strong>: Reassure and simplify.
                </li>
              </ul>
            </div>

            <div className="bg-rose-50/60 border border-rose-200/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Prohibited Language (Never Use)</span>
              </div>
              <ul className="text-xs text-rose-950 space-y-2">
                <li>
                  <strong>Never say &ldquo;debt&rdquo;, &ldquo;debtor&rdquo;, or &ldquo;collections&rdquo;</strong>.
                </li>
                <li>
                  <strong>Never claim Kouchd moves, holds, or processes payments</strong>.
                </li>
                <li>
                  <strong>No corporate jargon or high-pressure tactics</strong> (&ldquo;synergy&rdquo;, &ldquo;penalties&rdquo;).
                </li>
                <li>
                  <strong>No fabricated social proof or luxury tropes</strong>.
                </li>
                <li>
                  <strong>Never send SMS without explicit consent</strong>.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Strict adherence to AGENTS.md</span>
            <span>Slide 03 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "logo",
      number: "04",
      title: "Logo System & Minimum Clearspace",
      category: "Identity",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                04 · Visual Identity
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Logo Lockups &amp; Clearspace
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto py-4 items-center">
            <div className="bg-[var(--kouchd-neutral-10)] p-6 rounded-2xl border border-[var(--kouchd-neutral-20)] flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
              <KouchdLogoLockup variant="horizontal" theme="dark" size="md" />
              <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">Horizontal Lockup (Primary)</span>
            </div>

            <div className="bg-[var(--kouchd-forest-90)] p-6 rounded-2xl border border-[var(--kouchd-forest-80)] flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
              <KouchdLogoLockup variant="horizontal" theme="cream" size="md" />
              <span className="text-xs font-medium text-[var(--kouchd-neutral-30)]">Dark Mode / Inverted Lockup</span>
            </div>

            <div className="bg-[var(--kouchd-lime-40)] p-6 rounded-2xl border border-[var(--kouchd-lime-60)] flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]">
              <KouchdLogoLockup variant="vertical" theme="dark" size="sm" />
              <span className="text-xs font-medium text-[var(--kouchd-forest-90)]">Vertical Stacked Lockup</span>
            </div>
          </div>

          <div className="bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)] p-4 rounded-xl flex items-center justify-between flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-4">
              <KouchdLogoClearspace variant="horizontal" />
              <div>
                <strong>Minimum Clearspace:</strong> Maintain a minimum perimeter padding equal to half the height of the logomark (X/2) on all sides.
              </div>
            </div>
            <span className="font-mono text-[11px] text-[var(--kouchd-neutral-60)]">Do not stretch, rotate, or alter colors</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 04 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "colors",
      number: "05",
      title: "Color Palette & 11-Step Scales",
      category: "Color",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                05 · Color System
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                The 11-Step Palette Ramp (0–90)
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="space-y-4 my-auto py-2">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--kouchd-forest-80)] mb-1.5">
                <span>Primary: Forest Anchor (#184f3a)</span>
                <span className="font-mono text-[10px]">--kouchd-forest-0..90</span>
              </div>
              <div className="grid grid-cols-11 gap-1 h-9 rounded-lg overflow-hidden border border-[var(--kouchd-neutral-20)]">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((step) => (
                  <div
                    key={step}
                    style={{ background: `var(--kouchd-forest-${step})` }}
                    className="flex items-center justify-center text-[9px] font-mono font-bold text-white/80"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--kouchd-forest-80)] mb-1.5">
                <span>Accent: Lime Energy (#dff25e)</span>
                <span className="font-mono text-[10px]">--kouchd-lime-0..90</span>
              </div>
              <div className="grid grid-cols-11 gap-1 h-9 rounded-lg overflow-hidden border border-[var(--kouchd-neutral-20)]">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((step) => (
                  <div
                    key={step}
                    style={{ background: `var(--kouchd-lime-${step})` }}
                    className="flex items-center justify-center text-[9px] font-mono font-bold text-black/70"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--kouchd-forest-80)] mb-1.5">
                <span>Secondary: Sage &amp; Sky Calm</span>
                <span className="font-mono text-[10px]">--kouchd-sage &amp; --kouchd-sky</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                <div className="p-2 rounded-lg bg-[var(--kouchd-sage-20)] border border-[var(--kouchd-sage-40)] text-xs font-semibold text-[var(--kouchd-forest-90)] text-center">
                  Sage 20
                </div>
                <div className="p-2 rounded-lg bg-[var(--kouchd-sage-50)] text-xs font-semibold text-white text-center">
                  Sage 50
                </div>
                <div className="p-2 rounded-lg bg-[var(--kouchd-sky-20)] border border-[var(--kouchd-sky-40)] text-xs font-semibold text-[var(--kouchd-forest-90)] text-center">
                  Sky 20
                </div>
                <div className="p-2 rounded-lg bg-[var(--kouchd-sky-50)] text-xs font-semibold text-white text-center">
                  Sky 50
                </div>
                <div className="p-2 rounded-lg bg-[var(--kouchd-coral-40)] text-xs font-semibold text-white text-center">
                  Coral 40
                </div>
                <div className="p-2 rounded-lg bg-[var(--kouchd-coral-80)] text-xs font-semibold text-white text-center">
                  Coral 80
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 05 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "typography",
      number: "06",
      title: "Typography Scale & Pairings",
      category: "Typography",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                06 · Typography System
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Manrope (Heading) &amp; Inter (Body)
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto py-4">
            <div className="space-y-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--kouchd-forest-90)] text-white">
                Titles: Manrope (Bold / Extrabold)
              </span>
              <div className="space-y-2 border-l-2 border-[var(--kouchd-forest-40)] pl-4">
                <div className="font-heading text-3xl font-extrabold tracking-tight">Title / XXL (48px)</div>
                <div className="font-heading text-2xl font-bold tracking-tight">Title / XL (36px)</div>
                <div className="font-heading text-xl font-bold">Title / L (28px)</div>
                <div className="font-heading text-lg font-bold">Title / M (22px)</div>
                <div className="font-heading text-base font-bold">Title / S (18px)</div>
              </div>
            </div>

            <div className="space-y-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--kouchd-neutral-20)] text-[var(--kouchd-forest-90)]">
                Body: Inter (Regular / Medium / SemiBold)
              </span>
              <div className="space-y-2 border-l-2 border-[var(--kouchd-neutral-30)] pl-4 font-sans text-[var(--kouchd-neutral-80)]">
                <p className="text-lg leading-relaxed font-normal">
                  Text / XL (20px) — Lead paragraphs and introductions.
                </p>
                <p className="text-base leading-relaxed font-normal">
                  Text / L (16px) — Primary body copy and reading experience.
                </p>
                <p className="text-sm leading-normal font-medium">
                  Text / M (14px) — Secondary metadata and UI form labels.
                </p>
                <p className="text-xs leading-normal font-medium">
                  Text / S (12px) — Captions, timestamps, badges.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 06 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "graphics",
      number: "07",
      title: "Brand Graphics, Shapes & Masks",
      category: "Graphics",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                07 · Brand Graphics
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                6 Relatable Home Motifs &amp; Asymmetric Masks
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 my-auto py-4">
            {RELATABLE_BRAND_SHAPES.map((st) => {
              const meta = RELATABLE_SHAPE_METADATA[st];
              return (
                <div
                  key={st}
                  className="bg-[var(--kouchd-neutral-10)] p-3 rounded-2xl border border-[var(--kouchd-neutral-20)] flex flex-col items-center justify-center text-center space-y-1.5"
                >
                  <BrandShape type={st} size={50} color="var(--kouchd-forest-80)" />
                  <span className="text-[11px] font-heading font-bold text-[var(--kouchd-forest-90)]">
                    {meta.name}
                  </span>
                  <span className="text-[9px] text-[var(--kouchd-forest-60)] leading-tight">
                    {meta.subtitle}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-[var(--kouchd-sage-10)] p-4 rounded-xl border border-[var(--kouchd-sage-30)] flex items-center justify-between gap-6 text-xs">
            <div className="w-24 shrink-0">
              <BrandImageMask orientation="square" roundCorner="top-right">
                <div className="w-full h-full bg-gradient-to-tr from-[var(--kouchd-forest-90)] to-[var(--kouchd-lime-40)] flex items-center justify-center p-2 text-[10px] font-bold text-white text-center">
                  16x90 Mask
                </div>
              </BrandImageMask>
            </div>
            <div>
              <strong>Brand Image Masking:</strong> Characteristic asymmetric border-radius (<code>16px 90px 16px 16px</code>) for high-impact editorial imagery and hero photography.
            </div>
            <span className="font-mono text-[11px] text-[var(--kouchd-forest-70)] shrink-0">Signature Kouchd Silhouette</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 07 of 11</span>
          </div>
        </div>
      ),
    },
    {
      id: "applications",
      number: "08",
      title: "Real-World Applications & Merch",
      category: "Application",
      render: () => (
        <div className="h-full w-full bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-90)] p-8 md:p-14 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
            <div>
              <span className="text-xs font-bold text-[var(--kouchd-forest-60)] tracking-widest uppercase">
                08 · Physical Touchpoints
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-[var(--kouchd-forest-90)]">
                Lived-in, Homey Applications
              </h2>
            </div>
            <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto py-4">
            <div className="bg-[#f0ece1] p-6 rounded-2xl border border-[var(--kouchd-neutral-30)] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-20 h-28 bg-[#dfd9c9] rounded-sm shadow-md border border-[#c4bead] p-3 flex flex-col justify-between items-center">
                <div className="w-12 h-1 bg-[#8c8270] rounded-full" />
                <KouchdLogoLockup variant="logomark" theme="dark" size="xs" />
                <span className="text-[7px] font-mono text-[#665e50]">HOUSE GUIDE</span>
              </div>
              <strong className="text-xs text-[var(--kouchd-forest-90)]">Printed House Guide Folder</strong>
            </div>

            <div className="bg-[var(--kouchd-forest-90)] p-6 rounded-2xl border border-[var(--kouchd-forest-80)] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-20 h-24 bg-[#1f382e] rounded-b-xl rounded-t-sm shadow-lg border border-[#2b4c3e] flex flex-col items-center justify-center p-2 relative">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--kouchd-lime-40)] flex items-center justify-center">
                  <KouchdLogoLockup variant="logomark" theme="cream" size="xs" />
                </div>
              </div>
              <strong className="text-xs text-white">Ceramic Cabin Coffee Mug</strong>
            </div>

            <div className="bg-[var(--kouchd-lime-40)] p-6 rounded-2xl border border-[var(--kouchd-lime-60)] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-[var(--kouchd-forest-90)] shadow-md flex items-center justify-center p-3">
                <KouchdLogoLockup variant="vertical" theme="cream" size="xs" />
              </div>
              <strong className="text-xs text-[var(--kouchd-forest-90)]">Welcome Sticker &amp; Key Fob</strong>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kouchd-neutral-50)] border-t border-[var(--kouchd-neutral-20)] pt-4">
            <span>Kouchd Brand Guidelines</span>
            <span>Slide 08 of 11</span>
          </div>
        </div>
      ),
    },
  ];

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-6">
      {/* Top Deck Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--kouchd-surface)] p-4 rounded-2xl border border-[var(--kouchd-neutral-20)] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--kouchd-forest-90)] text-[#ffffff]">
            SLIDE {currentSlide.number}
          </span>
          <div>
            <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
              {currentSlide.title}
            </h3>
            <span className="text-xs text-[var(--kouchd-neutral-60)]">{currentSlide.category}</span>
          </div>
        </div>

        {/* Deck Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="p-2 rounded-xl border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--kouchd-forest-90)]" />
          </button>
          <span className="text-xs font-mono font-bold px-2 text-[var(--kouchd-forest-80)]">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-2 rounded-xl border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 text-[var(--kouchd-forest-90)]" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 ml-2 rounded-xl border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] transition-colors"
            aria-label="Toggle Fullscreen View"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-[var(--kouchd-forest-90)]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[var(--kouchd-forest-90)]" />
            )}
          </button>
        </div>
      </div>

      {/* 16:10 Slide Presentation Aspect Container */}
      <div
        className={`w-full mx-auto transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 md:p-8"
            : ""
        }`}
      >
        <div
          className={`w-full relative shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-[var(--kouchd-neutral-30)] ${
            isFullscreen ? "max-w-6xl max-h-[90vh] aspect-[16/10]" : "aspect-[16/10] max-w-5xl"
          }`}
        >
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
              aria-label="Exit Fullscreen"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}
          {currentSlide.render()}
        </div>
      </div>

      {/* Slide Thumbnails Rail */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setCurrentSlideIndex(idx)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              idx === currentSlideIndex
                ? "bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-lime-60)] shadow-sm scale-105"
                : "bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-neutral-60)] hover:bg-[var(--kouchd-neutral-20)]"
            }`}
          >
            {s.number} {s.title.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   2. BRAND ASSETS REPOSITORY (SVGs & Swatches)
   ========================================================================= */

interface AssetsTabProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onDownload: (svgContent: string, fileName: string) => void;
}

function AssetsRepositoryTab({ copiedKey, onCopy, onDownload }: AssetsTabProps) {
  const logoAssets: Array<{
    id: string;
    name: string;
    variant: KouchdLogoVariant;
    theme: KouchdLogoTheme;
    bgClass: string;
  }> = [
    {
      id: "horizontal-dark",
      name: "Horizontal Lockup (Dark Ink)",
      variant: "horizontal",
      theme: "dark",
      bgClass: "bg-[var(--kouchd-surface)]",
    },
    {
      id: "horizontal-cream",
      name: "Horizontal Lockup (Cream)",
      variant: "horizontal",
      theme: "cream",
      bgClass: "bg-[var(--kouchd-forest-90)]",
    },
    {
      id: "vertical-dark",
      name: "Vertical Stacked (Dark)",
      variant: "vertical",
      theme: "dark",
      bgClass: "bg-[var(--kouchd-surface)]",
    },
    {
      id: "vertical-cream",
      name: "Vertical Stacked (Cream)",
      variant: "vertical",
      theme: "cream",
      bgClass: "bg-[var(--kouchd-forest-90)]",
    },
    {
      id: "logomark-dark",
      name: "Logomark / Couch Symbol (Dark)",
      variant: "logomark",
      theme: "dark",
      bgClass: "bg-[var(--kouchd-surface)]",
    },
    {
      id: "app-icon",
      name: "App Icon Squircle (Forest & Lime)",
      variant: "app-icon",
      theme: "lime",
      bgClass: "bg-[var(--kouchd-neutral-10)]",
    },
  ];

  const paletteColors: Array<{ name: string; hex: string; variable: string; category: string }> = [
    { name: "Forest Anchor", hex: "#184f3a", variable: "--kouchd-forest-90", category: "Primary" },
    { name: "Forest Deep", hex: "#1e5e46", variable: "--kouchd-forest-80", category: "Primary" },
    { name: "Lime Highlight", hex: "#dff25e", variable: "--kouchd-lime-40", category: "Accent" },
    { name: "Lime Glow", hex: "#e7f682", variable: "--kouchd-lime-30", category: "Accent" },
    { name: "Sage Tint", hex: "#e5edde", variable: "--kouchd-sage-20", category: "Secondary" },
    { name: "Sage Base", hex: "#8fb582", variable: "--kouchd-sage-50", category: "Secondary" },
    { name: "Sky Calm", hex: "#c9e7f0", variable: "--kouchd-sky-20", category: "Secondary" },
    { name: "Coral Energy", hex: "#ed755c", variable: "--kouchd-coral-40", category: "Secondary" },
    { name: "Warm Paper", hex: "#f5f0e8", variable: "--kouchd-neutral-0", category: "Neutral" },
    { name: "Warm Surface", hex: "#fffdf8", variable: "--kouchd-surface", category: "Neutral" },
    { name: "Dark Ink", hex: "#17251f", variable: "--kouchd-forest-90", category: "Neutral" },
    { name: "Muted Olive", hex: "#59675f", variable: "--kouchd-neutral-60", category: "Neutral" },
  ];

  return (
    <div className="space-y-12">
      {/* Logos Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
          <div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-[var(--kouchd-forest-90)]">
              Logo Vectors &amp; Assets
            </h2>
            <p className="text-xs md:text-sm text-[var(--kouchd-neutral-60)]">
              Production SVG vector files for digital, print, and native app manifests.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)]">
            SVG Vector Direct Export
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logoAssets.map((asset) => {
            const svgContent = renderKouchdLogoSvgString({
              variant: asset.variant,
              theme: asset.theme,
            });

            return (
              <div
                key={asset.id}
                className="bg-[var(--kouchd-surface)] rounded-2xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div
                  className={`h-40 flex items-center justify-center p-6 ${asset.bgClass} border-b border-[var(--kouchd-neutral-20)]`}
                >
                  <KouchdLogoLockup variant={asset.variant} theme={asset.theme} size="md" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">
                      {asset.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDownload(svgContent, `kouchd-${asset.id}.svg`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--kouchd-forest-90)] text-[#ffffff] hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" /> Download SVG
                    </button>
                    <button
                      onClick={() => onCopy(svgContent, `svg-${asset.id}`)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)] transition-colors"
                      title="Copy raw SVG text"
                    >
                      {copiedKey === `svg-${asset.id}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Colors Swatches Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--kouchd-neutral-20)] pb-4">
          <div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-[var(--kouchd-forest-90)]">
              Color Tokens &amp; Swatches
            </h2>
            <p className="text-xs md:text-sm text-[var(--kouchd-neutral-60)]">
              Click any swatch to copy Hex or CSS token variable to your clipboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {paletteColors.map((color) => (
            <div
              key={color.hex}
              onClick={() => onCopy(color.hex, color.hex)}
              className="group bg-[var(--kouchd-surface)] p-3 rounded-2xl border border-[var(--kouchd-neutral-20)] cursor-pointer hover:border-[var(--kouchd-forest-50)] transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
            >
              <div
                style={{ backgroundColor: color.hex }}
                className="w-full h-16 rounded-xl border border-black/5 shadow-inner mb-3 relative flex items-center justify-center"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-md px-2 py-0.5 text-[10px] font-mono flex items-center gap-1">
                  {copiedKey === color.hex ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Hex
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--kouchd-forest-60)]">
                  {color.category}
                </span>
                <div className="font-heading text-xs font-bold text-[var(--kouchd-forest-90)] truncate">
                  {color.name}
                </div>
                <div className="font-mono text-[11px] text-[var(--kouchd-neutral-60)]">
                  {color.hex}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================================================================
   3. SOCIAL MEDIA KITS (LinkedIn, IG, YouTube, X, FB)
   ========================================================================= */

function SocialMediaTab() {
  const [platform, setPlatform] = React.useState<"linkedin" | "instagram" | "youtube" | "x" | "facebook">("linkedin");

  return (
    <div className="space-y-8">
      {/* Platform Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--kouchd-neutral-20)]">
        {[
          { id: "linkedin", label: "LinkedIn" },
          { id: "instagram", label: "Instagram" },
          { id: "youtube", label: "YouTube" },
          { id: "x", label: "X / Twitter" },
          { id: "facebook", label: "Facebook" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setPlatform(item.id as typeof platform)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              platform === item.id
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                : "bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-70)] border border-[var(--kouchd-neutral-20)] hover:bg-[var(--kouchd-neutral-10)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Social Banner & Profile Preview Mock */}
      <div className="space-y-6">
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-lg">
          {/* Cover Banner Mock */}
          <div className="w-full h-44 sm:h-56 md:h-64 bg-gradient-to-r from-[var(--kouchd-forest-90)] via-[var(--kouchd-forest-80)] to-[#11382a] relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none">
              <BrandShape type="archway" size={320} color="var(--kouchd-lime-40)" />
            </div>

            <div className="z-10 flex items-center justify-between">
              <KouchdLogoLockup variant="horizontal" theme="cream" size="sm" />
              <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-[var(--kouchd-lime-40)] px-2.5 py-0.5 rounded-full bg-white/10">
                Official Header
              </span>
            </div>

            <div className="z-10 max-w-lg">
              <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[#ffffff] leading-tight">
                Private shared living made easier to coordinate.
              </h2>
              <p className="text-xs sm:text-sm text-[var(--kouchd-neutral-20)] mt-1">
                Stay details, updates, and contributions in one calm workspace.
              </p>
            </div>
          </div>

          {/* Social Profile Header Info */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[var(--kouchd-surface)] p-2 shadow-xl border-4 border-[var(--kouchd-surface)]">
                <div className="w-full h-full rounded-2xl bg-[var(--kouchd-forest-90)] flex items-center justify-center text-[var(--kouchd-lime-40)]">
                  <KouchdLogoLockup variant="logomark" theme="cream" size="md" />
                </div>
              </div>
              <div className="mb-2">
                <h1 className="font-heading text-lg sm:text-xl font-extrabold text-[var(--kouchd-forest-90)] flex items-center gap-1.5">
                  Kouchd <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </h1>
                <p className="text-xs text-[var(--kouchd-neutral-60)]">@kouchd · Private Stay Coordination</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <BrandButton size="sm" variant="primary">
                Follow
              </BrandButton>
              <BrandButton size="sm" variant="outline">
                Visit Website
              </BrandButton>
            </div>
          </div>
        </div>

        {/* Post Card Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Post Template 1: Square Feed (1080x1080) */}
          <div className="bg-[var(--kouchd-surface)] rounded-2xl border border-[var(--kouchd-neutral-20)] p-4 space-y-3 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[var(--kouchd-forest-60)]">
              FEED CARD (1:1 SQUARE)
            </span>
            <div className="aspect-square bg-[var(--kouchd-forest-90)] rounded-xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-center">
                <KouchdLogoLockup variant="horizontal" theme="cream" size="xs" />
                <span className="text-[10px] text-[var(--kouchd-lime-40)] font-mono">TIPS</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--kouchd-lime-40)] font-semibold mb-2">
                  House Harmony
                </p>
                <h3 className="font-heading text-lg sm:text-xl font-bold leading-snug">
                  Never have an awkward conversation about grocery splits again.
                </h3>
              </div>
              <div className="text-[11px] text-[var(--kouchd-neutral-30)] border-t border-[var(--kouchd-forest-80)] pt-2 flex justify-between">
                <span>The Ledger on Kouchd</span>
                <span>kouchd.com</span>
              </div>
            </div>
          </div>

          {/* Post Template 2: Portrait Story (1080x1920 / 4:5) */}
          <div className="bg-[var(--kouchd-surface)] rounded-2xl border border-[var(--kouchd-neutral-20)] p-4 space-y-3 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[var(--kouchd-forest-60)]">
              STORY / REEL COVER (4:5)
            </span>
            <div className="aspect-[4/5] bg-[var(--kouchd-lime-40)] rounded-xl p-6 text-[var(--kouchd-forest-90)] flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-center">
                <KouchdLogoLockup variant="logomark" theme="dark" size="sm" />
                <BrandTag size="xs" variant="dark">
                  New Feature
                </BrandTag>
              </div>
              <div className="space-y-2">
                <h3 className="font-heading text-xl font-extrabold leading-tight">
                  Private household access for hosts and guests.
                </h3>
                <p className="text-xs font-medium text-[var(--kouchd-forest-80)]">
                  All dates, chores, and contributions in one safe place.
                </p>
              </div>
              <div className="text-xs font-bold text-[var(--kouchd-forest-90)] underline">
                Swipe up to learn more &rarr;
              </div>
            </div>
          </div>

          {/* Post Template 3: Landscape Post (1200x630) */}
          <div className="bg-[var(--kouchd-surface)] rounded-2xl border border-[var(--kouchd-neutral-20)] p-4 space-y-3 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[var(--kouchd-forest-60)]">
              LINK SHARE / OPEN GRAPH (1.91:1)
            </span>
            <div className="aspect-[1.91/1] bg-[var(--kouchd-sage-10)] rounded-xl p-5 border border-[var(--kouchd-sage-30)] text-[var(--kouchd-forest-90)] flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <KouchdLogoLockup variant="horizontal" theme="dark" size="xs" />
                <span className="text-[10px] font-mono text-[var(--kouchd-forest-70)]">kouchd.com</span>
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
                  Make the next shared stay feel easier.
                </h3>
                <p className="text-xs text-[var(--kouchd-neutral-70)]">
                  Bring the people, details, and expectations together.
                </p>
              </div>
              <div className="text-[10px] font-semibold text-[var(--kouchd-forest-80)]">
                Shared living with a little more clarity.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. MARKETING AIDA CAROUSELS (10-Slide Framework)
   ========================================================================= */

interface CarouselSlideData {
  number: number;
  stage: "Attention" | "Interest" | "Desire" | "Action";
  tag: string;
  headline: string;
  body: string;
  footer: string;
}

function MarketingCarouselTab() {
  const [aspect, setAspect] = React.useState<"portrait" | "square">("portrait");
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const carouselSlides: CarouselSlideData[] = [
    {
      number: 1,
      stage: "Attention",
      tag: "The Struggle",
      headline: "How to coordinate a shared stay without the awkward spreadsheet.",
      body: "Friends visiting for the weekend? Family staying the month? Here is how to keep the peace.",
      footer: "Swipe &rarr; (1/10)",
    },
    {
      number: 2,
      stage: "Attention",
      tag: "The Problem",
      headline: "Shared living shouldn't feel like running an accounts payable department.",
      body: "Group chats bury house agreements. Spreadsheets feel cold and clinical. Minor costs turn into major tension.",
      footer: "Swipe &rarr; (2/10)",
    },
    {
      number: 3,
      stage: "Attention",
      tag: "The Reality",
      headline: "You love having people over, but the details get messy.",
      body: "Who is grabbing groceries? What was the wifi password again? When is the checkout time?",
      footer: "Swipe &rarr; (3/10)",
    },
    {
      number: 4,
      stage: "Interest",
      tag: "The Solution",
      headline: "Meet Kouchd: Private shared living made calm and simple.",
      body: "A dedicated workspace designed specifically for hosts and guests living under one roof.",
      footer: "Swipe &rarr; (4/10)",
    },
    {
      number: 5,
      stage: "Interest",
      tag: "Pillar 1: House Guide",
      headline: "Share stay details once. Everyone is on the exact same page.",
      body: "From trash day reminders to door codes, everything lives in one clean view.",
      footer: "Swipe &rarr; (5/10)",
    },
    {
      number: 6,
      stage: "Interest",
      tag: "Pillar 2: The Ledger",
      headline: "The Ledger: Transparent contribution records everyone can see.",
      body: "Record who chipped in for utilities, dinners, or supplies without calculating complex debts.",
      footer: "Swipe &rarr; (6/10)",
    },
    {
      number: 7,
      stage: "Interest",
      tag: "Pillar 3: Gentle Updates",
      headline: "Respectful notifications without the awkward group pressure.",
      body: "Optional SMS check-ins and to-do updates keep things moving smoothly.",
      footer: "Swipe &rarr; (7/10)",
    },
    {
      number: 8,
      stage: "Desire",
      tag: "Harmony",
      headline: "No awkward money talk. Just clear, shared memory.",
      body: "Enjoy having friends over knowing the logistics are handled with dignity.",
      footer: "Swipe &rarr; (8/10)",
    },
    {
      number: 9,
      stage: "Desire",
      tag: "Peace of Mind",
      headline: "Private households moving from tension to clarity.",
      body: "More time relaxing on the couch. Zero time arguing over receipt splits.",
      footer: "Swipe &rarr; (9/10)",
    },
    {
      number: 10,
      stage: "Action",
      tag: "Get Started",
      headline: "Make your next shared stay feel effortless.",
      body: "Set up your private stay in 60 seconds at kouchd.com.",
      footer: "Get Started Today · kouchd.com",
    },
  ];

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % carouselSlides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPlaying, carouselSlides.length]);

  const slide = carouselSlides[currentSlideIndex];

  return (
    <div className="space-y-6">
      {/* Aspect Ratio and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--kouchd-surface)] p-4 rounded-2xl border border-[var(--kouchd-neutral-20)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kouchd-forest-80)] mr-2">Format:</span>
          <button
            onClick={() => setAspect("portrait")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspect === "portrait"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff]"
                : "bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)]"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Portrait (4:5 / 1080x1350)
          </button>
          <button
            onClick={() => setAspect("square")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aspect === "square"
                ? "bg-[var(--kouchd-forest-90)] text-[#ffffff]"
                : "bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)]"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> Square (1:1 / 1080x1080)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] text-xs font-semibold flex items-center gap-1.5"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause Auto-play" : "Auto-play"}
          </button>
          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="p-2 rounded-xl border border-[var(--kouchd-neutral-30)] disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-2">
            {currentSlideIndex + 1} / {carouselSlides.length}
          </span>
          <button
            onClick={() =>
              setCurrentSlideIndex((prev) => Math.min(carouselSlides.length - 1, prev + 1))
            }
            disabled={currentSlideIndex === carouselSlides.length - 1}
            className="p-2 rounded-xl border border-[var(--kouchd-neutral-30)] disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel Card Presentation View */}
      <div className="flex justify-center items-center py-4">
        <div
          className={`w-full max-w-md bg-[var(--kouchd-forest-90)] text-[#ffffff] rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 border border-[var(--kouchd-forest-80)] ${
            aspect === "portrait" ? "aspect-[4/5]" : "aspect-square"
          }`}
        >
          {/* Subtle background brand graphic */}
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <BrandShape type="cushion" size={260} color="var(--kouchd-lime-40)" />
          </div>

          {/* Slide Top Metadata */}
          <div className="flex items-center justify-between z-10">
            <KouchdLogoLockup variant="horizontal" theme="cream" size="xs" />
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)]">
              {slide.stage}
            </span>
          </div>

          {/* Slide Body */}
          <div className="space-y-4 my-auto py-4 z-10">
            <span className="text-xs uppercase tracking-widest text-[var(--kouchd-lime-40)] font-bold">
              {slide.tag}
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold leading-tight text-[#ffffff]">
              {slide.headline}
            </h2>
            <p className="text-sm sm:text-base text-[var(--kouchd-neutral-20)] leading-relaxed font-sans">
              {slide.body}
            </p>
          </div>

          {/* Slide Bottom Bar */}
          <div className="flex items-center justify-between border-t border-[var(--kouchd-forest-80)] pt-4 z-10 text-xs text-[var(--kouchd-neutral-40)]">
            <span className="font-mono">{slide.footer}</span>
            <div className="flex gap-1.5">
              {carouselSlides.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentSlideIndex
                      ? "bg-[var(--kouchd-lime-40)] w-4"
                      : "bg-[var(--kouchd-forest-70)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   5. WEB ELEMENTS PLAYGROUND (Buttons, Tags, Spacers, Grids)
   ========================================================================= */

function WebElementsTab() {
  // BrandButton controls
  const [btnVariant, setBtnVariant] = React.useState<BrandButtonVariant>("primary");
  const [btnSize, setBtnSize] = React.useState<BrandButtonSize>("md");
  const [btnLoading, setBtnLoading] = React.useState(false);
  const [btnDisabled, setBtnDisabled] = React.useState(false);

  // BrandTag controls
  const [tagVariant, setTagVariant] = React.useState<BrandTagVariant>("primary");
  const [tagSize, setTagSize] = React.useState<BrandTagSize>("md");

  // BrandSpacer controls
  const [spacerSize, setSpacerSize] = React.useState<BrandSpacerSize>(24);
  const [spacerDebug, setSpacerDebug] = React.useState(true);

  // Grid overlay control
  const [showGridOverlay, setShowGridOverlay] = React.useState(false);

  return (
    <div className="space-y-12 relative">
      {/* Blueprint Grid Overlay if toggled */}
      {showGridOverlay && (
        <div className="fixed inset-0 pointer-events-none z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-4 lg:grid-cols-12 gap-4 lg:gap-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`h-full bg-rose-500/10 border-x border-rose-500/20 ${
                i >= 4 ? "hidden lg:block" : ""
              }`}
            />
          ))}
        </div>
      )}

      {/* Grid Overlay Toggle Bar */}
      <div className="bg-[var(--kouchd-surface)] p-4 rounded-2xl border border-[var(--kouchd-neutral-20)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-[var(--kouchd-forest-80)]" />
          <span className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">
            Design Grid Inspection (12-Col Desktop / 4-Col Mobile)
          </span>
        </div>
        <button
          onClick={() => setShowGridOverlay(!showGridOverlay)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            showGridOverlay
              ? "bg-rose-600 text-white"
              : "bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)] border border-[var(--kouchd-neutral-30)]"
          }`}
        >
          {showGridOverlay ? "Hide Grid Overlay" : "Show 12-Column Blueprint Grid"}
        </button>
      </div>

      {/* Brand Buttons Section */}
      <section className="bg-[var(--kouchd-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--kouchd-neutral-20)] space-y-6">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4">
          <h2 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
            Brand Buttons (Figma 674:12622)
          </h2>
          <p className="text-xs text-[var(--kouchd-neutral-60)]">
            Accessible, stateful buttons with focus rings, hover scaling, and variant hierarchy.
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-[var(--kouchd-neutral-10)] p-4 rounded-2xl text-xs">
          <div>
            <label className="font-bold text-[var(--kouchd-forest-80)] block mb-1">Variant:</label>
            <select
              value={btnVariant}
              onChange={(e) => setBtnVariant(e.target.value as BrandButtonVariant)}
              className="p-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] bg-white text-xs"
            >
              <option value="primary">Primary (Lime)</option>
              <option value="secondary">Secondary (Forest)</option>
              <option value="outline">Outline</option>
              <option value="outline-white">Outline White</option>
              <option value="black">Black / Ink</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-[var(--kouchd-forest-80)] block mb-1">Size:</label>
            <select
              value={btnSize}
              onChange={(e) => setBtnSize(e.target.value as BrandButtonSize)}
              className="p-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] bg-white text-xs"
            >
              <option value="sm">Small (sm)</option>
              <option value="md">Medium (md)</option>
              <option value="lg">Large (lg)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--kouchd-forest-80)]">
              <input
                type="checkbox"
                checked={btnLoading}
                onChange={(e) => setBtnLoading(e.target.checked)}
                className="rounded"
              />
              Loading State
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--kouchd-forest-80)]">
              <input
                type="checkbox"
                checked={btnDisabled}
                onChange={(e) => setBtnDisabled(e.target.checked)}
                className="rounded"
              />
              Disabled
            </label>
          </div>
        </div>

        {/* Live Playground Preview */}
        <div className="p-8 rounded-2xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)] flex flex-wrap items-center justify-center gap-6">
          <BrandButton
            variant={btnVariant}
            size={btnSize}
            loading={btnLoading}
            disabled={btnDisabled}
          >
            Live Button Component
          </BrandButton>

          <BrandButton
            variant={btnVariant}
            size={btnSize}
            iconRight={<ArrowRight className="w-4 h-4" />}
            disabled={btnDisabled}
          >
            With Icon Slot
          </BrandButton>
        </div>

        {/* Social Action Buttons Preview */}
        <div className="pt-4 border-t border-[var(--kouchd-neutral-20)] space-y-3">
          <h3 className="font-heading text-sm font-bold text-[var(--kouchd-forest-80)]">
            Auth &amp; Social Buttons (Google, Apple, SMS)
          </h3>
          <div className="flex flex-wrap gap-4">
            <BrandSocialButton provider="google" />
            <BrandSocialButton provider="apple" />
            <BrandSocialButton provider="phone" />
          </div>
        </div>
      </section>

      {/* Brand Tags Section */}
      <section className="bg-[var(--kouchd-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--kouchd-neutral-20)] space-y-6">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4">
          <h2 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
            Brand Tags &amp; Badges (Figma 1175:2699)
          </h2>
          <p className="text-xs text-[var(--kouchd-neutral-60)]">
            5 discrete size tokens (xs, sm, md, lg, xl) and 9 color variants.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-[var(--kouchd-neutral-10)] p-4 rounded-2xl text-xs">
          <div>
            <label className="font-bold text-[var(--kouchd-forest-80)] block mb-1">Variant:</label>
            <select
              value={tagVariant}
              onChange={(e) => setTagVariant(e.target.value as BrandTagVariant)}
              className="p-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] bg-white text-xs"
            >
              <option value="primary">Primary (Lime)</option>
              <option value="secondary">Secondary (Sage)</option>
              <option value="light">Light</option>
              <option value="dark">Dark (Forest)</option>
              <option value="outline">Outline</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="alert">Alert</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-[var(--kouchd-forest-80)] block mb-1">Size:</label>
            <select
              value={tagSize}
              onChange={(e) => setTagSize(e.target.value as BrandTagSize)}
              className="p-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] bg-white text-xs"
            >
              <option value="xs">XS (10px)</option>
              <option value="sm">SM (13px)</option>
              <option value="md">MD (16px)</option>
              <option value="lg">LG (20px)</option>
              <option value="xl">XL (26px)</option>
            </select>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)] flex flex-wrap items-center justify-center gap-4">
          <BrandTag size={tagSize} variant={tagVariant}>
            {tagVariant.toUpperCase()} TAG
          </BrandTag>
          <BrandTag size={tagSize} variant={tagVariant} emoji="🌿">
            With Emoji
          </BrandTag>
          <BrandTag
            size={tagSize}
            variant={tagVariant}
            onDismiss={() => alert("Tag dismissed")}
          >
            Dismissable Tag
          </BrandTag>
        </div>

        {/* All sizes matrix */}
        <div className="pt-4 border-t border-[var(--kouchd-neutral-20)] space-y-2">
          <h3 className="font-heading text-sm font-bold text-[var(--kouchd-forest-80)]">
            Size Ramp (XS to XL)
          </h3>
          <div className="flex flex-wrap items-baseline gap-3">
            <BrandTag size="xs" variant="primary">
              Size XS
            </BrandTag>
            <BrandTag size="sm" variant="secondary">
              Size SM
            </BrandTag>
            <BrandTag size="md" variant="dark">
              Size MD
            </BrandTag>
            <BrandTag size="lg" variant="light">
              Size LG
            </BrandTag>
            <BrandTag size="xl" variant="outline">
              Size XL
            </BrandTag>
          </div>
        </div>
      </section>

      {/* Brand Spacer & Blueprint Debugger */}
      <section className="bg-[var(--kouchd-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--kouchd-neutral-20)] space-y-6">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4">
          <h2 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
            Brand Spacers &amp; Blueprint Visualizer (Figma 392:23703)
          </h2>
          <p className="text-xs text-[var(--kouchd-neutral-60)]">
            Strict 4px to 64px layout spacer scale with visual blueprint rulers for pair programming.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-[var(--kouchd-neutral-10)] p-4 rounded-2xl text-xs">
          <div>
            <label className="font-bold text-[var(--kouchd-forest-80)] block mb-1">
              Spacer Token ({spacerSize}px):
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {([4, 8, 12, 16, 24, 32, 40, 48, 56, 64] as BrandSpacerSize[]).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSpacerSize(sz)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                    spacerSize === sz
                      ? "bg-[var(--kouchd-forest-90)] text-[#ffffff]"
                      : "bg-white border border-[var(--kouchd-neutral-30)] text-[var(--kouchd-forest-80)]"
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 sm:pt-0 sm:ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--kouchd-forest-80)]">
              <input
                type="checkbox"
                checked={spacerDebug}
                onChange={(e) => setSpacerDebug(e.target.checked)}
                className="rounded"
              />
              Show Blueprint Ruler Mode
            </label>
          </div>
        </div>

        {/* Live Spacer Demonstration */}
        <div className="p-6 rounded-2xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)] space-y-2">
          <div className="p-3 bg-[var(--kouchd-surface)] rounded-xl border border-[var(--kouchd-neutral-30)] text-xs font-semibold text-center text-[var(--kouchd-forest-80)]">
            Element Above
          </div>
          <BrandSpacer size={spacerSize} debug={spacerDebug} />
          <div className="p-3 bg-[var(--kouchd-surface)] rounded-xl border border-[var(--kouchd-neutral-30)] text-xs font-semibold text-center text-[var(--kouchd-forest-80)]">
            Element Below (Separated by exact token)
          </div>
        </div>
      </section>

      {/* Brand Cards & Layout Surfaces */}
      <section className="bg-[var(--kouchd-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--kouchd-neutral-20)] space-y-6">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4">
          <h2 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
            Brand Cards, Illustrations &amp; Dividers
          </h2>
          <p className="text-xs text-[var(--kouchd-neutral-60)]">
            Homey surfaces, warm card elevations, scene illustrations, and branded separators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BrandCard variant="paper" elevation="sm">
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)] mb-1">
              Paper Surface (Default)
            </h4>
            <p className="text-xs text-[var(--kouchd-neutral-60)]">
              Warm, calm surface for household dashboard cards.
            </p>
          </BrandCard>

          <BrandCard variant="lime" elevation="md">
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)] mb-1">
              Lime Accent Surface
            </h4>
            <p className="text-xs text-[var(--kouchd-forest-80)]">
              High-visibility card for feature callouts and highlights.
            </p>
          </BrandCard>

          <BrandCard variant="dark" elevation="lg">
            <h4 className="font-heading text-sm font-bold text-[#ffffff] mb-1">
              Forest Dark Anchor
            </h4>
            <p className="text-xs text-[var(--kouchd-neutral-30)]">
              Deep, cozy container for night-mode and focal messaging.
            </p>
          </BrandCard>
        </div>

        <BrandDivider label="Household Scene Illustrations" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BrandIllustrationCard
            scene="kitchen"
            title="Shared Kitchen Guide"
            description="Clear expectations on groceries and cleanup."
          />
          <BrandIllustrationCard
            scene="ledger"
            title="Stay Ledger"
            description="Contributions recorded in harmony without debts."
          />
          <BrandIllustrationCard
            scene="checkin"
            title="Check-In Harmony"
            description="Door codes and arrival times in one private view."
          />
        </div>
      </section>
    </div>
  );
}

