# Kouchd mockups

Created 2026-10-15 for the live prototype and storyboard pass.

## Files

- `prototype.html` is a self-contained, offline HTML prototype in a 390 × 844 iPhone frame. It keeps navigation in page memory, with real buttons for the introduction sequence, role choice, create-stay setup, join-code sheet, Home/Ledger/Chores/Stay tabs, About, and the Kouchd Plus preview.
- `storyboard.html` is a fixed 1560 × 1260 px canvas. It places the launch-to-create-stay path and the post-setup tabs in phone frames, with a separate Kouchd Plus purchase branch and arrows.

## Source and inference

The launch, introduction, role choice, welcome/setup, create-stay, join-code, About, Home, Ledger, Chores, and Stay language follows the existing Kouchd SwiftUI screens in `ios/Kouchd/Introduction.swift`, `KouchdApp.swift`, and the shared design primitives in `ios/Kouchd/Design.swift`. The contribution boundary is preserved: Kouchd records contributions; it does not move money.

The purchase branch is a design placeholder inferred from `components/billing/paywall-modal.tsx` and the existing RevenueCat feature flags. The native app has no active paywall call site or configured prices in the screens used here, so the mockup intentionally makes no price, trial, or purchase-success claim. “Restore purchases” and customer-center behavior are described only as future configured states.

Both files use inline CSS and JavaScript, system fonts, no network, no storage, no cookies, no external links, and no browser popups. No app source or App Store Connect record was changed.
