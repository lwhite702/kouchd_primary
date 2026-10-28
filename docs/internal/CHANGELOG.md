# Internal change log

Internal engineering record. This file is excluded from Mintlify navigation and is not a public product changelog.

## 2026-10-28 — iOS parity: edit shopping items and set chore repeats (WRE-244)

- Privacy change (requested 2026-10-28): personal shopping items are visible only to their creator. Hosts lose the exception they had before.
  - `convex/shopping.ts`: `list` returns shared items plus the viewer's own personal items. `requireItemEditor` throws "Shopping item not found" for anyone else's personal item. `update` lets only the creator set `personal`.
  - `convex/activity.ts`: `canSee` hides shopping rows that carry `guestUserId` (the personal-item marker) from everyone except that user, hosts included, in both `list` and `page`. This also hides older rows.
  - Web `components/household/shopping-list.tsx` drops the `isHost` prop and shows the List select only to the creator. iOS `HouseholdRules` drops `isHost`.
  - `tests/shopping-privacy.test.ts` rewritten (5 tests): host and other guest can't list, toggle, remove, or update a personal item; only the creator can make an item personal; personal activity is hidden from host and guest; shared activity is still visible; host paging has no duplicate rows.
- `ios/Kouchd/CoordinationScreens.swift`: added an **Edit item** sheet that calls `shopping:update`. Its permission check matches `requireItemEditor` (shared items can be edited by any member; personal items only by their creator). Only the creator sees the personal toggle.
- `ios/Kouchd/MainScreens.swift`: added a **Repeat** picker to `ChoreForm` that sends `repeatCadence` when it is daily or weekly, and shows "Repeats <cadence>" on chore cards.
- `ios/Kouchd/HouseholdRules.swift`: the client-side permission and cadence rules, kept in one place and covered by `ios/KouchdTests/HouseholdRulesTests.swift` (6 tests).
- Version prepared as `1.0.0-rc.15` (rc.14 is taken by WRE-242).
- Evidence: Debug simulator build succeeded (iPhone 18 Pro Max, iOS 27.0), `KouchdTests` passed (17 tests, 0 failures), and `npm run release:check` passed, and the full Vitest suite passed (178 tests). Not exercised against a signed-in account; no UI test covers the new sheet or picker.
- Not done: public iOS help (`help/ios/chores-and-stay.mdx`) and the public changelog are waiting for release verification. Tracked in WRE-244.

## 2026-10-26 — Polish landing and marketing pages, update Mintlify tokens and roadmap (WRE-240)

- Polished public marketing and landing pages across accessibility, motion, visual hierarchy, and conversion:
  - Added comprehensive `prefers-reduced-motion` CSS controls and focus-visible indicators.
  - Built interactive multi-view preview tabs (Overview, House Guide, Ledger, Chores) on the landing page.
  - Implemented structured footer separating Product, Company & Media, and Trust & Legal, keeping `/brand` exclusively in the footer.
  - Injected Schema.org JSON-LD structured data (`Organization`) on `/about` and enhanced OpenGraph tags.
- Updated Mintlify `docs.json` and `help/docs.json` configuration to align with Kouchd's Brand Building Design System:
  - Colors: Set `primary` to `#184F3A` (Core Forest), `light` to `#DFF25E` (Electric Lime accent), and `dark` to `#123D2E` (Forest Dark contrast).
  - Background: Configured `light` background canvas to `#F5F0E8` (Warm Paper) with gradient decoration, matching the brand surface hierarchy.
  - Typography: Configured `fonts` with `Manrope` for headings and body text.
  - Navigation: Pointed Web App links to `https://app.kouchd.com` and marketing site to `https://kouchd.com`.
  - Added direct links to the official Brand Style Guide (`https://kouchd.com/brand`) in the global anchors, navbar, and footer.
- Updated root `index.mdx` and `help/index.mdx` with direct navigation cards linking to the Brand Style Guide.
- Added post-1.0 hardware roadmap capabilities to `help/product/roadmap.mdx` under "Being explored" (without promised dates):
  - iPadOS native adaptation (multi-column split view, sidebar, keyboard shortcuts, Stage Manager).
  - iPhone Duo dual-screen experience (foldable postures, hinge-aware safe regions, outer-to-inner display continuity).
- Drafted comprehensive internal technical architecture plan in `docs/internal/POST_V1_APPLE_EXPANSION_PLAN.md`.
- Excluded `ios/project.yml` in `.mintignore` and resolved duplicate mapping key in `ios/project.yml` so Mintlify CLI validation runs cleanly.
- Verified with `mintlify validate` (passed with 0 warnings/errors) and `mintlify broken-links` (0 broken links).

## 2026-10-26 — Repair iOS AppConfig declaration after launch merge (WRE-224)

- Removed the extra closing brace that left `AppConfig.isConfigured` at file scope and caused the release simulator build to fail.
- Synchronized release candidate metadata to `1.0.0-rc.12`.
## 2026-10-26 — Update Help Center & tooltips for 1.0 RC status and app support boundaries (WRE-238)

- Created dedicated app support guide `help/support/app-support.mdx` clarifying that `help@kouchd.com` provides technical app assistance (account access, bug reports, and reminder settings), while Kouchd explicitly does not mediate interpersonal roommate conflicts, stay disputes, house rule issues, or external payment problems.
- Registered the new support guide in `docs.json` navigation under `"Support"` and added `"App support"` to footer navigation links.
- Updated `help/product/roadmap.mdx` and `help/product/changelog.mdx` to reflect Version 1.0 Release Candidate (`1.0.0-rc.*`) stabilization under the feature lock:
  - Documented merged capabilities: delayed guest agreement acceptance, synced profile names, Loops newsletter signup, Liquid Glass motion polish, and direct workspace routing.
  - Documented remaining pre-lock launch merges (dependency hardening, package maintenance, release readiness).
  - Outlined post-1.0 exploration (shared grocery receipt scanning, App Store distribution, recurring chore rotation) without promised ETAs.
- Updated plain-language guidance across `help/index.mdx`, `index.mdx`, `help/legal-trust/stay-agreements.mdx`, `help/legal-trust/terms-of-service.mdx`, `help/hosts/getting-started.mdx`, `help/guests/joining-a-stay.mdx`, `help/hosts/ledger-management.mdx`, and `help/guests/logging-contributions.mdx`.
- Refined all in-app tooltips and help tips across `components/authenticated-home.tsx`, `components/marketing/marketing-header.tsx`, and `components/household/payment-options.tsx` to use friendly, plainspoken, non-technical terminology.
- Added `appSupport` URL to `lib/help-links.ts`.
- Synchronized release candidate version to `1.0.0-rc.10` for runtime tooltip and helper updates under the 1.0 feature lock.

## 2026-10-26 — Fix iOS RootView compiler timeout (WRE-239)

- Split the root screen branches and authenticated tab composition into focused view properties, and extracted lifecycle callbacks to reduce SwiftUI type-checking complexity.
- Kept analytics identity updates separate from session connection updates and used public Clerk first/last-name fields.
- Verified a generic iOS Simulator Debug build with Xcode.
- Synchronized release candidate metadata to `1.0.0-rc.9`.


## 2026-10-25 — Add Kouchd artwork to onboarding and empty stays (WRE-237)

- Added decorative brand artwork to the host and guest welcome steps, host/join start screen, and no-active-stays state.
- Added responsive image framing and documented the customer-visible polish in the root unreleased changelog.
- Synchronized release candidate metadata to `1.0.0-rc.8` after the WRE-237 push check required a unique version.


## 2026-10-25 — Patch vulnerable framework and sanitizer dependencies (WRE-224)

- Patched DOMPurify to `3.4.17`, refreshed compatible lockfile dependencies, and bumped Vitest to `^5.0.5`.
- Recorded security patch verification notes in `docs/internal/SECURITY_PATCH.md`.
- Synchronized release candidate version to `1.0.0-rc.7`.

## 2026-10-25 — Polish motion and adopt Liquid Glass surfaces (WRE-219)

- Refined motion easing, spring transitions, and reduced-motion accessibility rules across `app/production.css` and `styles.css`.
- Adopted translucent Liquid Glass surface modifiers and refined elevation in `ios/Kouchd/Design.swift`.
- Synchronized release candidate version to `1.0.0-rc.6`.

## 2026-10-25 — Delayed agreement acceptance and host guest profiles (WRE-216)

- Added host-configurable agreement auto-acceptance after a 1–720 hour delay, defaulting to 24 hours; hosts can disable it, and guests can accept manually at any time.
- Added auditable agreement offer state, manual/system acceptance methods, system approval timestamps, and activity events for offers, replacements, approvals, and setting changes.
- Added host-only guest preferred-name editing and host-only guest contact details in the stay bundle.
- Synchronized release candidate version to `1.0.0-rc.5`.

## 2026-10-25 — Main website newsletter signup with Loops integration (WRE-213)

- Added accessible newsletter signup to main landing page with explicit, unchecked consent.
- Added server-side `/api/newsletter` route for Loops contact synchronization with input validation, honeypot field, and IP rate limiting.
- Synchronized release candidate version to `1.0.0-rc.4`.

## 2026-10-25 — Improve iOS navigation and dashboard activity (WRE-210, WRE-211, WRE-212)

- Fixed iOS stay creation idempotency across ambiguous network responses and retries to prevent duplicate stays.
- Routed iOS contribution and account shortcuts through their owning tabs, made recent activity rows open their related section, and kept Home stay cards from reloading the active stay.
- Reduced web dashboard agreement clutter by showing pending-review details only when needed; made activity rows navigate to the relevant area and identify actor host or guest role.
- Added More tab for secondary stay, account, and help actions, moving extra links off primary screens.
- Synchronized release candidate version to `1.0.0-rc.3`.

## 2026-10-25 — Patch Next.js security advisory and establish Version 1.0 Release Candidate 2 (WRE-228)

## 2026-10-25 — Establish Version 1.0 Release Candidate feature lock and P2P Contribution Router (WRE-234, WRE-231)

- Implemented the **Version 1.0 Release Candidate (`1.0.0-rc.1`) Feature Lock**:
  - Added `release/feature-lock.json` codifying the `v1-rc` stabilization lock, enumerating the open pre-lock PRs (#55–#61, #66) and in-flight branches (`WRE-228`, `WRE-230`, `WRE-231`, `WRE-234`) allowed to complete merge before the unconditional lock takes effect.
  - Created the `v1-feature-lock` agent skill at `.agents/skills/v1-feature-lock/SKILL.md` and helper CLI at `scripts/feature-lock.mjs` (`npm run lock:status`, `npm run lock:defer-feature`, `npm run lock:bump-rc`).
  - Enforced the feature lock in `AGENTS.md` and `scripts/release-gate.mjs`: only bug fixes, security patches, stability fixes, and documentation updates (`patch`, `rc`, `none`) may land on the 1.0 launch line; net-new features must be added to `help/product/roadmap.mdx` and developed in separate git worktrees under `/Volumes/Projects/CodexWorktrees/`.
  - Synchronized `VERSION`, `package.json`, `package-lock.json`, and `release/change.json` to `1.0.0-rc.1`, and iOS `MARKETING_VERSION` to `1.0.0`.
- Implemented the **P2P Contribution Router & 4-Phase Confirmation Engine** (`WRE-231`) across Next.js (`lib/domain/p2pRouting.ts`, `lib/domain/qrCodeLevelH.ts`, `components/household/p2p-payment-router.tsx`) and native iOS SwiftUI (`ios/Kouchd/Models.swift`, `ios/Kouchd/MainScreens.swift`), including Venmo, Cash App, Chime, PayPal (`https://paypal.me/[username]/[amount]`), Zelle, Cash, and Reward Points offsets.

## 2026-10-24 — Remediate Replay QA web security, canonical link, and sign-in defects (WRE-228)

- Remediated 5 Replay QA defects reported on `https://app.kouchd.com` and user-reported profile name saving issue:
  - Enforced Subresource Integrity (SRI) on dynamically injected cross-origin Clerk UI chunks (`vendors_ui_e564da_1.41.2.js`, `signin_ui_e564da_1.41.2.js`, `ui-common_ui_e564da_1.41.2.js`) via client security runtime interceptor (`lib/security-runtime.ts`), `<head>` preloading, and early inline script execution.
  - Implemented client-side runtime deduplication for static Clerk `/v1/environment` GET requests during initial load, preventing redundant byte-identical fetches across component mounts.
  - Added complete Content-Security-Policy (CSP) headers in Next.js configuration and proxy middleware (`clerkMiddleware`), paired with an HTML `<meta>` tag fallback in root layout.
  - Added self-referencing canonical link metadata (`https://app.kouchd.com/`) in `app/layout.tsx` (`metadataBase: new URL("https://app.kouchd.com")`, `alternates: { canonical: "/" }`) and `app/page.tsx`.
  - Disabled the sign-in "Continue" submit button visually and functionally when `#identifier-field` (email address) is empty via `SignInFormGuard` observer and `.kouchd-submit-disabled` CSS rules.
  - Fixed profile display name saving in `components/authenticated-home.tsx` and native iOS `MoreScreens.swift` for single-word names (avoiding empty string `lastName` parameter rejected by Clerk), and updated form default values to correctly display saved names.
- Added comprehensive unit tests in `tests/replay-qa-remediation.test.ts`.
- Synchronized package and iOS marketing versions to `0.6.12` with patch classification in `release/change.json`.

## 2026-10-24 — Update Replay QA site ownership nonce for security verification (WRE-227)

- Updated static route handler at `app/.well-known/replay-qa-security-nonce/route.ts` with new Replay QA security verification token (`loopqa-sec-9TrCmqrdLQkZh1UIU1Qew_Ql6bEQ36iILYviGiS25V0`).
- Updated matching static verification file at `public/.well-known/replay-qa-security-nonce`.
- Updated test expectations in `tests/replay-qa-nonce.test.ts`.
- Synchronized package and iOS marketing versions to `0.6.11` with patch release classification.

## 2026-10-24 — Modularize iOS help documentation into dedicated topic guides (WRE-226)

- Refactored single monolithic iOS guide into 3 focused, bite-sized guides under the "iPhone app" Mintlify navigation group:
  - `help/ios/using-kouchd-on-ios.mdx`: Canonical entry point covering app status, 4-tab bar layout, header controls, joining a stay (via link or referral code), and optional SMS reminder settings with mandatory regulatory disclosure.
  - `help/ios/ledger-and-contributions.mdx`: Dedicated guide explaining outside contributions, step-by-step recording, confirming and disputing entries, native-only inline dispute and void actions, and host balance controls.
  - `help/ios/chores-and-stay.mdx`: Dedicated guide covering household chore assignments, marking tasks complete/incomplete, adding chores, occupied nights tracking, stay guidelines, house notes (Wi-Fi, parking, door codes), outside payment handles, and host controls.
- Updated root `docs.json` navigation to register all 3 pages under the "iPhone app" group.
- Updated cross-platform links in `help/quickstart.mdx`, `help/guests/joining-a-stay.mdx`, `help/hosts/ledger-management.mdx`, `help/guests/logging-contributions.mdx`, and `help/hosts/house-rules-and-chores.mdx` to route directly to their specific mobile topic guides.
- Preserved release integrity: documentation-only changes do not bump SemVer; version 0.6.10 remains synchronized.
- Validation: passed `mintlify validate` (0 build errors), `mintlify broken-links` (0 broken links), and `git diff --check`.


## 2026-10-24 — Prevent anonymous RevenueCat customer profile creation (WRE-207)

- Enforced authenticated Clerk user ID requirement before initializing RevenueCat Web Billing SDK, eliminating anonymous customer registration.
- Forwarded authenticated `userId` to `presentRevenueCatPaywall` and `openCustomerCenter` in `PaywallModal`.
- Short-circuited unauthenticated entitlement and customer info checks in `checkKouchdPlusAccess`, `getCustomerInfo`, and `useKouchdPlus` so unauthenticated renders and guest views never trigger RevenueCat SDK initialization.
- Added comprehensive unit tests in `tests/revenuecat-client.test.ts`.
- Synchronized release versions to `0.6.10` with patch classification in `release/change.json`.

## 2026-10-24 — Add iOS help guidance and brand-aligned mobile UI screenshots (WRE-209)

- Created dedicated Help Center guide `help/ios/using-kouchd-on-ios.mdx` covering the native SwiftUI app: Home, Ledger, Chores, and Stay tab navigation; recording and confirming contributions; chore coordination; stay details and guidelines; Apple Sign-In; and optional SMS reminders with full disclosure.
- Registered the new guide in `docs.json` navigation under a dedicated "iPhone app" group.
- Added cross-platform "On iPhone" accordion sections to core guides (`help/quickstart.mdx`, `help/guests/logging-contributions.mdx`, `help/hosts/ledger-management.mdx`, `help/hosts/house-rules-and-chores.mdx`, `help/guests/joining-a-stay.mdx`).
- Generated 5 high-resolution Retina mobile device mockups in `help/images/` (`ios-home-overview.png`, `ios-ledger-screen.png`, `ios-record-contribution.png`, `ios-chores-screen.png`, `ios-stay-guidelines.png`) adhering to the Brand Building design system and native SwiftUI source.
- Preserved strict release integrity: documentation-only changes do not bump the version; notes in all public guides clearly specify that the iPhone app is in active development and not yet distributed on the App Store.
- Addressed PR #62 code review findings: scoped the web-parity note to core workflows while explicitly noting that Dispute and Void actions are native-only; clarified that confirmed credit applies to the oldest outstanding charge, including upcoming charges once earlier obligations are settled; and corrected the post-sign-in onboarding action label to "Join with a code" across iPhone instructions.
- Validation: passed `mintlify validate` (build validation passed), `mintlify broken-links` (zero broken links), and `git diff --check`.


## 2026-10-19 — Serve Replay QA site ownership nonce without authentication (WRE-206)

- Added static route handler at `app/.well-known/replay-qa-security-nonce/route.ts` returning HTTP 200 with raw `text/plain; charset=utf-8` and exact 54-byte token without trailing newline.
- Added matching static verification file at `public/.well-known/replay-qa-security-nonce`.
- Excluded `\.well-known` from Clerk authentication proxy matcher in `proxy.ts`.
- Added unit and route tests in `tests/replay-qa-nonce.test.ts`.
- Synchronized package and iOS marketing versions to `0.6.9` with patch release classification.

## 2026-10-19 — Enforce reward caps, preserve schedule totals, and overdue recovery (WRE-184)

- Enforced outstanding stay balance limit and cumulative period credit caps (`maxCreditPerPeriodCents`) for reward redemptions on the backend.
- Returned `periodRedeemedCents` from `getWallet` and wired to `calculateMaxRedeemablePoints` in the rewards hub dialog.
- Preserved remainder cents across weekly obligation periods so total scheduled cents strictly equal expected total.
- Replaced punitive overdue reminder notification copy with supportive household communication.
- Implemented `overdueRecoveryRequests` table and host review workflow for catch-up plans.
- Synchronized package and iOS marketing versions to `0.6.8` with patch release classification.


## 2026-10-19 — Encode native numeric arguments as Float64 and dark mode stat contrast (WRE-195)

- Converted native Swift integer values to `Double` across stay terms, ad-hoc charges, contributions, schedule requests, reward points, and household guide progress to prevent Convex schema validation rejection.
- Fixed weekly agreement acceptance in `StayScreens.swift` to pass `initialPaymentDayOfWeek` as `Double(weekday)`.
- Improved dark-mode contrast on lime account and summary stat cards using `Palette.brandForest`.
- Synchronized package and iOS marketing versions to `0.6.7` with patch release classification.


## 2026-10-19 — Search engine discoverability and crawl policies (WRE-175)

- Added targeted `app/robots.ts` crawl policy permitting public marketing, legal, and brand routes while disallowing private, console, and authentication endpoints.
- Added dynamic `app/sitemap.ts` generating canonical URLs with appropriate change frequencies and priorities for public routes.
- Added explicit `noindex, nofollow` robots metadata to single-use invitation tokens and authentication screens (`/sign-in`, `/sign-up`, `/invite/[token]`).
- Added canonical URL alternate metadata to `/sms-opt-in` to consolidate signals with `/sms`.
- Synchronized package and iOS marketing versions to `0.6.6` with patch release classification.


## 2026-10-19 — Cap and consolidate daily reminders per user (WRE-200)

- Enforced a global limit of at most 1 reminder notification per user per calendar day across payment, agreement, chore, and check-in workflows.
- Prioritized critical payment notices first, followed by agreements, chores, and check-ins.
- Consolidated host agreement reminders for multiple unsigned guests into a single notification.
- Consolidated multiple chores due on the same day into one notification with chore counts.
- Reduced agreement-pending cron frequency from twice-daily to once-daily (13:30 UTC).
- Updated `docs/NOTIFICATIONS.md` and added test coverage in `tests/daily-reminder-cap.test.ts`.
- Synchronized package and iOS marketing versions to `0.6.5` with patch release classification.


## 2026-10-19 — Host workspace desktop and compact mobile implementation (WRE-198)

- Implemented responsive host workspace overview for desktop and compact mobile based on approved Figma frames (`509-84` and `509-218`).
- Integrated household member strip, daily shared summary counts, chore overview, contribution records, and recent stay activity feed.
- Added ambient glass artwork assets in `public/host-workspace/` with fallback for reduced transparency.
- Ensured ended stays route house guide actions to the read-only Stay screen.
- Synchronized package and iOS marketing versions to `0.6.3` with patch release classification.

## 2026-10-19 — Kouchd Help Center documentation enhancement and visual overhaul

- Overhauled core Help Center guides across `help/` for consistent brand voice, plainspoken warmth, and respectful tone.
- Standardized all titles, subheadings, and UI labels to sentence case, eliminating Title Case and Ampersand formatting inconsistencies.
- Expanded shallow guides (`pricing-and-terms.mdx`, `ledger-management.mdx`, `kouchd-coins.mdx`, `stay-agreements.mdx`) into comprehensive walkthroughs with rich Mintlify components (`<Steps>`, `<Tip>`, `<Info>`, `<Note>`, `<Warning>`, `<Check>`).
- Replaced legacy screenshots with 7 high-fidelity, privacy-safe UI captures in `help/images/` matching the Brand Building design system with synthetic data (`Jordan Taylor`, `Alex Rivera`, `Maple Cottage Stay`, `KCH-OAK-4821`).
- Added dedicated `add-contribution-modal.png` screenshot and step-by-step contribution logging guidance in `help/guests/logging-contributions.mdx`.
- Removed orphaned and unreferenced duplicate file `help/using-notifications.mdx`.
- Synchronized public changelog (`help/product/changelog.mdx`) with verified October 2026 product updates (v0.5.2 patch, brand building design tokens, app subdomain routing, and reminder caps).
- Addressed PR #47 review findings: aligned referral code preview steps with implemented fields and moved full guidelines review to post-join onboarding; distinguished active membership creation from agreement acceptance using exact `Accept Terms & Enter Household` button label; removed periodic reward cap claims unenforced by backend mutations; aligned ledger recovery guidance and screenshot row controls with web workspace actions.
- Validated with `mintlify validate` (build passed), `mintlify broken-links` (zero broken links), and `git diff --check`.

## 2026-10-15 — Webapp entry streamlining and marketing architecture decoupling

- Decoupled public marketing traffic (`kouchd.com` and `www.kouchd.com`) to a standalone Astro project (`kouchd-marketing`), enabling zero-JS static delivery and independent releases.
- Streamlined `app/page.tsx` on `app.kouchd.com` by retiring runtime HTTP `Host` header sniffing and the `LandingPage` fallback; unauthenticated requests route directly to `/sign-in` while authenticated sessions render the household workspace.
- Synchronized package and iOS marketing versions to `0.6.2` with patch release classification.

## 2026-10-12 — iOS navigation bar modernization and auth sheet loop resolution

- Standardized navigation bars and toolbars across Kouchd iOS using `.kouchdNavigationBar(title:)`, toolbar placements (`.topBarLeading`, `.topBarTrailing`, `.primaryAction`, `.confirmationAction`, `.cancellationAction`), and sticky navigation bar styling.
- Resolved app freeze / watchdog termination on launch caused by `@AppStorage` observation looping when Clerk SDK writes to `UserDefaults` during auth sheet presentation.
- Updated `AboutKouchdScreen` inline navigation title and fixed welcome screen navigation link hit-testing.
- Synchronized package and iOS marketing versions to `0.4.3` with patch release classification.

## 2026-10-10 — SwiftUI Navigation modernization and route typing

- Modernized native SwiftUI navigation in Kouchd iOS to use data-driven, strongly-typed routing instead of eager closure-based destinations.
- Introduced `KouchdRoute: Hashable` representing all in-app navigation targets across tabs, onboarding, host controls, and administrative records.
- Created `View.kouchdDestinations(store:)` registering `.navigationDestination(for: KouchdRoute.self)` across all top-level `NavigationStack` instances.
- Preserved individual user scope in administrative SMS consent views via dedicated `.adminUserSmsHistory(userID:)` route.
- Synchronized package and iOS marketing versions to `0.4.2` with patch release classification.

## 2026-10-09 — Landing-page claim corrections and tablet navigation

- Removed contributor-attribution language from the public Ledger tour because the current Ledger UI does not identify the entry creator.
- Replaced the guest-editable arrival-window example with the host-scheduled next check-in date already supported by the app.
- Added an expandable tablet navigation menu so all header links remain available at widths where the desktop row does not fit.
- Prepared package/iOS version `0.4.1` as a patch for the landing-page release gate. This is branch-only work; no release, deployment, or public changelog update is verified.
- Made the release gate find the nearest versioned first-parent ancestor when the base snapshot has no version file, and added a regression test for that recovery case.
- Validation: `npm run release:check` passed against the last complete baseline; 61 tests passed, the production build and version sync passed, and the release gate passed. Lint reports 15 existing warnings and no errors. The public Mintlify changelog remains unchanged.

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

## 2026-10-22 — WRE-224 launch candidate (unreleased)

Prepared the isolated launch candidate with PR remediation, shared agreement
acceptance, account capacity safeguards, lazy workspace screens, compact financial
summaries, scoped native subscriptions and coordination screens, telemetry and
personal-shopping privacy corrections. See LAUNCH_READINESS.md for decisions,
evidence, provider gates and rollback. No production or store release is claimed.

## 2026-10-23 — Launch validation follow-up (WRE-224)

- Patched Next.js 16.4.3 and DOMPurify 3.4.17; full dependency audit is clear.
- Fixed mixed billing offerings, modal submit guards, legacy agreement rows,
  account-wide ownership capacity reads and privacy regression cases.
- Typed native agreement data and guarded mutation completions across account,
  stay and guest changes. App 143 tests and native 10 unit tests pass.
- Production synthetic host journey passed and its stay is ended with history
  retained. Signed device verification is blocked by a profile missing Apple
  sign-in capability; provider settings and production code remain unchanged.
