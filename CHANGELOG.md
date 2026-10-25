# Changelog

## [Unreleased]

### Changed

- **Version 1.0 Release Candidate Feature Lock (`1.0.0-rc.1`, WRE-234)**: Established the Version 1.0 launch feature lock (`release/feature-lock.json`), created the `v1-feature-lock` agent skill (`.agents/skills/v1-feature-lock/SKILL.md`) and CLI (`scripts/feature-lock.mjs`), and updated `scripts/release-version.mjs` and `scripts/release-gate.mjs` to support `X.Y.Z-rc.N` versions. Once currently open pre-lock merges complete, only patches and bug fixes are permitted on the launch branch while new features are routed to `help/product/roadmap.mdx` and isolated git worktrees.
- **P2P Contribution Router & 4-Phase Confirmation Engine (WRE-231)**: Added responsive P2P routing (Venmo, Cash App, Chime, PayPal `paypal.me`, Zelle clipboard helper, in-person Cash, and Reward Points offsets) with ISO/IEC 18004 Level-H QR generation and a 4-phase confirmation flow across the Next.js web app and native iOS SwiftUI app.

### Fixed

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
