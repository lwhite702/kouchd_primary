# Kouchd release readiness — 2026-10-26

## Completed

- Smoothed the native launch handoff by matching the SwiftUI brand splash to the launch storyboard and removing the second internal logo animation.
- Removed the card entrance animation that briefly hid card and button text when appearance changed.
- Kept screenshot-demo fixtures independent from production service startup so simulator verification is deterministic.
- Corrected the production email-code sign-in flow: Kouchd now sends the code before asking the user to enter it, then enables verification.
- Verified production Clerk sign-in end to end with both the host and guest test accounts; each account reached its authenticated workspace.
- Confirmed the shipping sign-in copy contains no test email addresses or verification codes.
- Measured the Release cold launch frame by frame: native launch screen at 0.2 seconds, SwiftUI handoff at 1.25 seconds, and onboarding at 2.26 seconds.
- Verified the in-app Dark mode switch:
  - forced dark applies immediately;
  - forced dark overrides a light system appearance;
  - the preference survives restart;
  - switch off follows light and dark system appearance;
  - returning to light no longer hides card or button text.
- Replaced the rejected cream-paper treatment with a pale eucalyptus canvas, moved native headings to rounded system typography, and retained the RevenueCat paywall as a readable contained light surface.
- Fixed the Home crash race by rendering stay rows from a stable array snapshot instead of indexing the live async collection.
- Rechecked the current Debug build on iPhone 18 Pro Max in settled light and dark appearances. The design critic now passes at 19/20 in round 5 with no automated bad findings, and the regression run produced no new crash or fatal event.
- Full release checks passed: version sync, lint with warnings only, typecheck, 17 test files / 77 tests, production web build, and release artifact checks.
- Created signed distribution archive `Kouchd-1.0.0-6-release.xcarchive` after the sign-in correction and final copy cleanup.
  - Bundle: `com.wrelikbrands.kouchd`
  - Version: `1.0.0`
  - Build: `6`
  - Signing: Apple Distribution
  - `get-task-allow`: `false`
- Source-only clean-build scan passed with no errors.
- App Store Connect remains untouched and unsubmitted.

## Release blockers

1. **Appto archive scanner:** the mandatory archive scan reports four errors that are embedded in statically linked third-party packages: RevenueCat Factory symbols, Convex/Rust build paths and localhost, and library character tables. The app source itself passes the clean-build scan. Upload remains blocked until Appto supports these vendor strings or provides an approved handling path.
2. **Version mismatch:** App Store Connect has editable version `1.0` with build 5 attached, while the new archive is `1.0.0` build 6. The supported `asc.py` commands do not expose an editable-version rename action.

## Current App Store Connect state

- App: `Chore Tracker - Kouchd` (`6818980215`)
- Version: `1.0`
- State: `PREPARE_FOR_SUBMISSION`
- Attached build: `5`
- Review submission: `READY_FOR_REVIEW`, not submitted
