import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AgreementIllustration,
  ChoreBoardIllustration,
  HouseGuideIllustration,
  LedgerEntryIllustration,
  PaymentOptionsIllustration,
  RemindersIllustration,
} from "@/components/illustrations/empty-state-illustrations";
import { BrandButton } from "@/components/ui/brand-button";

describe("WRE-278 brand controls and line illustrations", () => {
  it("renders the primary BrandButton with theme tokens and its primary variant class", () => {
    const html = renderToStaticMarkup(
      React.createElement(BrandButton, null, "Add contribution")
    );

    expect(html).toContain("brand-button--primary");
    expect(html).toContain("var(--kouchd-lime)");
    expect(html).toContain("var(--kouchd-brand-forest)");
    expect(html).toContain("var(--kouchd-on-fill)");
  });

  it.each([
    ["house guide", HouseGuideIllustration],
    ["Ledger entry", LedgerEntryIllustration],
    ["chore board", ChoreBoardIllustration],
    ["agreement", AgreementIllustration],
    ["payment options", PaymentOptionsIllustration],
    ["reminders", RemindersIllustration],
  ])("renders the %s illustration with adaptive color tokens", (_name, Illustration) => {
    const html = renderToStaticMarkup(React.createElement(Illustration));
    expect(html).toContain('role="img"');
    expect(html).toContain("var(--kouchd-surface)");
    expect(html).toContain("var(--kouchd-brand-forest)");
  });
});
