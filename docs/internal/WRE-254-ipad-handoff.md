# iPad layout handoff (WRE-254)

**Issue:** [WRE-254](https://linear.app/wrelik/issue/WRE-254/kouchd-redesign-the-ipad-app-for-the-larger-surface)
**Branch:** `codex/WRE-254-ipad-redesign`
**State:** Local branch. Not pushed, merged, or released.

## What changed

- `ios/Kouchd/AdaptiveShell.swift`: sidebar and tab shell, `ShellNavigator`, `StayTool`, `KouchdCommands`.
- `ios/Kouchd/Design.swift`: `KouchdLayout`, `ResponsiveScroll`, `AdaptiveGrid`, `TwoColumnLayout`, `kouchdFormWidth()`, and `KouchdRouteView`.
- Screens: Home, Ledger, Chores, Stay, Shopping, Check-ins, Rewards, Schedule, Occupied nights, host forms, introduction, and first-stay setup.
- `ios/Kouchd/StayLayoutTestHost.swift`: DEBUG-only. Launch with `--ui-test-stay-layout host|guest|ended|empty`, plus `--ui-test-section`, `--ui-test-dark`, `--ui-test-frame-width`, `--ui-test-accessibility-text`, and `--ui-test-tabs`.

## Changes from the approved plan

- Three columns start at 1000pt, not 1100pt. A 13-inch iPad in landscape has about 1000pt of content width beside the sidebar, so 1100pt would never apply.
- Ledger list and detail start at 700pt, not 1100pt. Narrower windows keep the existing stacked cards rather than opening a pushed detail screen.
- Admin screens stay at reading width; they only gain the sidebar entry.
- The iOS build number stays in the Fastfile's archive step, which sets `CURRENT_PROJECT_VERSION` per build.

## Evidence

Simulator only, with synthetic data.

- `xcodebuild test` passed on iPad Pro 13-inch and iPhone 17 Pro with no failures. UI tests that apply only to the other device skip.
- `npm run release:check`, `mintlify validate`, `mintlify broken-links`, and `git diff --check` passed.
- First-stay setup and the introduction's later steps were not rendered on iPad.

- Rendered on iPad Pro 13-inch (iOS 27): portrait and landscape, host and guest, light and dark, ended and empty stays, accessibility text, and narrow frames.
- Rendered on iPhone 17 Pro: Ledger and More keep the tab layout.

## Not verified

- A real account against a backend. The test host never connects.
- Profile & reminders, which needs a configured Clerk and can't open in the test host.
- Real Split View and Stage Manager resizing. Narrow widths were simulated with a frame and a forced size class.
- Smaller iPads such as the mini, keyboard shortcuts with a hardware keyboard, and VoiceOver order.
- App Store iPad screenshots.

## Separate problem found

`ContributionForm.activeRawHandle` falls back to made-up handles such as `johndoe`, and the form runs a simulated verification and shows "Transaction ID" and "Settled Amount". This redesign doesn't change that.
