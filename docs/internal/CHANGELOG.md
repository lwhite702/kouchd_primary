# Internal change log

Internal engineering record. This file is excluded from Mintlify navigation and is not a public product changelog.

## 2026-10-30 — Analytics foundations, phase 1 (WRE-252)

- `/ingest` proxy: rewrites in `next.config.ts` (`/ingest/static/*` to `us-assets.i.posthog.com`, `/ingest/*` to `us.i.posthog.com`), plus `skipTrailingSlashRedirect`. `proxy.ts` matcher skips `ingest`. `posthog.init` uses `api_host: "/ingest"`. `NEXT_PUBLIC_POSTHOG_HOST` is now read only by `convex/posthog.ts` (`.env.example` says so).
- CSP: `lib/security/csp.ts` is the one source. It exports the directives (for Clerk), the header string, and the `<meta>` string without `frame-ancestors`. Directive content is unchanged.
- `cross_subdomain_cookie: true` on PostHog.
- `lib/analytics/attribution.ts`: shared `kouchd_attr` cookie on `.kouchd.com` (host-only on previews and localhost). `captureAttribution()` runs after `posthog.init`; `PostHogAuthSync` passes `initial_*` properties as `$set_once` on identify.
- Marketing site (`kouchd_marketing`, same branch): `src/components/common/ConsentBridge.astro` mirrors the banner choice into a `kouchd_consent` cookie (`analytics`, `ads` always false for now, `gpc` from Global Privacy Control). With analytics consent it records `kouchd_attr`; choosing "Only necessary" clears it.
- Evidence:
  - `next build` passes. Built routes manifest shows both rewrites and a CSP header with `frame-ancestors`.
  - Locally, `/ingest/*` reached the rewrite without Clerk. The upstream fetch failed only because this sandbox can't resolve PostHog's hosts.
  - Marketing preview in Chromium: no cookies before a choice; consent and attribution cookies after "Allow analytics"; attribution cleared after "Only necessary".
  - `vitest run` passes. Not yet checked: production delivery through `/ingest`.

## 2026-10-30 — Analytics and flags review, phase 0 (WRE-252)

- Full PostHog, flag, observability and conversion review; the phased plan is in WRE-252.
- `app/privacy/page.tsx`: the hard-coded telemetry bullet matched neither `lib/legal.ts` nor the code. Rewritten to match `lib/legal.ts` section 6.
- `lib/flags/client.ts`: new `localOverridesAllowed()`. It returns false when `NEXT_PUBLIC_VERCEL_ENV` is `production`, or when that variable is unset and `NODE_ENV` is `production`. `getLocalDevOverride` returns null then. Test added in `tests/feature-flags.test.ts`.
- `components/posthog-provider.tsx`: `PostHogAuthSync` waits for Clerk `isLoaded`, and calls `reset()` only when PostHog's `$user_state` is `identified`. Before this, every signed-out page load reset the anonymous ID.
- `ios/README.md`: the web-client analytics description and the tracked PostHog token note corrected.
- Checks: `vitest run` (36 files, 215 tests), `tsc --noEmit`, `eslint` on the changed files (no errors), release gate passes.

## 2026-10-29 — RevenueCat → PostHog preparation (WRE-251)

- Context: RevenueCat's PostHog integration sends subscription lifecycle events to PostHog from RevenueCat's servers. It is not turned on; the `Kouchd` PostHog project (595950) had no RevenueCat, purchase, paywall or checkout events in the last 60 days.
- First commit sent `paywall_viewed` and `customer_center_opened` from `components/billing/paywall-modal.tsx`. Removed after review (xhawk): the in-app Privacy Policy section 6 limits optional telemetry to page and screen categories, `paywall_viewed` fired before the paywall rendered, and `customer_center_opened` can't detect a blocked pop-up (`window.open` with `noopener` returns `null`). The doc records how to add them once the copy is approved.
- `tests/revenuecat-posthog.test.ts`: source checks that web and iOS identify PostHog and RevenueCat with the same Clerk user ID (so no `$posthogUserId` attribute is needed), and that the paywall does not send `checkout_started` or `subscription_activated`. No product code changes.
- Decision (Lee, 2026-10-30): keep web autocapture and session replay on; change the policy, not the config. `lib/legal.ts` Privacy Policy section 6 and Cookie Policy "Performance and diagnostics" rewritten to say what the web app records, including that replays hide typed input but can show names, household details and contribution amounts, and that signed-in web sessions are linked to account ID, name and email. Decisions (Lee, 2026-10-30): keep sending name and email with the web `identify`; add RevenueCat to the service-provider lists here and in `kouchd_marketing`; no separate user notice. Dates moved from shared `legalMeta` to each `LegalDocumentData` (review finding: a shared date re-dated unchanged documents). Privacy and Cookie Policies are dated October 30, 2026; Terms and Acceptable Use keep October 23, 2026. Same change in `kouchd_marketing`, where only the Privacy Policy moves. Version 0.7.22.
- `docs/internal/REVENUECAT_POSTHOG.md`: identity table, event plan, dashboard checklist, verification query, privacy findings.
- Privacy findings (open, need approval): neither privacy policy names RevenueCat; the in-app Cookie Policy's PostHog sentence would no longer be accurate once plan data arrives; and on web the policy already conflicts with `autocapture: true`, session replay, and `identify` sending email and name.
- Checks: `vitest run` (36 files, 214 tests), `tsc --noEmit`, `eslint` on changed files. The RevenueCat docs page could not be fetched from this environment; the dashboard steps follow its PostHog integration and must be confirmed in the RevenueCat dashboard.

## 2026-10-29 — Web body copy in Inter

- Decision (Lee, 2026-10-29): body copy is Inter; titles and display text stay Manrope. `docs/internal/BRAND_DESIGN_SYSTEM.md` and `app/brand-system.css` already said so; the web app and `AGENTS.md` did not.
- The base font moved from Manrope to Inter in four places: `:root` in `styles.css`, `.production-shell` in `app/production.css`, the dashboard root in `components/dashboard-v21.css`, and the marketing root in `components/landing-v21.css`.
- `styles.css` now pins Manrope on `h1`–`h6`, `button`, `.button`, `.v21-button`, eyebrows and overlines (`[class*="eyebrow"]`), pills (`[class*="-pill"]`), `.metric`, `.badge`, the `.v21-brand` wordmark, and footer column titles.
- Review feedback: dashboard and marketing controls that set `font-family: inherit` (sidebar nav items, summary tiles, pill and attention buttons, invite pill, sign-in, preview tabs) would have picked up Inter. They now set Manrope, and `components/dashboard-v21.css` pins Manrope on the dashboard's titles, tile labels, and tile metrics.
- Controls that reset the font with the `font: inherit` shorthand also set Manrope after it: the host workspace text, icon, and secondary actions, check-in card buttons, the newsletter button, and mobile menu items. Activity rows and inputs keep inheriting Inter.
- Swept `landing-v21.css`, `dashboard-v21.css`, and `about-kouchd-page.css` for heavy (750+) text with no font family and pinned Manrope on the display ones: proof-card and summary metrics, contribution amounts, kickers and overlines, avatars and initials, step and feature numbers, status labels, FAQ questions, and the sidebar wordmark. Bold inline phrases inside sentences stay Inter.
- `AGENTS.md` "Brand and product design" now names Manrope for titles and display text and Inter for web body copy.
- Checked computed fonts on `/about` in a local dev server. The signed-in dashboard was not checked. The old `.landing-*` rules in `styles.css` are not used by any page and were left as they were.
- Version `0.7.21` (re-prepared after the zod patch and the iOS review fixes took `0.7.19` and `0.7.20` on `main`).
- Review fix: `.v21-host-heading` dropped from the Manrope rule; it wraps the stay subhead, which now stays Inter. The title keeps Manrope through `.v21-stay-title`.
- Review fix: the Ledger summary amounts and labels (`.summary-item strong`, `.summary-item span`) keep Manrope. A sweep of `styles.css` for heavy text with no font family also pinned `.brand`, `.avatar`, `.list-value`, `.details-card p:last-child`, and `.stay-hub-card > strong`.

## 2026-10-29 — iOS review fixes: analytics privacy, paywall disclosures, introduction (WRE-249)

- `ios/Kouchd/KouchdApp.swift`:
  - PostHog is set up through the existing `KouchdAnalytics` helper (replay, screen, lifecycle and element capture all off), instead of a second setup that turned on session replay and automatic screen capture.
  - `identify` sends only the Clerk user ID; email and full name are no longer sent.
  - Removed the `stay` group call, which sent the stay name.
  - The curated `screen_viewed` event, which was never called before, now fires on root phase changes.
- `ios/Kouchd/Billing.swift`:
  - `BillingPackage` gains `period` (from `SubscriptionPeriod`) and `priceWithPeriod`.
  - The subscription screen adds an auto-renewal and cancellation note, plus Terms and Privacy links (App Store guideline 3.1.2).
- `ios/Kouchd/Introduction.swift`:
  - At accessibility text sizes the footer scrolls with the content instead of staying pinned.
  - The couch mark is a template image tinted with `Palette.forest` on the intro and About.
  - Intro text uses `Palette.ink`; only controls use forest/lime.
  - Skip is hidden on the role step.
  - Both role headings use `Palette.section`.
  - The splash wordmark stays on one line at large text sizes.
- Tests: new `testPriceIncludesRenewalPeriodWhenKnown`, and `testSkipShowsRoleSelection` now asserts that Skip is gone. Added two UI journeys at `.accessibility5` (launch flag `--ui-test-accessibility-text`) that check the footer isn't pinned and stays reachable. Local simulator run on iPhone 18 Pro Max: 22 unit and 9 UI tests passed.
- Checked visually in the simulator: introduction light and dark, role step, and largest accessibility size. Not checked: the paywall on screen (needs a signed-in host with RevenueCat offerings), and a 375-point iPhone (no small simulator installed).
- Open: there is no in-app account deletion. It exists only in Clerk's `UserProfileView`, if self-deletion is enabled in Clerk, which the Clerk config API doesn't expose. There is no Convex deletion path for stays and records. Apple requires in-app deletion; this needs a product decision on what happens to shared records.
- Version `0.7.20` (renumbered from `0.7.19`, which PR #89 uses for the zod override).

## 2026-10-29 — Patch zod for CVE-2023-54404

- `package.json`: added `"overrides": { "zod": "^4.6.6" }`. `npm ls zod` showed `zod` only as a dev dependency of `eslint-plugin-react-hooks@7.1.1` (through `eslint-config-next@16.4.3`), whose range `^3.25.0 || ^4.0.0` had locked 4.5.4. `zod-validation-error@4.0.2` now dedupes to the same copy.
- `package-lock.json`: `node_modules/zod` moves from 4.5.4 to 4.6.7; no other entries changed.
- This is the only open Dependabot alert on `main` (#45, high, `zod < 4.6.6`, first patched 4.6.6). It should close once this merges to `main`; that is not yet observed.
- Version `0.7.19`. Open PR #88 (web body font) also uses `0.7.19`; whichever merges second must re-prepare the next patch, because the release gate requires a patch to be exactly one above `main`.

## 2026-10-29 — Readable text on lime in iOS dark mode

- `ios/Kouchd/Design.swift`: added a fixed `Palette.onLime` (#16241E, the light-mode ink). `Pill` now uses it instead of the adaptive `Palette.ink`, which is #F1F5F0 in dark mode and sat on the fixed lime fill at 1.1:1. Now 13.0:1 in both appearances.
- `ios/Kouchd/MainScreens.swift`: the account initials button in the toolbar uses `Palette.onLime` on its lime circle for the same reason.
- Left unchanged: other lime fills already use `brandForest` text, and the payment channel row (ink on 35% lime over cream) measures 5.8:1 in dark and 13.8:1 in light.
- Checked with a local `xcodebuild` simulator build; not yet viewed in dark mode on a simulator or device.
- Version `0.7.18`.

## 2026-10-29 — Harden web CI workflow, newsletter rate limiter, and error handling (WRE-241)

- Added a `web` job on `ubuntu-latest` in `.github/workflows/release-integrity.yml` that gates pull requests with the environment check, `tsc --noEmit`, ESLint, Vitest, and the Next.js production build.
- Kept the existing `verify` job on `macos-latest` for iOS release integrity, fastlane validation, and the simulator build.
- Hardened the newsletter rate limiter in `app/api/newsletter/route.ts` and `lib/newsletter-limiter.ts`:
  - A 5,000-entry cap and expired-entry pruning bound memory growth.
  - Client IP comes from `x-real-ip`, then the first `x-forwarded-for` entry.
  - Timeouts and provider outages return 502 and internal errors return 500, logged server-side without sending error objects or stack traces to clients.
- `tests/newsletter.test.ts`: 12 tests covering rate limiting, IP extraction, Loops submission, the honeypot, timeouts, and internal errors.
- Originally prepared against `1.0.0-rc.13` on 2026-10-26; renumbered to `0.7.17` on the 0.7.x prerelease line after merging `main`.

## 2026-10-28 — Fix web sign-in button guard and native stay creation (WRE-242)

- Fixed `SignInFormGuard` in `components/sign-in-form-guard.tsx` to prevent disabling the submit button on password, OTP, and MFA verification steps when the identifier input is no longer rendered.
- No code change for stay creation: checked that all numeric terms (`rateCents`, `earlyDiscountPercentage`, `earlyDiscountDays`, `lateFeeCents`, `graceDays`, `paymentDayOfWeek`) are already sent as `Double`, which Convex's `v.number()` validator expects.
- Version `0.7.16`. The earlier draft of this entry also listed `/sign-in` and `/sign-up` redirects; those are not part of this change.

## 2026-10-28 — iOS settings and ledger summary parity (WRE-247)

- `ios/Kouchd/MoreScreens.swift`: **Host controls** gets two new cards:
  - **Automatic acceptance** calls `stays:updateAgreementAutoAccept` (1–720 hours, or off).
  - **Guest display names** calls `stays:updateGuestPreferredName`.
  - Both are hidden on ended stays.
- `convex/obligations.ts`: new `ledgerWithTotals` query returns `{ rows, totals }` from a single `buildFinancialRecord` call. `summary` now shares the `summarize` helper, and `list` and `summary` are unchanged for web and older iOS builds. Covered in `tests/backend.test.ts` (matches `list` and `summary`; rejects outsiders).
- `ios/Kouchd/Service.swift`: the store subscribes once to `obligations:ledgerWithTotals` instead of `obligations:list`, and fills `ledger`, `typedLedger`, and `ledgerSummary` from it. Review feedback: the earlier version subscribed to `list` and `summary` together, so the full ledger was computed twice on every update.
- The display-name card lists only active guests, because `stays:updateGuestPreferredName` rejects inactive ones.
- `ios/Kouchd/MainScreens.swift`: `LedgerSummaryCard` uses web's labels.
- `ios/Kouchd/Models.swift`: the `HouseholdSettings` rules (default on, 24 hours, hour range, name length) mirror the server.
- Numbers are sent as `Double`, matching the WRE-242 encoding fix.
- Evidence: the simulator build succeeded, `KouchdTests` passed (15 tests, including 4 new `HouseholdSettingsTests`), and `npm run release:check` passed for `0.7.15` (earlier prepared as `1.0.0-rc.17`; stacked on WRE-246 at `0.7.14`), and Vitest passed (174 tests). Not exercised while signed in.
- Not done: no in-app notification feed (needs the Knock iOS SDK) and no push notifications (post-1.0).

## 2026-10-28 — Web host corrections parity (WRE-246)

- Wired existing backend functions into the web workspace:
  - `contributions:dispute` and `contributions:voidContribution` in the Ledger.
  - `chores:voidChore` on the chore board.
  - `rewards:voidClaim` in the rewards hub.
  - `stays:updateName` behind **Rename stay**.
  - `referral:regenerateCode` behind **New code** in the invite panel.
  - `terms:updateCurrent` behind **Edit household defaults**, reusing `GuestAgreementForm` with a new `intro` prop.
- Each button appears only where the server allows the action, matching iOS: the host or the record's creator (or claimant), and dispute only for pending entries someone else added. Hidden on ended stays.
- `DestructiveAction` and `destructiveActionCopy` moved to `components/workspace/types.ts` so all confirmations share copy.
- The invite panel closes before the new-code confirmation, because the confirmation isn't a top-layer dialog.
- Review fixes:
  - `contributions:voidContribution` rejects a credit that came from a reward redemption, and `rewards:voidClaim` rejects a confirmed claim whose points are already redeemed. Before this, either void could leave points spent with no credit, or credit with no points. This affected iOS too.
  - The household-defaults text now says every active guest gets a new version to review and that per-guest settings carry forward, matching `terms:updateCurrent`.
  - **New code** shows only for hosts.
- Version `0.7.14`, stacked on WRE-244 (`0.7.13`); earlier prepared as `1.0.0-rc.16`.
- Evidence: `tsc --noEmit` clean, ESLint has no new findings, Vitest passed (33 files, 177 tests, including new `tests/destructive-actions.test.ts` and redemption-void cases in `tests/rewards.test.ts`), and `npm run release:check` passed. Not exercised in a browser against a live Convex deployment.
- Not done: no push notifications or overdue payment plan screens (post-1.0). Public help pages wait for release verification.

## 2026-10-28 — iOS parity: edit shopping items and set chore repeats (WRE-244)

- Privacy change (requested 2026-10-28): personal shopping items are visible only to their creator. Hosts lose the exception they had before.
  - `convex/shopping.ts`: `list` returns shared items plus the viewer's own personal items. `requireItemEditor` throws "Shopping item not found" for anyone else's personal item. `update` lets only the creator set `personal`.
  - `convex/activity.ts`: `canSee` hides shopping rows that carry `guestUserId` (the personal-item marker) from everyone except that user, hosts included, in both `list` and `page`. This also hides older rows.
  - Web `components/household/shopping-list.tsx` drops the `isHost` prop and shows the List select only to the creator. iOS `HouseholdRules` drops `isHost`.
  - `tests/shopping-privacy.test.ts` rewritten (5 tests): host and other guest can't list, toggle, remove, or update a personal item; only the creator can make an item personal; personal activity is hidden from host and guest; shared activity is still visible; host paging has no duplicate rows.
- `ios/Kouchd/CoordinationScreens.swift`: added an **Edit item** sheet that calls `shopping:update`. Its permission check matches `requireItemEditor` (shared items can be edited by any member; personal items only by their creator). Only the creator sees the personal toggle.
- `ios/Kouchd/MainScreens.swift`: added a **Repeat** picker to `ChoreForm` that sends `repeatCadence` when it is daily or weekly, and shows "Repeats <cadence>" on chore cards.
- `ios/Kouchd/HouseholdRules.swift`: the client-side permission and cadence rules, kept in one place and covered by `ios/KouchdTests/HouseholdRulesTests.swift` (6 tests).
- Version `0.7.13` (first prerelease after WRE-248; earlier prepared as `1.0.0-rc.15`).
- Evidence: Debug simulator build succeeded (iPhone 18 Pro Max, iOS 27.0), `KouchdTests` passed (17 tests, 0 failures), and `npm run release:check` passed, and the full Vitest suite passed (178 tests). Not exercised against a signed-in account; no UI test covers the new sheet or picker.
- Not done: public iOS help (`help/ios/chores-and-stay.mdx`) and the public changelog are waiting for release verification. Tracked in WRE-244.

## 2026-10-28 — Resume prerelease numbering and pause the 1.0 feature lock (WRE-248)

- Team decision: Kouchd stays in prerelease until the team approves the official App Store submission.
- Renamed the 13 releases recorded as `1.0.0-rc.1`–`1.0.0-rc.13` to `0.7.0`–`0.7.12`. None were tagged or released, so only the records change. Earlier entries in this log now show the current number with the old one in parentheses.
- `release/version-history.json` holds the mapping. `scripts/release-gate.mjs` compares the base version by its current number, allows the one-time rename (`none` from `1.0.0-rc.13` to `0.7.12`), and treats the next prerelease as `0.7.13`. Covered by three new cases in `tests/release-gate.test.ts`.
- `release/feature-lock.json`: `enabled: false`, phase `prerelease`, with an `activation` block naming the trigger (App Store submission approved) and the next step (`1.0.0-rc.1`).
- `scripts/release-version.mjs` and `scripts/feature-lock.mjs bump-rc` refuse `-rc.N` versions while the lock is off; `lock:status` reports the lock as open.
- `VERSION`, `package.json`, the lockfile, and the iOS `MARKETING_VERSION` set to `0.7.12`. No 1.0.0 build was uploaded to App Store Connect, per the team.
- Open PRs renumbered in merge order: #79 → `0.7.13`, #83 → `0.7.14`, #84 → `0.7.15`. Each is stacked on the PR before it. #74 (WRE-242) still needs a 0.7.x number when it merges.

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
- Synchronized release candidate metadata to `0.7.11` (recorded as `1.0.0-rc.12`).
## 2026-10-26 — Update Help Center & tooltips for 1.0 RC status and app support boundaries (WRE-238)

- Created dedicated app support guide `help/support/app-support.mdx` clarifying that `help@kouchd.com` provides technical app assistance (account access, bug reports, and reminder settings), while Kouchd explicitly does not mediate interpersonal roommate conflicts, stay disputes, house rule issues, or external payment problems.
- Registered the new support guide in `docs.json` navigation under `"Support"` and added `"App support"` to footer navigation links.
- Updated `help/product/roadmap.mdx` and `help/product/changelog.mdx` to reflect the then-current Version 1.0 Release Candidate labels (since renamed `0.7.x`) stabilization under the feature lock:
  - Documented merged capabilities: delayed guest agreement acceptance, synced profile names, Loops newsletter signup, Liquid Glass motion polish, and direct workspace routing.
  - Documented remaining pre-lock launch merges (dependency hardening, package maintenance, release readiness).
  - Outlined post-1.0 exploration (shared grocery receipt scanning, App Store distribution, recurring chore rotation) without promised ETAs.
- Updated plain-language guidance across `help/index.mdx`, `index.mdx`, `help/legal-trust/stay-agreements.mdx`, `help/legal-trust/terms-of-service.mdx`, `help/hosts/getting-started.mdx`, `help/guests/joining-a-stay.mdx`, `help/hosts/ledger-management.mdx`, and `help/guests/logging-contributions.mdx`.
- Refined all in-app tooltips and help tips across `components/authenticated-home.tsx`, `components/marketing/marketing-header.tsx`, and `components/household/payment-options.tsx` to use friendly, plainspoken, non-technical terminology.
- Added `appSupport` URL to `lib/help-links.ts`.
- Synchronized release candidate version to `0.7.9` (recorded as `1.0.0-rc.10`) for runtime tooltip and helper updates under the 1.0 feature lock.

## 2026-10-26 — Fix iOS RootView compiler timeout (WRE-239)

- Split the root screen branches and authenticated tab composition into focused view properties, and extracted lifecycle callbacks to reduce SwiftUI type-checking complexity.
- Kept analytics identity updates separate from session connection updates and used public Clerk first/last-name fields.
- Verified a generic iOS Simulator Debug build with Xcode.
- Synchronized release candidate metadata to `0.7.8` (recorded as `1.0.0-rc.9`).


## 2026-10-25 — Add Kouchd artwork to onboarding and empty stays (WRE-237)

- Added decorative brand artwork to the host and guest welcome steps, host/join start screen, and no-active-stays state.
- Added responsive image framing and documented the customer-visible polish in the root unreleased changelog.
- Synchronized release candidate metadata to `0.7.7` (recorded as `1.0.0-rc.8`) after the WRE-237 push check required a unique version.


## 2026-10-25 — Patch vulnerable framework and sanitizer dependencies (WRE-224)

- Patched DOMPurify to `3.4.17`, refreshed compatible lockfile dependencies, and bumped Vitest to `^5.0.5`.
- Recorded security patch verification notes in `docs/internal/SECURITY_PATCH.md`.
- Synchronized release candidate version to `0.7.6` (recorded as `1.0.0-rc.7`).

## 2026-10-25 — Polish motion and adopt Liquid Glass surfaces (WRE-219)

- Refined motion easing, spring transitions, and reduced-motion accessibility rules across `app/production.css` and `styles.css`.
- Adopted translucent Liquid Glass surface modifiers and refined elevation in `ios/Kouchd/Design.swift`.
- Synchronized release candidate version to `0.7.5` (recorded as `1.0.0-rc.6`).

## 2026-10-25 — Delayed agreement acceptance and host guest profiles (WRE-216)

- Added host-configurable agreement auto-acceptance after a 1–720 hour delay, defaulting to 24 hours; hosts can disable it, and guests can accept manually at any time.
- Added auditable agreement offer state, manual/system acceptance methods, system approval timestamps, and activity events for offers, replacements, approvals, and setting changes.
- Added host-only guest preferred-name editing and host-only guest contact details in the stay bundle.
- Synchronized release candidate version to `0.7.4` (recorded as `1.0.0-rc.5`).

## 2026-10-25 — Main website newsletter signup with Loops integration (WRE-213)

- Added accessible newsletter signup to main landing page with explicit, unchecked consent.
- Added server-side `/api/newsletter` route for Loops contact synchronization with input validation, honeypot field, and IP rate limiting.
- Synchronized release candidate version to `0.7.3` (recorded as `1.0.0-rc.4`).

## 2026-10-25 — Improve iOS navigation and dashboard activity (WRE-210, WRE-211, WRE-212)

- Fixed iOS stay creation idempotency across ambiguous network responses and retries to prevent duplicate stays.
- Routed iOS contribution and account shortcuts through their owning tabs, made recent activity rows open their related section, and kept Home stay cards from reloading the active stay.
- Reduced web dashboard agreement clutter by showing pending-review details only when needed; made activity rows navigate to the relevant area and identify actor host or guest role.
- Added More tab for secondary stay, account, and help actions, moving extra links off primary screens.
- Synchronized release candidate version to `0.7.2` (recorded as `1.0.0-rc.3`).

## 2026-10-25 — Patch Next.js security advisory and establish Version 1.0 Release Candidate 2 (WRE-228)

## 2026-10-25 — Establish Version 1.0 Release Candidate feature lock and P2P Contribution Router (WRE-234, WRE-231)

- Implemented the **Version 1.0 Release Candidate (`0.7.0` (recorded as `1.0.0-rc.1`)) Feature Lock**:
  - Added `release/feature-lock.json` codifying the `v1-rc` stabilization lock, enumerating the open pre-lock PRs (#55–#61, #66) and in-flight branches (`WRE-228`, `WRE-230`, `WRE-231`, `WRE-234`) allowed to complete merge before the unconditional lock takes effect.
  - Created the `v1-feature-lock` agent skill at `.agents/skills/v1-feature-lock/SKILL.md` and helper CLI at `scripts/feature-lock.mjs` (`npm run lock:status`, `npm run lock:defer-feature`, `npm run lock:bump-rc`).
  - Enforced the feature lock in `AGENTS.md` and `scripts/release-gate.mjs`: only bug fixes, security patches, stability fixes, and documentation updates (`patch`, `rc`, `none`) may land on the 1.0 launch line; net-new features must be added to `help/product/roadmap.mdx` and developed in separate git worktrees under `/Volumes/Projects/CodexWorktrees/`.
  - Synchronized `VERSION`, `package.json`, `package-lock.json`, and `release/change.json` to `0.7.0` (recorded as `1.0.0-rc.1`), and iOS `MARKETING_VERSION` to `1.0.0`.
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
