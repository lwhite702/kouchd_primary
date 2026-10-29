# Changelog

## [Unreleased]

### Fixed

- **iOS review fixes (WRE-249, 0.7.20)**:
  - **Analytics:** the app now sets up PostHog through the existing `KouchdAnalytics` helper. Session replay, automatic screen capture and element capture are off, `identify` sends only the Clerk user ID, and the `stay` group (which sent the stay name) is gone. The curated `screen_viewed` event now fires for the introduction, welcome, setup and home screens. Before this, `KouchdApp` turned on replay and sent email and full name, which contradicted `ios/README.md`.
  - **Subscription screen:** prices show the renewal period (for example "$4.99 / month"). An auto-renewal and cancellation note, plus Terms and Privacy links, sit above Restore purchases.
  - **Introduction, largest text sizes:** the footer now scrolls with the content instead of covering about 40% of the screen and overlapping the page dots and heading.
  - **Introduction and About, couch mark:** it now uses `Palette.forest`, so it's forest green on cream and lime in dark mode, instead of pale lime in both.
  - **Introduction, dark mode:** text uses `Palette.ink`, and only controls use the forest/lime accent.
  - **Introduction, last step:** Skip no longer shows on the role choice.
  - **Introduction, role cards:** both headings now use Manrope.
- iOS status pills and the account initials button now stay readable in dark mode. Their text used the adaptive `Palette.ink`, which turns near-white in dark mode and sat on the fixed lime fill at 1.1:1. A new fixed `Palette.onLime` (#16241E) gives 13.0:1 in both appearances (0.7.18).
- Web sign-in keeps the submit button usable on the password, code, and two-factor steps, where the email field is no longer shown. Before this, those steps could not be submitted (WRE-242, 0.7.16).

### Changed

- **Web CI gate (WRE-241)**: Added a `web` job on `ubuntu-latest` in `.github/workflows/release-integrity.yml` that runs the environment check, TypeScript typecheck, ESLint, the Vitest suite, and the production `next build` on every PR to `main`.
- **Newsletter rate limiting and errors (WRE-241)**: Hardened `app/api/newsletter/route.ts` and extracted `lib/newsletter-limiter.ts`:
  - Capped the in-memory limiter at 5,000 entries and pruned expired entries so memory stays bounded.
  - Client IP now comes from `x-real-ip`, then the first `x-forwarded-for` entry.
  - Network timeouts and provider outages return 502; internal errors return 500. Details are logged server-side and not sent to clients.
  - Covered in `tests/newsletter.test.ts` (12 tests).
- **Prerelease numbering resumed and 1.0 feature lock paused (WRE-248)**: Renamed the releases recorded as `1.0.0-rc.1`–`1.0.0-rc.13` to `0.7.0`–`0.7.12` (none were tagged or released) and set `VERSION`, `package.json`, the lockfile, and the iOS marketing version to `0.7.12`. `release/version-history.json` holds the mapping, and `scripts/release-gate.mjs` compares recorded versions by their current number, so the next prerelease is `0.7.13`. `release/feature-lock.json` is now `enabled: false` (phase `prerelease`) until the team approves the App Store submission; `release-version.mjs` and `lock:bump-rc` refuse `-rc.N` versions while it is off. Updated `AGENTS.md`, the public roadmap and changelog, and internal records.
- **Landing and Marketing Pages Polish & Accessibility (WRE-240)**: Polished public marketing and landing pages across accessibility, motion, visual hierarchy, and conversion. Added comprehensive `prefers-reduced-motion` CSS controls and focus-visible indicators, built interactive multi-view preview tabs (Overview, House Guide, Ledger, Chores) on the landing page, implemented a structured footer keeping `/brand` exclusively in the footer for media/staff, and injected Schema.org JSON-LD structured data (`Organization`) on `/about`.

- **Prerelease Help Docs, Support Boundaries & Plain-Language Tooltips (WRE-238)**: Created a dedicated app support guide at `help/support/app-support.mdx` detailing that `help@kouchd.com` provides technical assistance while Kouchd explicitly does not mediate roommate conflicts, stay disputes, or outside financial disagreements. Refined all web app tooltips and help tips to use friendly, plainspoken language, and aligned the roadmap and public changelog with 1.0 Release Candidate status.
- Added warm Kouchd illustrations to host and guest welcome steps, the host/join start screen, and the no-active-stays state.
- **Motion Polish & Liquid Glass Surfaces (WRE-219)**: Refined spring transitions, reduced-motion fallbacks, and translucent Liquid Glass surface treatments across web CSS (`app/production.css`, `styles.css`) and native iOS design tokens (`ios/Kouchd/Design.swift`).
- **Version 1.0 Feature Lock (`0.7.0`, recorded as `1.0.0-rc.1`, WRE-234)**: Established the Version 1.0 launch feature lock (`release/feature-lock.json`), created the `v1-feature-lock` agent skill (`.agents/skills/v1-feature-lock/SKILL.md`) and CLI (`scripts/feature-lock.mjs`), and updated `scripts/release-version.mjs` and `scripts/release-gate.mjs` to support `X.Y.Z-rc.N` versions. Once currently open pre-lock merges complete, only patches and bug fixes are permitted on the launch branch while new features are routed to `help/product/roadmap.mdx` and isolated git worktrees.
- **P2P Contribution Router & 4-Phase Confirmation Engine (WRE-231)**: Added responsive P2P routing (Venmo, Cash App, Chime, PayPal `paypal.me`, Zelle clipboard helper, in-person Cash, and Reward Points offsets) with ISO/IEC 18004 Level-H QR generation and a 4-phase confirmation flow across the Next.js web app and native iOS SwiftUI app.

### Fixed

- **iOS settings and ledger summary parity (WRE-247)**: Hosts on iOS can now set each guest's display name and the agreement automatic-acceptance window (or turn it off) from **Host controls**, and the iOS Ledger shows the same summary as web (total charges, confirmed credit, remaining scheduled, and entries awaiting confirmation). A new `obligations:ledgerWithTotals` query returns ledger rows and totals from one financial computation, so iOS no longer subscribes to the ledger twice; `obligations:list` and `obligations:summary` are unchanged for web and older iOS builds. The display-name card lists only active guests.
- **Web host corrections parity (WRE-246)**: The web app now has the record corrections iOS already offered. In the Ledger, people can dispute a pending contribution they didn't add and void contributions; in Chores and rewards, the host or the person who added a record can void it. Hosts can rename a stay, create a new join code (the old one stops working), and edit household default terms. Void, new-code, end-stay, and cancel-charge confirmations now share one copy helper (`destructiveActionCopy`). The server now also refuses to void a reward redemption credit, or a confirmed reward claim whose points were already redeemed, so reward points and ledger credit stay in step on web and iOS.
- **Personal shopping items are private to their creator (WRE-244)**: Hosts no longer see, edit, check off, or remove a guest's personal shopping items, and personal-item activity no longer appears in the host's activity feed (including rows recorded before this change). `shopping:list`, `requireItemEditor`, and `shopping:update` now allow only the creator; others get "Shopping item not found". Only the creator can make an item personal. Web and iOS hide the edit, remove, and personal controls to match, and the copy now says personal items are visible only to you.
- **iOS household coordination parity (WRE-244)**: Brought the iOS app in line with web for household coordination. You can now edit a shopping item's name, quantity, note, and shared/personal setting from the iOS shopping list. Edit appears only when the server would allow it, and only the person who added an item sees the personal toggle. The iOS **New chore** form now has a **Repeat** picker (does not repeat, daily, weekly) that sends `repeatCadence` to `chores:create`, and repeating chores show their cadence in the chore list. No backend changes.
- Fixed the help-center dark logo (`help/logo/dark.svg`) so it uses the iOS dark-mode palette (`ios/Kouchd/Design.swift`: forest `#D5F59A`, muted `#AEB8B0`, cream `#101713`) instead of repeating the light logo, and outlined the horizontal logo wordmark (`public/brand/kouchd-logo-horizontal.svg`) from Manrope ExtraBold so it renders in Manrope everywhere, including where the font is not installed.
- Fixed the iOS `AppConfig` declaration so the merged launch candidate compiles cleanly in the release workflow.
- Fixed an iOS SwiftUI compiler timeout in `RootView` by splitting screen composition and lifecycle callbacks into focused helpers.
- Patch Next.js to 16.4.3 and DOMPurify to 3.4.17, align the framework lint configuration, and refresh compatible dependencies. Local full and runtime audits report zero advisories; release requires its own promotion approval.
- Upgraded Next.js from `16.4.0` to `16.4.3` and `eslint-config-next` to `16.4.3` across the application to remediate published framework security advisories, and configured `experimental.agentUpgrade: "security"` in Next.js configuration.
- Remediated Replay QA security and UX defects on `app.kouchd.com`:
  - Enforced Subresource Integrity (SRI) on dynamically injected cross-origin Clerk UI vendor chunks via a preloaded runtime guard (`lib/security-runtime.ts`) and root layout script.
  - Deduplicated initial Clerk `/v1/environment` configuration fetches through an early runtime cache interceptor, reusing the initial 200 response across components.
  - Added strict `Content-Security-Policy` (CSP) headers in Next.js configuration and proxy middleware (`clerkMiddleware`), with an HTML `<meta>` fallback in root layout.
  - Added self-referencing canonical link metadata (`https://app.kouchd.com/`) on the root application layout and entry route.
  - Disabled the sign-in "Continue" submit button visually and functionally whenever the required email address input is empty, preventing premature invalid submissions.
  - Fixed profile name saving in the web account settings and iOS client for single-word names by preventing empty `lastName` strings from being dispatched to Clerk, and updated display name inputs to properly reflect saved member names instead of blank fields.
- Prevented anonymous RevenueCat customer profile creation by requiring an authenticated Clerk user ID before initializing Web Billing, forwarding host identity to web paywall presentation, and short-circuiting unauthenticated entitlement checks.
- Made stay creation idempotent across ambiguous server responses and retries so one create request cannot produce duplicate stays.
- Routed iOS contribution and account shortcuts through their owning tabs, made recent activity open its related area, and kept Home stay cards from reloading the current stay.
- Reduced dashboard agreement clutter by showing pending-review details only when needed; made activity rows navigate to the relevant area and identify the actor's host or guest role.
- Encoded native numeric arguments as Float64 across stay creation, agreement acceptance, ad-hoc charges, contribution amounts, schedule weekdays, reward points, and household guide progress to prevent Convex validation failures; fixed dark-mode contrast on lime account and summary surfaces.
- Native tour completion uses local revision state with explicit persistence so Clerk authentication preference writes cannot repeatedly invalidate the root sheet host; the host retains a stable ZStack. Adds the Face ID usage description required by biometric sign-in.

### Added

- Prepared account-wide Starter and Plus capacity checks with preserved existing access and a separate enforcement rollout switch.
- Consolidated manual and scheduled agreement acceptance, corrected guest-specific updates, and retained clear system audit events.
- Added native shopping and check-in destinations, scoped secondary feature subscriptions, typed ledger/subscription contracts, and keyboard dismissal.
- Split the web workspace into lazy-loaded screens and forms, added compact server-authoritative financial totals, and corrected activity navigation and private shopping activity.
- Host-configurable delayed guest agreement auto-acceptance with guest manual acceptance, system-approval tags and timestamps, and audited offer, acceptance, replacement, and setting changes. Hosts can also edit guest preferred names and view guest contact details.
- Main website newsletter signup with explicit consent, server-side Loops contact sync, and matching privacy disclosures.
- Added a More tab for secondary stay, account, and help actions, with short descriptions and clearer grouping. Moved less-used links off the bottoms of Home, Ledger, Chores, and Stay.
- Peer-to-peer (P2P) contribution routing across Venmo, Cash App, Zelle, PayPal, and manual bank transfers with deep links, clean payment URI formatting, error-correcting Level-H QR code generation, and copy-to-clipboard fallbacks.
- Comprehensive platform console for operational management: Stays, Users, Feature Flags, Subscriptions (RevenueCat), Marketing, Notifications (Knock), Support, and Documentation explorers.
- Modernized PostHog analytics and telemetry across web, Convex backend, and native iOS:
  - Web: Session Replay with strict privacy and input masking, Core Web Vitals and performance capture, exception autocapture, Sentry session cross-linking, Clerk user identity sync, and Stay group analytics.
  - Backend: Asynchronous, non-blocking Convex internal action (`captureServerEventAction`) reporting server-side mutations to PostHog HTTP capture API with Stay group attribution.
  - Native iOS: `posthog-ios` SPM integration with native session replay, screen tracking, input masking, Clerk user identity sync, and group properties.
- Modernized SwiftUI navigation toolbars with `.principal` titles, primary and secondary trailing action placement, and iOS 16+ semantic toolbar standards.
- Replay QA site ownership verification nonce at `/.well-known/replay-qa-security-nonce` served with raw `text/plain; charset=utf-8` and excluded from authentication proxy middleware.
- Enforced reward redemption balance checks and cumulative period credit caps on the backend, preserved remainder cents across weekly schedule totals, replaced punitive overdue reminder payloads with supportive household copy, and added host-reviewed overdue catch-up recovery plans.
- Targeted crawl policy in robots.ts and dynamic sitemap.xml for public marketing and legal routes (including /about, /brand, /privacy, /terms, and /sms-opt-in), paired with explicit noindex and nofollow robots metadata on dynamic single-use invitation tokens and sign-in/sign-up authentication routes.
- Implemented responsive desktop and compact mobile host workspace views with tabbed household overview, financial summaries, guest rosters, and chore coordination.
- Dedicated responsive About page with mission, values, audience, and vision; shared marketing navigation; homepage story preview and contribution-focused copy.
- Gated native RevenueCat subscription controls for household hosts, including store-provided offerings, purchase, restore, subscription management, Clerk identity coordination, and server-authoritative Convex plan status. Checked-in configurations keep native purchases disabled until App Store, RevenueCat, sandbox, and TestFlight verification is complete.
- Kouchd Brand Building Design System based on Figma specifications: 11-step color scales (forest, lime, warm paper/ink neutrals, sage, sky, coral, and functional tokens), Manrope and Inter typography pairing, brand logo lockups and vector SVG export, geometric brand shapes and asymmetric image masks, reusable web UI elements (BrandButton, BrandSocialButton, BrandTag, BrandSpacer, BrandDivider, BrandCard), and an interactive `/brand` guidelines portal with 16:10 deck viewer, asset repository, social media kits, and 10-slide marketing carousels.
- Twice-daily Knock reminders for unsigned stay agreements, role-aware host and guest payloads with direct terms deep links, and automated reminder cancellation on terms acceptance.
- Native introduction UI regression tests with a Debug-only offline test host; Release entry behavior is unchanged.
- Multi-tier feature flag system with client dev overrides, platform database kill-switches, PostHog Cloud synchronization, and typed code defaults.
- RevenueCat Web billing integration, dynamic paywall gating, customer center self-service, and host entitlement checks.
- Shared and personal shopping items, host/guest check-in records with response and follow-up status, and recurring daily or weekly chores with deduplicated due reminders.
- Figma v2.1 first-use introduction, feature previews, host/guest entry paths, a branded launch screen, and replayable About Kouchd information.

- Xcode Cloud post-clone configuration from production environment variables, with cloud automatic signing and retained local manual-signing defaults.
- Native iOS app work for shared stays, guest invitations, agreements, chores, and outside contribution records.
- Native schedule requests, occupied-night records, reward claims, reminders, and host and authorized admin views.
- Invitation universal-link association for the Wrelik iOS bundle ID.
- A single Wrelik release version with package and iOS synchronization checks.
- Host agreement editing for shared expectations and reward settings; household access details and audited void controls.
- Resumable host and guest guides, additional-stay creation and joining, and confirmed administrator access changes.
- Release classification checks and App Store Connect build-number preparation and upload lanes.
- Optional stay names and a limited invitation preview for native onboarding.

### Changed

- Updated Replay QA site ownership verification nonce at `/.well-known/replay-qa-security-nonce` to `loopqa-sec-9TrCmqrdLQkZh1UIU1Qew_Ql6bEQ36iILYviGiS25V0`.
- Capped and consolidated daily reminders per user to eliminate notification fatigue: enforced a global limit of at most 1 reminder notification per user per calendar day across payment, agreement, chore, and check-in workflows (prioritizing critical payment notices first), consolidated host agreement reminders for multiple unsigned guests into a single daily notification, consolidated multiple chores due on the same day into one notification with chore counts, and reduced agreement-pending cron frequency from twice-daily to once-daily (13:30 UTC).
- Streamlined the web application entry route (`app/page.tsx`) to directly serve the authenticated household workspace and sign-in redirect on `app.kouchd.com`, retiring root host-header sniffing after moving the public marketing website to Astro.
- Redesigned the `/brand` brand guidelines tab into a user-friendly, responsive, scrollable editorial reference with sticky section quick-jump navigation, interactive 11-step color scale ramps with click-to-copy tokens, live typography playground, clearspace diagrams, approved vs. prohibited messaging matrix, and an optional 16:10 presentation deck viewer mode.
- Corrected public landing-page examples to match the current Ledger and host-scheduled check-in behavior; added compact tablet navigation while retaining access to all header links.
- Native cream backgrounds, cards, text, separators, and controls now adapt to dark appearance while retaining Kouchd's forest-and-lime identity; taller introduction pages stay within the safe area and scroll behind an opaque footer.
- Native screen entrances and primary-button feedback use restrained springs and respect Reduce Motion; live document lists retain stable IDs and stale account/stay responses are ignored.
- Native navigation transitions to typed, value-driven routing with a centralized destination registry, preserving individual user scope in administrative views.
- Native navigation bars and toolbar controls modernized across all screens with inline styling, sticky scrolling backgrounds, stay selector menus, and standard confirmation/cancellation actions.
- Prevented native auth sheet re-render loop on launch by eliminating root-level reactive UserDefaults storage churn, and ensured smooth About Kouchd sheet navigation.
- Initial stay loading waits for the account query before choosing the empty-state setup screen; selected-stay and guest-financial loading preserve navigation stacks and hide transient zero balances.

- Native signing and invitation association use the verified existing Kouchd Apple team.
- App Store icon export is opaque and square; native orientation declarations support iPad multitasking.
- iOS payment concepts use outside contribution records; Kouchd does not process payments.
