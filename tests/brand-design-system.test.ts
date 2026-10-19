import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderKouchdLogoSvgString } from "@/components/brand/kouchd-logo";
import {
  RELATABLE_BRAND_SHAPES,
  RELATABLE_SHAPE_METADATA,
} from "@/components/brand/brand-shapes";

describe("Kouchd Brand Building Design System", () => {
  const rootDir = path.resolve(__dirname, "..");
  const brandCssPath = path.join(rootDir, "app/brand-system.css");
  const brandPagePath = path.join(rootDir, "app/brand/page.tsx");
  const brandPortalPath = path.join(rootDir, "components/brand/brand-system-portal.tsx");
  const brandLogoPath = path.join(rootDir, "components/brand/kouchd-logo.tsx");
  const brandShapesPath = path.join(rootDir, "components/brand/brand-shapes.tsx");
  const brandButtonPath = path.join(rootDir, "components/ui/brand-button.tsx");
  const brandTagPath = path.join(rootDir, "components/ui/brand-tag.tsx");
  const brandPrimitivesPath = path.join(rootDir, "components/ui/brand-layout-primitives.tsx");

  it("verifies all brand system code files exist", () => {
    expect(fs.existsSync(brandCssPath)).toBe(true);
    expect(fs.existsSync(brandPagePath)).toBe(true);
    expect(fs.existsSync(brandPortalPath)).toBe(true);
    expect(fs.existsSync(brandLogoPath)).toBe(true);
    expect(fs.existsSync(brandShapesPath)).toBe(true);
    expect(fs.existsSync(brandButtonPath)).toBe(true);
    expect(fs.existsSync(brandTagPath)).toBe(true);
    expect(fs.existsSync(brandPrimitivesPath)).toBe(true);
  });

  it("verifies 11-step color token scales in brand-system.css", () => {
    const css = fs.readFileSync(brandCssPath, "utf8");

    // Check Forest ramp 0 to 90
    for (const step of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]) {
      expect(css).toContain(`--kouchd-forest-${step}:`);
      expect(css).toContain(`--kouchd-lime-${step}:`);
      expect(css).toContain(`--kouchd-neutral-${step}:`);
      expect(css).toContain(`--kouchd-sage-${step}:`);
      expect(css).toContain(`--kouchd-sky-${step}:`);
      expect(css).toContain(`--kouchd-coral-${step}:`);
    }

    // Check functional colors
    for (const func of ["info", "success", "alert", "error"]) {
      expect(css).toContain(`--kouchd-${func}-10:`);
      expect(css).toContain(`--kouchd-${func}-40:`);
      expect(css).toContain(`--kouchd-${func}-80:`);
    }

    // Check Spacers 4 to 64
    for (const sz of [4, 8, 12, 16, 24, 32, 40, 48, 56, 64]) {
      expect(css).toContain(`--kouchd-spacer-${sz}:`);
    }

    // Check Shadows
    for (const sh of ["xs", "sm", "md", "lg", "xl", "2xl", "xxxl"]) {
      expect(css).toContain(`--kouchd-shadow-${sh}:`);
    }
  });

  it("verifies renderKouchdLogoSvgString generates valid vector SVG strings", () => {
    const variants = ["horizontal", "vertical", "logomark", "app-icon"] as const;
    const themes = ["dark", "cream", "forest", "lime"] as const;

    for (const variant of variants) {
      for (const theme of themes) {
        const svg = renderKouchdLogoSvgString({ variant, theme });
        expect(svg).toContain("<svg");
        expect(svg).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
        expect(svg).toContain("viewBox=");
        expect(svg).toContain("</svg>");
      }
    }
  });

  it("verifies brand voice and policy compliance (AGENTS.md)", () => {
    const portal = fs.readFileSync(brandPortalPath, "utf8");
    const guidelines = fs.readFileSync(brandPagePath, "utf8");

    // Must have title in metadata
    expect(guidelines).toContain("Brand & Design System | Kouchd");

    // Must mention operator Wrelik Brands LLC
    expect(portal).toContain("Wrelik Brands LLC");

    // Must use host, guest, stay, Ledger, contribution
    expect(portal).toMatch(/host/i);
    expect(portal).toMatch(/guest/i);
    expect(portal).toMatch(/stay/i);
    expect(portal).toMatch(/Ledger/);
    expect(portal).toMatch(/contribution/i);

    // Must affirm that Kouchd does not move money
    expect(portal).toMatch(/does not move|never claim Kouchd moves|contributions are currently recorded/i);
  });

  it("verifies 6 relatable home motifs and metadata", () => {
    expect(RELATABLE_BRAND_SHAPES).toEqual([
      "cushion",
      "lamp",
      "mug",
      "archway",
      "common-ground",
      "foliage",
    ]);

    for (const shape of RELATABLE_BRAND_SHAPES) {
      const meta = RELATABLE_SHAPE_METADATA[shape];
      expect(meta).toBeDefined();
      expect(meta.name).toBeTruthy();
      expect(meta.subtitle).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.metaphor).toBeTruthy();
    }
  });
});
