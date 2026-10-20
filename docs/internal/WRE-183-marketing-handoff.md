# WRE-183 marketing build handoff

Prepared October 15, 2026. Branch: `codex/WRE-183-marketing-build`, based on `f202014` from canonical `lwhite702/kouchd_primary` main. Working checkout: `/Volumes/Projects/CodexWorktrees/kouchd-wre183-marketing`. The original shared checkout remains untouched because it still produced filesystem timeouts.

## User-visible changes

- New `/about` page with About Us, Why We Exist, Mission, six Values, three audiences, and Vision. Uses the existing living-room illustration, Manrope, cream surfaces, forest sections, lime actions, and a sky audience section.
- Homepage introduces the approved “Your space. Your people. Everyone on the same page.” positioning, explains agreements and contribution records, and links a mission preview to the About page.
- Existing detailed feature tour stays in place. Optional points are described as host-selected rewards, without treating the configurable “Koins” label as universal.
- Shared marketing header retains Features, How it works, Privacy, FAQ, Guides, and Sign in, with About added. At narrow widths, Menu exposes the links and Sign in. CTA uses the existing app-domain helper.
- Contribution copy keeps payment separate from a saved record. Native availability, paid tiers, SMS allowances, Pro capabilities, and live billing are not advertised.
- Page/social metadata uses the same voice. About has an explicit canonical URL.
- Local candidate version is 0.5.2; the repository version-preparation script synchronized package and iOS marketing versions. The iOS build number is unchanged.

## Figma

Existing file: [Kouchd — Brand & Product](https://www.figma.com/design/RVEwjcqjCujtPF5yuMGEJg/Kouchd?node-id=458-84). New page: `Marketing / WRE-183`.

| Screen | Node |
|---|---|
| Homepage desktop | [458:89](https://www.figma.com/design/RVEwjcqjCujtPF5yuMGEJg/Kouchd?node-id=458-89) |
| Homepage mobile | [458:218](https://www.figma.com/design/RVEwjcqjCujtPF5yuMGEJg/Kouchd?node-id=458-218) |
| About desktop | [458:347](https://www.figma.com/design/RVEwjcqjCujtPF5yuMGEJg/Kouchd?node-id=458-347) |
| About mobile | [458:463](https://www.figma.com/design/RVEwjcqjCujtPF5yuMGEJg/Kouchd?node-id=458-463) |

Read-back evidence: 265 editable text layers, 44 component instances, 80 vectors, one new reusable detail-card component, and no flattened UI image layers. All text uses Manrope. Existing color and dimension variables and Brand button, Stay Card, Contribution Row, and Chore Item assets are reused. Layout sizing and CTA wrapping were corrected during visual review.

The implementation preserves the established web illustration and detailed feature examples rather than replacing them with the simplified design-board examples. About uses an editorial label/content grid on desktop and a single column on mobile, with the same section sequence and color treatments.

## Validation

- TypeScript check passed.
- ESLint passed with 15 pre-existing warnings in unrelated files.
- Existing Vitest suite: 21 files and 101 tests passed. No new tests or dependencies were added.
- Full Next.js production build passed, including static generation of `/about`.
- Version synchronization check and whitespace/diff check passed.
- Browser plugin not available; used Playwright with installed Chrome.
- Actual marketing components rendered in an isolated Next.js visual harness at `http://localhost:3100`, without Clerk/Convex providers. The clean checkout has no authentication keys, so its normal middleware cannot be used for a credential-free preview. The harness is outside committed source and does not change application authentication.
- Both routes passed at 320, 390, 768, 901, 1024, and 1440px: HTTP 200, one H1, expected page identity, loaded illustrations, Manrope, no horizontal overflow or visible clipped text, no framework error overlay, and no browser errors.
- Homepage story navigation, mission anchor, FAQ expansion, signup target, 320px Menu-to-About navigation, and keyboard skip-link entry passed.
- About canonical and description verified in rendered HTML. A low-contrast Mission lead found in screenshot review was fixed and its rendered color checked.

## Current development evidence and release limits

Remote refresh on October 15 confirms PR #27 and replacement subscription PRs #38/#39 merged on October 14; original #33/#34 are closed. Native gated purchase PR #40 remains open. This is integration evidence only. No live billing/store product, purchase/restore, native distribution, provider delivery, authenticated persistence, or production deployment was verified by this marketing task.

The branch is a local review candidate. Production publication and default-branch promotion remain separate steps. Public Mintlify changelog pages were not updated because there is no verified marketing release yet.
