# Kouchd Brand Building Design System Documentation

## Overview
This document specifies the architecture, tokens, components, and interactive tools delivered under Linear issue **`WRE-201`** from the canonical Figma design system ([`3921:6636`](https://www.figma.com/design/4lznEe5RQ1QAolqIzhn3ex/Brand-Building-Design-System--with-brand-guidelines--social-media-banners--Community-?node-id=3921-6636)), adapted to Kouchd brand principles and guidelines (`AGENTS.md`).

## Brand Tokens (`app/brand-system.css`)
- **Primary Color Scales (0–90)**:
  - **Forest Canopy**: `--kouchd-forest-0` (`#eef6f2`) to `--kouchd-forest-90` (`#092118`), anchor at `#184f3a`.
  - **Electric Lime**: `--kouchd-lime-0` (`#fcffe8`) to `--kouchd-lime-90` (`#384205`), core accent at `#dff25e`.
  - **Warm Paper/Ink Neutrals**: `--kouchd-neutral-0` (`#fffdf8`), `--kouchd-neutral-5` (`#f5f0e8`), to `--kouchd-neutral-90` (`#0d1612`).
- **Secondary Color Scales (0–90)**:
  - **Sage**: `--kouchd-sage-0..90` (core at `#e5edde`).
  - **Sky**: `--kouchd-sky-0..90` (core at `#c9e7f0`).
  - **Coral**: `--kouchd-coral-0..90` (core at `#ed755c`).
- **Semantic / Functional Tokens**:
  - Info (`--kouchd-functional-info-0..90`, `--kouchd-info-0..90`)
  - Gray (`--kouchd-functional-gray-0..90`, `--kouchd-gray-0..90`)
  - Success (`--kouchd-functional-success-0..90`, `--kouchd-success-0..90`)
  - Alert (`--kouchd-functional-alert-0..90`, `--kouchd-alert-0..90`)
  - Error (`--kouchd-functional-error-0..90`, `--kouchd-error-0..90`)
- **Drop Shadows**:
  - Soft elevations matching Figma: `--kouchd-shadow-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-xxl`, `-xxxl`.
- **Layout Spacers**:
  - `--kouchd-spacer-4` through `--kouchd-spacer-64` (4px increments).

## Typography
- **Titles**: `Manrope` (`--font-manrope`), 700 / 800 weight.
- **Body**: `Inter` (`--font-inter`), 400 / 500 / 700 weight.
- Scales: Desktop & Mobile `Title/XXL` through `Title/XS`, and `Text/XXL` through `Text/XS`.

## Component Primitives
1. `KouchdLogoLockup` (`components/brand/kouchd-logo.tsx`):
   - Variants: `horizontal`, `vertical`, `logomark`, `wordmark`, `app-icon`.
   - Clearspace: `KouchdLogoClearspace` ($X/2$ rule).
   - SVG direct export: `renderKouchdLogoSvgString`.
2. `BrandGraphic` / `BrandShape` (`components/brand/brand-shapes.tsx`):
   - 6 signature relatable home motifs: `cushion` (open seat & comfort), `lamp` (evening glow & sanctuary), `mug` (morning cup & shared rituals), `archway` (open door & hospitality), `common-ground` (shared space & harmony), `foliage` (houseplants & lived-in care). Retains backwards compatibility for legacy types (`globe`, `squares`, `net`, `triangle`, `halo`, `inception`).
   - `BrandImageMask`: asymmetric rounded-corner masks (`16px 90px 16px 16px`).
   - `BrandIllustrationCard`: homey scene illustrations (`kitchen`, `ledger`, `agreement`, `checkin`).
3. Web Elements:
   - `BrandButton` (`components/ui/brand-button.tsx`): 3 sizes, 5 variants, 4 states, loading indicators.
   - `BrandSocialButton`: social CTA buttons with Google, Apple, and SMS options.
   - `BrandTag` (`components/ui/brand-tag.tsx`): 5 discrete sizes (`xs`–`xl`), 9 color styles, emoji and dismissable controls.
   - `BrandSpacer` (`components/ui/brand-layout-primitives.tsx`): layout spacers with visual blueprint debugging.
   - `BrandDivider` & `BrandCard`: layout separators and surface cards.

## Interactive Portal (`/brand`)
- **Route**: `app/brand/page.tsx`
- **Component**: `components/brand/brand-system-portal.tsx`
- **Document View Component**: `components/brand/brand-guidelines-document.tsx`
- Modules:
  1. Brand Guidelines:
     - **Document View (Default)**: Full-width, responsive, scrollable editorial reference with a sticky sub-navigation rail (01 Story, 02 Roles, 03 Voice & Rules, 04 Logos & Clearspace, 05 Color Scales, 06 Typography, 07 Shapes & Masks, 08 Physical Swag). Features an interactive live type tester, interactive color scales with copy-to-clipboard feedback, direct SVG logo downloads, and clearspace blueprints.
     - **Presentation Deck Mode (16:10)**: Optional slide-by-slide presentation deck with keyboard arrow navigation and thumbnail jump rail.
  2. Brand Assets Repository (SVG direct download & color swatches)
  3. Social Media Kits (LinkedIn, Instagram, YouTube, X, Facebook)
  4. Marketing AIDA Carousels (10-slide template in Portrait 4:5 and Square 1:1)
  5. Web Elements Playground (Interactive component builder)

## Release History
- **Brand Center UI Overhaul**: Overhauled `/brand` guidelines from a cramped 16:10 box into a spacious, user-friendly, scrollable editorial document with sticky quick-jump navigation, interactive color swatches, live type tester, and an optional 16:10 presentation deck toggle (retaining version 0.6.0).
- **v0.6.0**: Initial implementation of the Kouchd Brand Building Design System based on Figma specs.

## Policy & Language
Per `AGENTS.md`:
- Always use *host*, *guest*, *stay*, *Ledger*, and *contribution*.
- Never imply money movements, collections, debts, or penalties.
- Attributed to **Wrelik Brands LLC**.
