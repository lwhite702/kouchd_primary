"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  HeartHandshake,
  Home,
  Layers,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Type,
  Users,
  XCircle,
  Sliders,
} from "lucide-react";

import {
  KouchdLogoLockup,
  KouchdLogoClearspace,
  renderKouchdLogoSvgString,
  KouchdLogoVariant,
  KouchdLogoTheme,
} from "@/components/brand/kouchd-logo";
import {
  BrandShape,
  BrandShapeType,
  BrandImageMask,
} from "@/components/brand/brand-shapes";

interface BrandGuidelinesDocumentProps {
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  onDownload: (svgContent: string, fileName: string) => void;
}

export function BrandGuidelinesDocument({
  copiedKey,
  onCopy,
  onDownload,
}: BrandGuidelinesDocumentProps) {
  const [activeSection, setActiveSection] = React.useState("story");
  const [typeTesterText, setTypeTesterText] = React.useState(
    "Private shared living made easier to coordinate."
  );
  const [activeColorRamp, setActiveColorRamp] = React.useState<"forest" | "lime" | "sage" | "neutrals">("forest");

  const sections = [
    { id: "story", label: "01 Story & Purpose", icon: BookOpen },
    { id: "roles", label: "02 Hosts & Guests", icon: Users },
    { id: "voice", label: "03 Voice & Rules", icon: FileText },
    { id: "logos", label: "04 Logo & Clearspace", icon: ShieldCheck },
    { id: "colors", label: "05 Color Scales", icon: Palette },
    { id: "typography", label: "06 Typography & Tester", icon: Type },
    { id: "graphics", label: "07 Shapes & Masks", icon: Layers },
    { id: "applications", label: "08 Physical Swag", icon: Sparkles },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -120;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Color Ramps data
  const forestSteps = [
    { step: 0, hex: "#f0f8f4", label: "00 Tint" },
    { step: 10, hex: "#d8eee2", label: "10 Soft" },
    { step: 20, hex: "#b4dec8", label: "20 Pale" },
    { step: 30, hex: "#8bc9aa", label: "30 Light" },
    { step: 40, hex: "#63b18c", label: "40 Mid Light" },
    { step: 50, hex: "#439670", label: "50 Base" },
    { step: 60, hex: "#2f7d5a", label: "60 Deep" },
    { step: 70, hex: "#226648", label: "70 Dark" },
    { step: 80, hex: "#1e5e46", label: "80 Forest Deep" },
    { step: 90, hex: "#184f3a", label: "90 Forest Anchor" },
  ];

  const limeSteps = [
    { step: 0, hex: "#fcfef2", label: "00 Tint" },
    { step: 10, hex: "#f7fde2", label: "10 Soft" },
    { step: 20, hex: "#f0fac5", label: "20 Pale" },
    { step: 30, hex: "#e7f682", label: "30 Lime Glow" },
    { step: 40, hex: "#dff25e", label: "40 Lime Energy" },
    { step: 50, hex: "#c9dc3f", label: "50 Base" },
    { step: 60, hex: "#adc127", label: "60 Vivid" },
    { step: 70, hex: "#8f9f1b", label: "70 Olive Glow" },
    { step: 80, hex: "#6f7b15", label: "80 Deep Lime" },
    { step: 90, hex: "#525a10", label: "90 Olive Deep" },
  ];

  const sageSteps = [
    { step: 0, hex: "#f7faf5", label: "00 Tint" },
    { step: 20, hex: "#e5edde", label: "20 Sage Tint" },
    { step: 40, hex: "#b8d4ab", label: "40 Soft Sage" },
    { step: 50, hex: "#8fb582", label: "50 Sage Base" },
    { step: 70, hex: "#5d8251", label: "70 Deep Sage" },
    { step: 90, hex: "#3a5631", label: "90 Dark Pine" },
  ];

  const neutralSteps = [
    { step: 0, hex: "#f5f0e8", label: "Warm Paper (Neutral 0)" },
    { step: 10, hex: "#eee8dd", label: "Cream Soft (Neutral 10)" },
    { step: 20, hex: "#e2dacb", label: "Sand Border (Neutral 20)" },
    { step: 40, hex: "#b8ac97", label: "Warm Gray (Neutral 40)" },
    { step: 60, hex: "#59675f", label: "Muted Olive (Neutral 60)" },
    { step: 90, hex: "#17251f", label: "Dark Ink (Neutral 90)" },
  ];

  const logoCards: Array<{
    id: string;
    name: string;
    variant: KouchdLogoVariant;
    theme: KouchdLogoTheme;
    bgClass: string;
    usage: string;
    dimensions: string;
  }> = [
    {
      id: "horizontal-dark",
      name: "Horizontal Primary (Dark Ink)",
      variant: "horizontal",
      theme: "dark",
      bgClass: "bg-[var(--kouchd-surface)]",
      usage: "Primary header navigation, marketing decks, documentation, invoices.",
      dimensions: "Min height: 28px (Digital), 12mm (Print)",
    },
    {
      id: "horizontal-cream",
      name: "Horizontal Inverted (Cream on Forest)",
      variant: "horizontal",
      theme: "cream",
      bgClass: "bg-[var(--kouchd-forest-90)]",
      usage: "Dark footers, high-contrast hero sections, mobile splash screens.",
      dimensions: "Min height: 28px (Digital), 12mm (Print)",
    },
    {
      id: "vertical-dark",
      name: "Vertical Stacked (Dark Ink)",
      variant: "vertical",
      theme: "dark",
      bgClass: "bg-[var(--kouchd-surface)]",
      usage: "Centered brand moments, sign-in dialogs, square print collaterals.",
      dimensions: "Min height: 48px (Digital), 20mm (Print)",
    },
    {
      id: "logomark-icon",
      name: "App Icon & Standalone Couch Mark",
      variant: "app-icon",
      theme: "lime",
      bgClass: "bg-[var(--kouchd-neutral-10)]",
      usage: "iOS/macOS app icons, favicons, social avatars, compact badge pills.",
      dimensions: "Sizes: 16px, 32px, 64px, 180px, 512px",
    },
  ];

  return (
    <div className="space-y-16 max-w-6xl mx-auto pb-24">
      {/* Editorial Hero Header */}
      <div
        className="bg-gradient-to-br from-[var(--kouchd-forest-90)] via-[var(--kouchd-forest-80)] to-[#103b2b] text-[#ffffff] rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-xl border border-[var(--kouchd-forest-70)]"
        style={{
          background: "linear-gradient(135deg, #081d15 0%, #0e2e22 50%, #103b2b 100%)",
          color: "#ffffff",
        }}
      >
        <div className="absolute -right-24 -top-24 opacity-15 pointer-events-none">
          <BrandShape type="globe" size={540} color="var(--kouchd-lime-40)" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--kouchd-forest-70)] border border-[var(--kouchd-forest-60)] text-[var(--kouchd-lime-40)]"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--kouchd-forest-70)", color: "var(--kouchd-lime-40)" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>Kouchd Official Brand Guidelines · Version 1.0</span>
          </div>

          <h1
            className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white"
            style={{ color: "#ffffff" }}
          >
            Private shared living made easier to coordinate.
          </h1>

          <p
            className="text-base sm:text-xl text-[var(--kouchd-neutral-20)] font-sans leading-relaxed max-w-2xl"
            style={{ color: "var(--kouchd-neutral-20)" }}
          >
            Warm, homey, calm, and capable. Our mission, voice principles, typography, 11-step color ramp, logo clearspace, and physical touchpoint standards.
          </p>

          <div
            className="pt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--kouchd-neutral-30)]"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", color: "var(--kouchd-neutral-30)" }}
          >
            <span className="flex items-center gap-1.5 font-medium" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck className="w-4 h-4 text-[var(--kouchd-lime-40)]" style={{ width: 16, height: 16, flexShrink: 0 }} /> Operated by Wrelik Brands LLC
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--kouchd-forest-60)]" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--kouchd-forest-60)" }} />
            <span>Typography: Manrope &amp; Inter</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--kouchd-forest-60)]" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--kouchd-forest-60)" }} />
            <span>Primary Anchor: Forest 90 (#184f3a)</span>
          </div>
        </div>
      </div>

      {/* Sticky Table of Contents Quick-Jump Bar */}
      <nav
        aria-label="Brand Guidelines Sections"
        className="sticky top-[58px] z-30 bg-[var(--kouchd-surface)]/95 backdrop-blur-md border border-[var(--kouchd-neutral-20)] rounded-2xl p-2 shadow-md overflow-x-auto flex items-center gap-1 sm:gap-2"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          backgroundColor: "rgba(255, 253, 248, 0.95)",
        }}
      >
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isCurrent = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isCurrent
                  ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm scale-[1.02]"
                  : "text-[var(--kouchd-forest-70)] hover:bg-[var(--kouchd-neutral-10)] hover:text-[var(--kouchd-forest-90)]"
              }`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
                ...(isCurrent
                  ? { backgroundColor: "var(--kouchd-forest-90)", color: "#ffffff" }
                  : { color: "var(--kouchd-forest-70)" }),
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </nav>

      {/* =====================================================================
          SECTION 01: BRAND STORY & PURPOSE
          ===================================================================== */}
      <section id="story" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              01 · Brand Foundation
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Story &amp; Purpose
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Harmony · Privacy · Everyday Clarity
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5 text-[var(--kouchd-neutral-80)] leading-relaxed">
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-[var(--kouchd-forest-90)] leading-snug">
              Shared living shouldn&apos;t feel like running an accounts payable department.
            </h3>
            <p className="text-base">
              When friends, couples, or extended families share a home, cabin, or weekend stay, financial ambiguity and forgotten house agreements create subtle friction. Spreadsheets feel cold and adversarial; chaotic group text threads bury wifi passwords and split expenses.
            </p>
            <p className="text-base">
              Kouchd brings warmth, privacy, and gentle transparency to private households. We replace awkward money talks and scattered notes with a calm, lived-in space where expectations are clear from day one.
            </p>
            <p className="text-base">
              We never treat guests like debtors, and we never turn hosts into collection agents. Kouchd fosters hospitable harmony through mutual clarity.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[var(--kouchd-sage-10)] border border-[var(--kouchd-sage-30)] rounded-3xl p-7 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-lime-60)]">
                Brand Promise
              </span>
              <BrandShape type="halo" size={36} color="var(--kouchd-forest-70)" />
            </div>
            <blockquote className="font-heading text-lg sm:text-xl font-bold text-[var(--kouchd-forest-90)] italic leading-relaxed">
              &ldquo;A calm, private shared-stay workspace where everyone knows what to expect, what to contribute, and how to relax together.&rdquo;
            </blockquote>
            <div className="pt-4 border-t border-[var(--kouchd-sage-30)] text-xs text-[var(--kouchd-forest-80)] flex items-center justify-between">
              <span>Wrelik Brands LLC</span>
              <span className="font-mono">kouchd.com</span>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="bg-[var(--kouchd-surface)] p-5 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">Warmth &amp; Hospitality</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Soft curves, inviting cream surfaces, and reassuring language that feels like home, not enterprise SaaS.
            </p>
          </div>

          <div className="bg-[var(--kouchd-surface)] p-5 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">Strict Privacy</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Private households only. No public listing directories, no unsolicited social sharing, no data selling.
            </p>
          </div>

          <div className="bg-[var(--kouchd-surface)] p-5 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">Everyday Clarity</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              House rules, stay dates, and access details set once so nobody has to repeat themselves or guess.
            </p>
          </div>

          <div className="bg-[var(--kouchd-surface)] p-5 rounded-2xl border border-[var(--kouchd-neutral-20)] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-sm font-bold text-[var(--kouchd-forest-90)]">Mutual Ledger</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              A shared contribution memory. Everyone sees what was spent without awkward collection pressure.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 02: AUDIENCE & TWO-SIDED TRUST
          ===================================================================== */}
      <section id="roles" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              02 · People &amp; Roles
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Hosts &amp; Guests in Harmony
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Two Sides · One Shared Agreement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Host Card */}
          <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-7 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[var(--kouchd-forest-90)] text-[var(--kouchd-lime-40)] flex items-center justify-center font-bold">
                  <Home className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[var(--kouchd-forest-10)] text-[var(--kouchd-forest-80)] border border-[var(--kouchd-forest-20)]">
                  ROLE: HOST
                </span>
              </div>

              <div>
                <h3 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
                  The Host
                </h3>
                <p className="text-sm text-[var(--kouchd-neutral-60)] mt-1">
                  Homeowner, primary leaseholder, or cabin organizer welcoming guests.
                </p>
              </div>

              <p className="text-sm text-[var(--kouchd-neutral-80)] leading-relaxed">
                Hosts want their home and boundaries respected without coming across as rigid or demanding. They want shared utilities and grocery costs recorded fairly without having to chase people down.
              </p>

              <div className="space-y-2 pt-2 border-t border-[var(--kouchd-neutral-20)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--kouchd-forest-70)] block">
                  Key Host Workflows:
                </span>
                <ul className="text-xs text-[var(--kouchd-neutral-80)] space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Set house rules, wifi passwords, and arrival notes once.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Log shared household costs into the Ledger via &ldquo;Add contribution&rdquo;.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Send friendly, automated agreement updates with zero emotional charge.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-[var(--kouchd-neutral-10)] p-4 rounded-2xl text-xs text-[var(--kouchd-forest-80)] italic border border-[var(--kouchd-neutral-20)]">
              &ldquo;I love having friends visit, but I hated having to remind them about the propane refill. Kouchd makes it completely natural.&rdquo;
            </div>
          </div>

          {/* Guest Card */}
          <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-7 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)] flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[var(--kouchd-lime-20)] text-[var(--kouchd-forest-90)] border border-[var(--kouchd-lime-40)]">
                  ROLE: GUEST
                </span>
              </div>

              <div>
                <h3 className="font-heading text-xl font-bold text-[var(--kouchd-forest-90)]">
                  The Guest
                </h3>
                <p className="text-sm text-[var(--kouchd-neutral-60)] mt-1">
                  Friend, family member, or housemate staying at the home or property.
                </p>
              </div>

              <p className="text-sm text-[var(--kouchd-neutral-80)] leading-relaxed">
                Guests want to be considerate, pull their fair weight, and respect the host&apos;s space. They dislike awkward guesswork around check-out expectations, chores, or what they owe for weekend supplies.
              </p>

              <div className="space-y-2 pt-2 border-t border-[var(--kouchd-neutral-20)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--kouchd-forest-70)] block">
                  Key Guest Workflows:
                </span>
                <ul className="text-xs text-[var(--kouchd-neutral-80)] space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Review check-in notes, wifi, and stay guidelines before arrival.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>View shared expenses transparently in the stay Ledger.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Record groceries or household supplies brought to the stay.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-[var(--kouchd-neutral-10)] p-4 rounded-2xl text-xs text-[var(--kouchd-forest-80)] italic border border-[var(--kouchd-neutral-20)]">
              &ldquo;I always worried I was overstaying or under-contributing. Seeing everything written down gave me total peace of mind.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 03: BRAND VOICE & POLICY RULES
          ===================================================================== */}
      <section id="voice" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              03 · Brand Voice &amp; Policy
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Plainspoken, Respectful &amp; Calm
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Strict AGENTS.md Adherence
          </span>
        </div>

        {/* Voice Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--kouchd-surface)] border border-[var(--kouchd-neutral-20)] space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--kouchd-forest-70)] uppercase">01 · Tone</span>
            <h4 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">Plainspoken</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Use everyday words and active, uncomplicated sentences. Avoid corporate speak, SaaS buzzwords, or legalese.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--kouchd-surface)] border border-[var(--kouchd-neutral-20)] space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--kouchd-forest-70)] uppercase">02 · Tone</span>
            <h4 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">Respectful</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Honor the intimacy of living together. Never induce guilt, shame, or pressure around household responsibilities.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--kouchd-surface)] border border-[var(--kouchd-neutral-20)] space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--kouchd-forest-70)] uppercase">03 · Tone</span>
            <h4 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">Reassuring</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Provide calm clarity. Ground communications in shared expectations so everyone feels confident and welcome.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--kouchd-surface)] border border-[var(--kouchd-neutral-20)] space-y-2">
            <span className="text-xs font-mono font-bold text-[var(--kouchd-forest-70)] uppercase">04 · Tone</span>
            <h4 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">Calm &amp; Capable</h4>
            <p className="text-xs text-[var(--kouchd-neutral-70)] leading-relaxed">
              Be direct and capable without being frantic. No artificial urgency, countdown timers, or high-pressure alerts.
            </p>
          </div>
        </div>

        {/* Vocabulary Matrix: Approved vs Prohibited */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Approved Terms */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Approved Vocabulary (Always Use)</span>
            </div>
            <ul className="text-xs sm:text-sm text-emerald-950 space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>&ldquo;Host&rdquo; &amp; &ldquo;Guest&rdquo;</strong>: Private individuals coordinating a stay together.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>&ldquo;Stay&rdquo;</strong>: The shared household occasion or co-living arrangement.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>&ldquo;Ledger&rdquo; &amp; &ldquo;Contribution&rdquo;</strong>: The financial screen is the <em>Ledger</em>, and each entry is a <em>contribution</em>.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>&ldquo;Add contribution&rdquo;</strong>: The exact action label for saving a shared cost entry.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Plainspoken, everyday words</strong>: Short active sentences with warmth and practical reassurance.
                </div>
              </li>
            </ul>
          </div>

          {/* Prohibited Terms */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-900 font-bold text-base">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Prohibited Language (Never Use)</span>
            </div>
            <ul className="text-xs sm:text-sm text-rose-950 space-y-3">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Never say &ldquo;debt&rdquo;, &ldquo;debtor&rdquo;, or &ldquo;collections&rdquo;</strong>: Friends and family are not financial adversaries.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Never claim Kouchd moves, holds, or processes payments</strong>: Kouchd is a shared record of contributions; it does not transfer or escrow money.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>No corporate or aggressive terms</strong>: Never use &ldquo;late fees&rdquo;, &ldquo;penalties&rdquo;, &ldquo;synergy&rdquo;, or &ldquo;action items&rdquo;.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>No fabricated social proof or luxury tropes</strong>: Use synthetic, modest examples, not penthouse or resort imagery.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Preserve explicit SMS consent</strong>: Never claim carrier verification without proof; always maintain STOP/HELP language.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Real-World Conversational Examples */}
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-6 sm:p-8 space-y-4 shadow-sm">
          <h4 className="font-heading text-base sm:text-lg font-bold text-[var(--kouchd-forest-90)]">
            Before &amp; After: Writing in the Kouchd Voice
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
              <span className="text-[11px] font-bold font-mono text-rose-700 uppercase">Instead of:</span>
              <p className="text-rose-950 font-medium">
                &ldquo;You owe $45.00 for groceries. Pay your balance immediately or incur a service penalty.&rdquo;
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <span className="text-[11px] font-bold font-mono text-emerald-700 uppercase">Say this (Kouchd):</span>
              <p className="text-emerald-950 font-medium">
                &ldquo;Added $45.00 for weekend groceries to the shared Ledger. Thanks for contributing!&rdquo;
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
              <span className="text-[11px] font-bold font-mono text-rose-700 uppercase">Instead of:</span>
              <p className="text-rose-950 font-medium">
                &ldquo;Kouchd will process your automated payout on Friday to settle outstanding debt.&rdquo;
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <span className="text-[11px] font-bold font-mono text-emerald-700 uppercase">Say this (Kouchd):</span>
              <p className="text-emerald-950 font-medium">
                &ldquo;The stay Ledger is up to date with everyone&apos;s recorded contributions for July.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 04: LOGO SYSTEM & CLEARSPACE
          ===================================================================== */}
      <section id="logos" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              04 · Visual Identity
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Logo Lockups &amp; Clearspace
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)]">
            SVG Vector Direct Downloads
          </span>
        </div>

        {/* 4 Interactive Logo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {logoCards.map((asset) => {
            const svgContent = renderKouchdLogoSvgString({
              variant: asset.variant,
              theme: asset.theme,
            });

            return (
              <div
                key={asset.id}
                className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div
                  className={`h-48 sm:h-56 flex items-center justify-center p-8 ${asset.bgClass} border-b border-[var(--kouchd-neutral-20)] transition-colors`}
                >
                  <KouchdLogoLockup variant={asset.variant} theme={asset.theme} size="lg" />
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-[var(--kouchd-neutral-60)] mt-1 leading-relaxed">
                      {asset.usage}
                    </p>
                    <span className="inline-block mt-2 font-mono text-[11px] text-[var(--kouchd-forest-70)] bg-[var(--kouchd-neutral-10)] px-2.5 py-1 rounded-md">
                      {asset.dimensions}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--kouchd-neutral-20)]">
                    <button
                      onClick={() => onDownload(svgContent, `kouchd-${asset.id}.svg`)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[var(--kouchd-forest-90)] text-[#ffffff] hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download SVG
                    </button>
                    <button
                      onClick={() => onCopy(svgContent, `svg-${asset.id}`)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)] transition-colors"
                      title="Copy raw SVG markup to clipboard"
                    >
                      {copiedKey === `svg-${asset.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clearspace Blueprint Diagram */}
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                Minimum Clearspace Blueprint
              </h3>
              <p className="text-xs sm:text-sm text-[var(--kouchd-neutral-60)]">
                Protect the logo from text, borders, and visual clutter.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[var(--kouchd-sage-20)] text-[var(--kouchd-forest-90)]">
              Boundary = 0.5 × Mark Height (X/2)
            </span>
          </div>

          <div className="p-8 sm:p-12 rounded-2xl bg-[var(--kouchd-neutral-10)] border border-dashed border-[var(--kouchd-neutral-30)] flex items-center justify-center">
            <KouchdLogoClearspace variant="horizontal" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--kouchd-neutral-80)]">
            <div className="p-3.5 rounded-xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)]">
              <strong>Digital Minimum:</strong> 24px height on standard 1x displays; never scale smaller to preserve legibility.
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)]">
              <strong>Print Minimum:</strong> 12mm height on printed marketing collateral, brochures, and swag.
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--kouchd-neutral-0)] border border-[var(--kouchd-neutral-20)]">
              <strong>Strict Integrity:</strong> Do not rotate, skew, stretch, apply gradient fills, or add drop shadows.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 05: COLOR PALETTE & 11-STEP SCALES
          ===================================================================== */}
      <section id="colors" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              05 · Color System
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              11-Step Color Ramps (00–90)
            </h2>
          </div>
          <span className="text-xs text-[var(--kouchd-neutral-60)]">
            Click any swatch to copy Hex or CSS variable
          </span>
        </div>

        {/* Ramp Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "forest", label: "Forest Anchor (Primary)" },
            { id: "lime", label: "Lime Energy (Accent)" },
            { id: "sage", label: "Sage & Calm (Secondary)" },
            { id: "neutrals", label: "Warm Surfaces & Neutrals" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveColorRamp(tab.id as typeof activeColorRamp)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeColorRamp === tab.id
                  ? "bg-[var(--kouchd-forest-90)] text-[#ffffff] shadow-sm"
                  : "bg-[var(--kouchd-surface)] text-[var(--kouchd-forest-70)] border border-[var(--kouchd-neutral-20)] hover:bg-[var(--kouchd-neutral-10)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Swatches Grid */}
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-6 sm:p-8 space-y-6 shadow-sm">
          {activeColorRamp === "forest" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                    Forest Scale Ramp
                  </h3>
                  <p className="text-xs text-[var(--kouchd-neutral-60)]">
                    Forest 90 (#184f3a) is our grounding anchor representing stability, nature, and calm stewardship.
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--kouchd-forest-80)]">--kouchd-forest-00..90</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                {forestSteps.map((c) => (
                  <div
                    key={c.step}
                    onClick={() => onCopy(c.hex, `color-forest-${c.step}`)}
                    className="group cursor-pointer rounded-2xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.03] transition-all bg-[var(--kouchd-neutral-0)] flex flex-col justify-between"
                  >
                    <div
                      style={{ backgroundColor: c.hex }}
                      className="h-16 w-full flex items-center justify-center relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                        {copiedKey === `color-forest-${c.step}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-mono text-xs font-bold text-[var(--kouchd-forest-90)]">
                        {c.step}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--kouchd-neutral-60)]">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeColorRamp === "lime" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                    Lime Scale Ramp
                  </h3>
                  <p className="text-xs text-[var(--kouchd-neutral-60)]">
                    Lime 40 (#dff25e) is our primary energetic accent used for CTAs, active indicators, and delight moments.
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--kouchd-forest-80)]">--kouchd-lime-00..90</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                {limeSteps.map((c) => (
                  <div
                    key={c.step}
                    onClick={() => onCopy(c.hex, `color-lime-${c.step}`)}
                    className="group cursor-pointer rounded-2xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.03] transition-all bg-[var(--kouchd-neutral-0)] flex flex-col justify-between"
                  >
                    <div
                      style={{ backgroundColor: c.hex }}
                      className="h-16 w-full flex items-center justify-center relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                        {copiedKey === `color-lime-${c.step}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-mono text-xs font-bold text-[var(--kouchd-forest-90)]">
                        {c.step}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--kouchd-neutral-60)]">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeColorRamp === "sage" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                    Sage &amp; Secondary Ramps
                  </h3>
                  <p className="text-xs text-[var(--kouchd-neutral-60)]">
                    Gentle tones for cards, badges, and informational tags.
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--kouchd-forest-80)]">--kouchd-sage &amp; sky</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {sageSteps.map((c) => (
                  <div
                    key={c.step}
                    onClick={() => onCopy(c.hex, `color-sage-${c.step}`)}
                    className="group cursor-pointer rounded-2xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.03] transition-all bg-[var(--kouchd-neutral-0)] flex flex-col justify-between"
                  >
                    <div
                      style={{ backgroundColor: c.hex }}
                      className="h-16 w-full flex items-center justify-center relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                        {copiedKey === `color-sage-${c.step}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-heading text-xs font-bold text-[var(--kouchd-forest-90)]">
                        {c.label}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--kouchd-neutral-60)]">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeColorRamp === "neutrals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                    Warm Paper &amp; Surface Neutrals
                  </h3>
                  <p className="text-xs text-[var(--kouchd-neutral-60)]">
                    Warm cream and sandy undertones create a cozy, residential atmosphere.
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--kouchd-forest-80)]">--kouchd-neutral-00..90</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {neutralSteps.map((c) => (
                  <div
                    key={c.step}
                    onClick={() => onCopy(c.hex, `color-neutral-${c.step}`)}
                    className="group cursor-pointer rounded-2xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-xs hover:shadow-md hover:scale-[1.03] transition-all bg-[var(--kouchd-neutral-0)] flex flex-col justify-between"
                  >
                    <div
                      style={{ backgroundColor: c.hex }}
                      className="h-16 w-full flex items-center justify-center relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                        {copiedKey === `color-neutral-${c.step}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 text-center space-y-0.5">
                      <div className="font-heading text-xs font-bold text-[var(--kouchd-forest-90)]">
                        {c.label}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--kouchd-neutral-60)]">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 06: TYPOGRAPHY HIERARCHY & LIVE TESTER
          ===================================================================== */}
      <section id="typography" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              06 · Typography System
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Manrope &amp; Inter Font System
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Display: Manrope · Body: Inter
          </span>
        </div>

        {/* Live Typography Tester */}
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--kouchd-forest-70)]" />
                <span>Interactive Live Typography Playground</span>
              </h3>
              <p className="text-xs text-[var(--kouchd-neutral-60)]">
                Type any headline or copy below to test live scaling across our typographic hierarchy.
              </p>
            </div>
            <button
              onClick={() =>
                setTypeTesterText("Private shared living made easier to coordinate.")
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--kouchd-neutral-30)] hover:bg-[var(--kouchd-neutral-10)] text-[var(--kouchd-forest-80)]"
            >
              Reset Sample Text
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={typeTesterText}
              onChange={(e) => setTypeTesterText(e.target.value)}
              placeholder="Type custom preview text..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--kouchd-neutral-30)] bg-[var(--kouchd-neutral-0)] text-sm sm:text-base font-sans text-[var(--kouchd-forest-90)] focus:outline-hidden focus:ring-2 focus:ring-[var(--kouchd-forest-80)] transition-all"
            />
          </div>

          {/* Rendered Live Scale */}
          <div className="space-y-6 pt-4 border-t border-[var(--kouchd-neutral-20)]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--kouchd-neutral-50)]">
                <span>Title / XXL · 48px · Bold · Manrope</span>
                <span>font-heading text-4xl</span>
              </div>
              <div className="font-heading text-3xl sm:text-5xl font-extrabold text-[var(--kouchd-forest-90)] tracking-tight leading-tight">
                {typeTesterText || "Title XXL Sample"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--kouchd-neutral-50)]">
                <span>Title / XL · 36px · Bold · Manrope</span>
                <span>font-heading text-3xl</span>
              </div>
              <div className="font-heading text-2xl sm:text-3xl font-bold text-[var(--kouchd-forest-90)] tracking-tight leading-snug">
                {typeTesterText || "Title XL Sample"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--kouchd-neutral-50)]">
                <span>Title / L · 28px · SemiBold · Manrope</span>
                <span>font-heading text-xl</span>
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-[var(--kouchd-forest-90)]">
                {typeTesterText || "Title L Sample"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--kouchd-neutral-50)]">
                <span>Body / L · 16px · Regular · Inter</span>
                <span>font-sans text-base</span>
              </div>
              <div className="font-sans text-base text-[var(--kouchd-neutral-80)] leading-relaxed">
                {typeTesterText || "Body text sample"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--kouchd-neutral-50)]">
                <span>Body / S · 12px · Medium · Inter</span>
                <span>font-sans text-xs</span>
              </div>
              <div className="font-sans text-xs text-[var(--kouchd-neutral-60)]">
                {typeTesterText || "Caption and metadata sample"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 07: GEOMETRIC SHAPES & ASYMMETRIC MASKS
          ===================================================================== */}
      <section id="graphics" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              07 · Brand Graphics
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              6 Geometric Shapes &amp; Asymmetric Masks
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Signature Visual Motifs
          </span>
        </div>

        {/* 6 Shapes Gallery */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {(["globe", "squares", "net", "triangle", "halo", "inception"] as BrandShapeType[]).map((shape) => (
            <div
              key={shape}
              className="bg-[var(--kouchd-surface)] p-5 rounded-2xl border border-[var(--kouchd-neutral-20)] flex flex-col items-center justify-center text-center space-y-3 shadow-xs hover:border-[var(--kouchd-forest-50)] transition-all"
            >
              <BrandShape type={shape} size={64} color="var(--kouchd-forest-80)" />
              <div>
                <span className="text-xs font-mono font-bold capitalize text-[var(--kouchd-forest-90)] block">
                  {shape}
                </span>
                <span className="text-[10px] text-[var(--kouchd-neutral-50)] font-mono">
                  SVG Motifs
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Asymmetric Image Mask Blueprint */}
        <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[var(--kouchd-forest-90)]">
                The Signature Asymmetric Mask (16px 90px 16px 16px)
              </h3>
              <p className="text-xs sm:text-sm text-[var(--kouchd-neutral-60)]">
                Kouchd uses an iconic asymmetric silhouette to give editorial photos an inviting, custom-cut feel.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[var(--kouchd-lime-40)] text-[var(--kouchd-forest-90)]">
              border-radius: 16px 90px 16px 16px
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex items-center justify-center p-6 bg-[var(--kouchd-neutral-10)] rounded-2xl">
              <div className="w-56 h-56">
                <BrandImageMask orientation="square" roundCorner="top-right">
                  <div className="w-full h-full bg-gradient-to-tr from-[var(--kouchd-forest-90)] via-[var(--kouchd-forest-80)] to-[var(--kouchd-lime-40)] p-6 flex flex-col justify-between text-white shadow-inner">
                    <span className="font-mono text-xs text-[var(--kouchd-lime-40)] font-bold">16x90 Editorial</span>
                    <div className="font-heading text-lg font-extrabold leading-tight">
                      Signature Cut
                    </div>
                  </div>
                </BrandImageMask>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[var(--kouchd-neutral-80)] leading-relaxed">
              <p>
                Standard UI cards use symmetrical rounded corners. Kouchd differentiates editorial moments by exaggerating one corner into an expansive <strong>90px curve</strong> while keeping the remaining corners at a compact <strong>16px</strong>.
              </p>
              <div className="space-y-2 bg-[var(--kouchd-neutral-0)] p-4 rounded-xl border border-[var(--kouchd-neutral-20)] font-mono text-xs">
                <span className="text-[var(--kouchd-forest-70)] block">{"// CSS Implementation"}</span>
                <code>border-radius: 16px 90px 16px 16px;</code>
              </div>
              <p className="text-xs text-[var(--kouchd-neutral-60)]">
                Use for hero images, magazine feature articles, profile headers, and marketing carousels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 08: PHYSICAL SWAG & TOUCHPOINTS
          ===================================================================== */}
      <section id="applications" className="scroll-mt-32 space-y-8">
        <div className="border-b border-[var(--kouchd-neutral-20)] pb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[var(--kouchd-forest-60)]">
              08 · Physical Touchpoints
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--kouchd-forest-90)] mt-1">
              Lived-In, Real-World Applications
            </h2>
          </div>
          <span className="text-xs font-medium text-[var(--kouchd-neutral-60)]">
            Warm · Tactile · Unpretentious
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* House Guide Folder */}
          <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-sm flex flex-col justify-between p-6 space-y-4">
            <div className="h-48 rounded-2xl bg-[#f2eee3] border border-[#ded7c8] flex items-center justify-center p-6">
              <div className="w-24 h-32 bg-[#e6dfcf] rounded-sm shadow-md border border-[#c9beaa] p-3 flex flex-col justify-between items-center">
                <div className="w-12 h-1 bg-[#8c8270] rounded-full" />
                <KouchdLogoLockup variant="logomark" theme="dark" size="xs" />
                <span className="text-[7px] font-mono text-[#665e50]">HOUSE GUIDE</span>
              </div>
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
                Printed House Guide Folder
              </h3>
              <p className="text-xs text-[var(--kouchd-neutral-60)] mt-1">
                Warm tactile manila folder placed on kitchen counters with stay rules, check-in instructions, and wifi details.
              </p>
            </div>
          </div>

          {/* Cabin Ceramic Mug */}
          <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-sm flex flex-col justify-between p-6 space-y-4">
            <div className="h-48 rounded-2xl bg-[var(--kouchd-forest-90)] border border-[var(--kouchd-forest-80)] flex items-center justify-center p-6">
              <div className="w-24 h-28 bg-[#1f382e] rounded-b-2xl rounded-t-sm shadow-xl border border-[#2b4c3e] flex flex-col items-center justify-center p-3 relative">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--kouchd-lime-40)] flex items-center justify-center">
                  <KouchdLogoLockup variant="logomark" theme="cream" size="xs" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
                Matte Ceramic Cabin Mug
              </h3>
              <p className="text-xs text-[var(--kouchd-neutral-60)] mt-1">
                Earthy forest-green ceramic mug with debossed cream emblem for morning coffee on the porch.
              </p>
            </div>
          </div>

          {/* Welcome Sticker & Key Fob */}
          <div className="bg-[var(--kouchd-surface)] rounded-3xl border border-[var(--kouchd-neutral-20)] overflow-hidden shadow-sm flex flex-col justify-between p-6 space-y-4">
            <div className="h-48 rounded-2xl bg-[var(--kouchd-lime-40)] border border-[var(--kouchd-lime-60)] flex items-center justify-center p-6">
              <div className="w-28 h-28 rounded-full bg-[var(--kouchd-forest-90)] shadow-lg flex items-center justify-center p-4">
                <KouchdLogoLockup variant="vertical" theme="cream" size="xs" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-[var(--kouchd-forest-90)]">
                Welcome Sticker &amp; Key Fob
              </h3>
              <p className="text-xs text-[var(--kouchd-neutral-60)] mt-1">
                Durable vinyl die-cut stickers and keychains for guest house keys and welcoming gift baskets.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
