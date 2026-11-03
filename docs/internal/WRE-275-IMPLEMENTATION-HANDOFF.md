# WRE-275 iPhone redesign and recent feature implementation

Status: implementation and verification in progress.

## Scope

- iPhone redesign based on Figma board “14 iPhone — new direction”, including onboarding, Home, Ledger, Chores, Plus, Settings, and contribution flows.
- Shared service and native iOS capabilities from WRE-267, WRE-268, WRE-269, WRE-270, and WRE-272.
- Web UI remains at the `origin/main` component state. WRE-271 auth/security fixes remain intact from the base commit.

## Source

- Branch: `codex/WRE-275-ios-redesign-recent-features`
- Worktree: `/Volumes/Projects/CodexWorktrees/kouchd-WRE-275-redesign-recent-features`
- Base: `origin/main` at `660bf2b`
- Release target: `0.9.4`; iOS build number is independent and currently set to `3`.

## Feature gates

`BILL_SPLITTING` and `SUBLEASES` keep their existing default-off settings. Guests remain free. Chore turn rotation uses the existing `recurringChores` Plus capability and is host-only. RevenueCat products, package pricing, restore, and disclosures remain authoritative. Kouchd records contributions and bills; it does not process money.

## Verification and release gate

Pending: domain and Convex tests, iOS simulator build and UI checks at 390×844 in Light and Dark, Figma comparison, local asset placement review, and `npm run release:check`.

Do not update public help or announce availability until behavior is verified for release. No deployment, merge, push, tag, or App Store submission is authorized by this work.
