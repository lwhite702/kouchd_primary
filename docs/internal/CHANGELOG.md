# Internal change log

Internal engineering record. This file is excluded from Mintlify navigation and is not a public product changelog.

## 2026-10-05 — Landing header refresh, accessible tooltips, skeleton loaders, and canonical help links

- Refreshed Landing Page Header (`components/landing-page.tsx`, `components/landing-v21.css`):
  - Added brand badge ("By Wrelik") with informative tooltip explaining the brand ecosystem.
  - Added a direct "Guides" link with book icon to canonical Mintlify documentation (`https://help.kouchd.com`).
  - Added accessible tooltips to "Sign in" and "Start a stay" CTAs.
  - Preserved carrier compliance footer elements verbatim (`tests/carrier-compliance.test.ts`).
- Introduced Accessible Tooltip Component (`components/ui/tooltip.tsx`, `app/production.css`):
  - Accessible wrapper supporting mouse hover and keyboard focus/blur with ARIA `role="tooltip"` and dynamic IDs.
  - Configurable positions (`top`, `bottom`, `left`, `right`) with arrow indicator and subtle fade animation.
  - Deployed tooltips across authenticated dashboard utilities (`Tour`, `All stays`, `Docs`, `Join with code`, `Settings`), action triggers (`Add contribution`, `Add charge`, chore toggles), external payment copy actions, and referral code copy buttons.
- Expanded Skeleton Loading States (`components/skeleton-loader.tsx`):
  - Added modular `CardSkeleton` (for overview cards, house info, and onboarding summaries) and `LedgerSkeleton` (for transaction rows and obligation tables).
  - Replaced plain text loading states in `components/onboarding/guest-onboarding-flow.tsx` with smooth shimmer `CardSkeleton`.
- Canonical Help Articles Integration (`lib/help-links.ts`):
  - Created centralized `HELP_LINKS` dictionary mapping canonical Mintlify paths (`hostsGettingStarted`, `joiningAStay`, `pricingAndTerms`, `houseRulesAndChores`, `ledgerManagement`, `stayAgreements`, `quickstart`, etc.).
  - Replaced hardcoded help URLs across onboarding wizards (`host-onboarding-wizard.tsx`, `guest-onboarding-flow.tsx`, `guided-tour.tsx`, `join-household.tsx`, `header-menu.tsx`, and `authenticated-home.tsx`).
- Validation:
  - Passed `vitest run` (13 test files, 52/52 tests passing).
  - Passed `npx tsc --noEmit` with zero errors.
  - Passed `git diff --check`.

## 2026-10-05 — Master Wrelik legal policies and sibling product parity

- Established canonical legal definitions in `lib/legal.ts` (`legalMeta`, `privacyPolicy`, `termsOfUse`, `cookiePolicy`, `acceptableUsePolicy`, `legalLinks`) mirroring sibling Wrelik products (`sporkd`, `DRX_Primary`, and `Klutr`).
- Refactored `app/privacy/page.tsx` and `app/terms/page.tsx` to render comprehensive master sections and dedicated Kouchd addenda while strictly preserving carrier 10DLC compliance statements (`tests/carrier-compliance.test.ts`).
- Created dedicated web application legal pages:
  - `app/cookies/page.tsx`: Cookie & Tracking Policy.
  - `app/acceptable-use/page.tsx`: Acceptable Use Policy & Community Guidelines.
  - Route aliases for standard Wrelik URL conventions: `app/legal/privacy/page.tsx`, `app/legal/terms/page.tsx`, `app/legal/cookies/page.tsx`, and `app/legal/acceptable-use/page.tsx`.
- Updated `components/legal/legal-page-layout.tsx` navigation and footer to link Privacy, Terms, Cookies, Acceptable Use, and SMS Opt-In.
- Refreshed Help Center documentation:
  - `help/legal-trust/privacy-and-security.mdx`: Aligned with canonical Wrelik privacy and SMS commitments.
  - `help/legal-trust/terms-of-service.mdx`: New documentation covering platform role, stay agreements, and SMS terms.
  - `docs.json`: Registered `terms-of-service` under the "Trust & Legal" navigation group.
- Validation:
  - Passed `vitest run` (all 13 test files, 52 unit tests passed including carrier compliance).
  - Passed `mintlify validate` and `mintlify broken-links`.
  - Passed `git diff --check`.

## 2026-10-05 — Mintlify Help Center visual styling and color refresh

- Added ambient `decoration: "gradient"` to `background` in `docs.json` to bring warm brand green gradient aura to all documentation pages.
- Enriched help guides (`index.mdx`, `help/index.mdx`, `help/quickstart.mdx`, `help/hosts/getting-started.mdx`, `help/guests/joining-a-stay.mdx`, `help/guests/logging-contributions.mdx`, `help/product/roadmap.mdx`, `help/legal-trust/privacy-and-security.mdx`, `help/hosts/house-rules-and-chores.mdx`) with colorful callouts (`<Tip>`, `<Info>`, `<Note>`, `<Warning>`, `<Check>`), structured sequence `<Steps>`/`<Step>`, and complementary `<CardGroup>` links.
- Corrected relative internal guide links to use the canonical `/help/...` pathing.
- Passed `mintlify validate`, `mintlify broken-links`, `docs.json` JSON parsing, and `git diff --check`.

## 2026-09-28 — Guest payment schedule choice and approval

- Added guest-selected daily or weekly billing at initial agreement acceptance, including an initial weekly payment weekday and clear rate/late-fee copy.
- Added host-reviewed schedule change requests with a zero due-balance gate, one approved change per 14 days, and prorated obligation handoff at the approval date.
- Added per-period weekly weekday alignment, payment weekday selection for host-edited weekly agreements, and legacy unscoped ledger handling for sole-guest stays.
- Added opt-in host-recorded overnight billing. Recorded nights create ledger charges independently for nonconsecutive dates; weekly charges are prorated by weekday and accumulated into their due period. Guests see the billing basis before accepting.
- Updated the roadmap to describe this work as in progress. Implementation is on `codex/guest-payment-schedule`; it is not merged, deployed, or published.
- TypeScript and targeted ESLint checks passed. No tests were added or run.
- Linear issue association is pending: the connected workspace currently exposes only the Wrelik team, and the repository policy says not to misclassify Kouchd work under another product team.

## 2026-09-25 — WRE-145 documentation and policy refresh

- Fetched `origin` and integrated the current remote `main` updates into the task branch, then fast-forwarded the branch-only Kouchd product work through `36d136d` for accurate documentation review.
- Added Kouchd-specific agent policy, brand voice/design guidance, SemVer/release-integrity guidance, and a repository-based Mintlify management workflow.
- Refreshed public help for invitations, quickstart, contributions, host review, privacy, and notifications; added roadmap and public changelog pages and linked them through root `docs.json`.
- Public changelog is limited to verified currently available behavior. Branch-only work is identified as in development; no ETA or live publish is claimed.
- Validation and resulting task commit will be appended after checks.

### Follow-up: help center entry route

- Replaced the root Mintlify starter Introduction with a content-rich Kouchd help landing page linking to primary guides, notification settings, roadmap, and privacy guidance.
- Clarified in root and help-specific agent policies that the repository-root `index.mdx` supplies the actual Mintlify root route.

### Validation

- `mintlify validate` — passed.
- `mintlify broken-links` — passed; no broken links found.
- `docs.json` JSON parse and `git diff --check` — passed.
- Repository `lint`, `typecheck`, and unit tests were attempted but unavailable because this worktree has no installed npm dependencies (`eslint`, `tsc` dependency modules, and `vitest` missing). No application code changed.
- Root route follow-up passed `mintlify validate`, `mintlify broken-links`, `docs.json` JSON parsing, and `git diff --check`.

### Publish preparation — 2026-09-28

- Rebasing task-only documentation commits onto current `origin/main` after the feature branch's application commits were merged separately.
- Verified current app production deployment at Kouchd `main` commit `3b6ae85` (Vercel state `READY`). Updated public roadmap and changelog to reflect the deployed individual guest agreements and external payment options; in-app payment processing remains unavailable.
- Current main has since advanced to `df5e214`, also deployed `READY`, with progressive payment reminder logic. Added neutral public guidance about reminder milestones, accepted terms, ledger state, channel preferences, and service availability.
- Expanded host setup and terms guides for the shipped agreement and external payment workflows.
- Publication was explicitly approved by the user; no live help-center changes have occurred yet.
- The current reminder source contains some legal/consequence language that is not substantiated by the terms or enforcement code inspected. Public documentation intentionally describes only due-date/grace/ledger behavior; a separate product/legal review is recorded in the handoff.
- Latest checks passed: `mintlify validate`, `mintlify broken-links`, root `docs.json` parsing, and `git diff --check` after correcting nested `/help/...` links.


### Publication completed — 2026-09-28

- Merged [PR #7](https://github.com/lwhite702/kouchd_primary/pull/7) to `main` (`d2f74f33bef7729398ea14bbf960326849bf05e2`) and verified the live Help Center route returns HTTP 200 with updated Mintlify page metadata.
- Vercel preview and CodeRabbit passed; Mintlify PR check was skipped, so publication was confirmed by reading the live page after merge.
### 2026-10-09 — WRE-179, WRE-180, WRE-181

- Implemented stay-scoped shared/personal shopping items, private host/guest check-ins with response and follow-up status, and daily/weekly recurring chores with deduplicated due reminders.
- Added daily advancement for overdue recurring chores and activity history for shopping and check-in actions.
- Work is on `codex/wre-179-181-household-coordination`; not merged, deployed, or released. Public roadmap marks household coordination as in development.
- `npm run typecheck` passed. ESLint on changed TypeScript files passed with 10 pre-existing `<img>` optimization warnings in `components/authenticated-home.tsx`. Tests were not run.

### 2026-10-12 — PostHog Feature Flags & RevenueCat Monetization

- Integrated PostHog analytics and multi-tier Feature Flag evaluation engine (local developer URL/storage override → Convex platform emergency kill switch → PostHog Cloud percentage rollouts → typesafe code defaults).
- Created Platform Admin Flags Explorer at `/console/[consoleKey]/flags` with real-time override management and reset capabilities.
- Defined 14 canonical flags in `lib/flags/config.ts` covering household coordination, core roadmap features, onboarding, messaging, and RevenueCat monetization. Provisioned all 14 flags in PostHog project `Kouchd` (`595950`).
- Integrated RevenueCat Web SDK and created responsive `PaywallModal` and `useKouchdPlus` gated behind `feature_revenuecat_paywall`, `feature_billing_portal`, `feature_kouchd_plus_entitlement`, and `feature_customer_center`.
- Added automated unit and integration tests in `tests/feature-flags.test.ts`. Verified `npx convex codegen`, `npm run typecheck` (0 errors), `npm run test` (all 17 test suites, 77 tests pass), and `npm run lint`.

### 2026-10-12 — Help Center & Documentation Synchronization

- Synchronized public Mintlify Help Center (`help/`, `index.mdx`, `docs.json`) with shipped `main` releases (`v0.4.0`–`v0.4.2`):
  - Added October 2026 public changelog entry for native iOS app release (SwiftUI, typed navigation), Figma V2.1 host overview, `app.kouchd.com` subdomain workspace routing, master Wrelik legal suite, and Help Center visual styling.
  - Updated public roadmap to include shipped native iOS app and V2.1 host overview under "Available in the current apps". Kept shared household coordination, flexible schedules/overnights, RevenueCat host subscriptions, and automated Knock agreement reminders under "In progress" without promised dates.
  - Updated host getting started guide with V2.1 Host Overview (home base hero, 3 summary metrics, needs attention, and recent activity feed) and multi-platform access.
  - Updated house rules and chores guide with chore assignments and activity logging across web and iOS.
  - Updated quickstart guide and root index to reflect `app.kouchd.com` workspace access and native iOS availability.
  - Updated `docs.json` navigation links to direct application actions to `app.kouchd.com`.
- Preserved strict Kouchd financial semantics: outside contribution records only; Kouchd does not process payments.
- Verified with `mintlify validate` and `mintlify broken-links`.
