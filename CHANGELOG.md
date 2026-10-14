# Changelog

## [Unreleased]

### Fixed

- Native tour completion uses local revision state with explicit persistence so Clerk authentication preference writes cannot repeatedly invalidate the root sheet host; the host retains a stable ZStack. Adds the Face ID usage description required by biometric sign-in.

### Added

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

- Corrected public landing-page examples to match the current Ledger and host-scheduled check-in behavior; added compact tablet navigation while retaining access to all header links.
- Native screen entrances and primary-button feedback use restrained springs and respect Reduce Motion; live document lists retain stable IDs and stale account/stay responses are ignored.
- Native navigation transitions to typed, value-driven routing with a centralized destination registry, preserving individual user scope in administrative views.
- Native navigation bars and toolbar controls modernized across all screens with inline styling, sticky scrolling backgrounds, stay selector menus, and standard confirmation/cancellation actions.
- Prevented native auth sheet re-render loop on launch by eliminating root-level reactive UserDefaults storage churn, and ensured smooth About Kouchd sheet navigation.
- Initial stay loading waits for the account query before choosing the empty-state setup screen; selected-stay and guest-financial loading preserve navigation stacks and hide transient zero balances.

- Native signing and invitation association use the verified existing Kouchd Apple team.
- App Store icon export is opaque and square; native orientation declarations support iPad multitasking.
- iOS payment concepts use outside contribution records; Kouchd does not process payments.
