# Changelog

## [Unreleased]

### Fixed

- Native tour completion uses local revision state with explicit persistence so Clerk authentication preference writes cannot repeatedly invalidate the root sheet host; the host retains a stable ZStack. Adds the Face ID usage description required by biometric sign-in.

### Added

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
