# Web launch audit, November 2026

**Branch:** `claude/loving-ptolemy-f7sjmy` (from `main` at `8fdc321`, 0.9.5)
**Version prepared:** 0.9.6 (not released)
**Linear:** no issue was created from this session; file one before promotion.

## Verdict

Not ready to call "100% production ready" yet. This branch fixes every defect
the audit found in source, and the full host and guest journeys now pass end to
end against the real backend logic. Launch still depends on the items under
"Still open", most of which need production access or a product decision.

## How it was tested

The real Next.js UI ran against the real Convex functions executing in memory
(`convex-test`) through a local bridge. Clerk was replaced by a local stand-in,
so Clerk's own sign-in, sign-up, verification, Apple sign-in and account screens
were **not** exercised. Everything else (users, stays, terms, obligations,
invites, plan limits, notifications data) ran through the production function
code.

Journeys exercised, desktop and phone:

1. Host signs up, sees Get Started, completes all five setup steps, creates a
   stay; step validation blocks an empty amount.
2. Host creates a private invite link; a new guest opens it, registers, joins,
   and walks through the four-step agreement and accepts.
3. Guest logs a payment and a groceries contribution; host confirms one, adds a
   one-off charge, three chores, a house guide, shopping items, an announcement
   and a check-in; guest sees the results and completes a chore.
4. Free plan: a second guest is refused with "This stay is full right now", and
   the host's usage records the blocked join.
5. Host ends the stay; it moves to Past stays and the host can start a new one.
6. Plus household with two guests, back-dated history, overdue and pending
   records (used for the screenshot set).
7. Every workspace screen at 390 px wide: no horizontal overflow.
8. Dark appearance on every workspace screen (failed; see fixes).

## Defects found and fixed

| Severity | Defect | Fix |
| --- | --- | --- |
| Blocker | Every sublease created with defaults failed on "Create stay" (rewards default on; backend refuses rewards on monthly subleases) | Wizard drops rewards and early discounts for monthly; covered by backend rule |
| Blocker | "Subletting my place" offered while `feature_subleases` is off by default; failed only after five steps | Option hidden unless the flag is on |
| High | Newly joined guests saw "This invite was already accepted. Ask your host for a fresh invitation." | Joined state kept above the preview; guest is taken to the stay |
| High | Hosts could not post announcements on the web (control only in guest layout) | Announcements card on host overview |
| High | Hosts could not reach Shopping list or House check-ins on phones | Phone menu lists both, plus House guide |
| High | About 100 CSS declarations silently dropped since 0.9.0 (comma RGB tokens in slash syntax); sidebar stay switcher unreadable | Space-separated tokens, regression test |
| High | Dark appearance followed the device and left many surfaces unreadable | Gated behind `data-theme="dark"` until it passes QA |
| Medium | Dialog help popovers opened on focus and covered the first field | Open on click or Enter only |
| Medium | Reward activities unticked in setup were still created | `rewardTaskIds` passed and honored |
| Medium | No per-step validation in setup; errors only on the last step | Per-step validation |
| Medium | Sidebar clicks ignored while the guided tour is showing | Navigation pauses the tour |
| Medium | `referral.preview` exposed host, roommates and house terms to signed-out callers | Requires a signed-in account |
| Low | Ledger rows started at "Period 2" when a one-off charge existed; raw type keys ("groceries"); raw stay status ("pending"); UTC invite expiry; "obligations" jargon in activity; orphaned help icons; duplicate artwork; "Guests" nav opening "Stay details" | Copy and label fixes |

## Checks run

- `npm run lint`: 0 errors, 5 existing `<img>` warnings.
- `npm run typecheck`: clean.
- `npm test`: 57 files, 370 tests passed (baseline 55 files, 363 tests).
- `next build --webpack`: passed on the final source.
- `node scripts/release-version.mjs check`: 0.9.6 synchronized; `node scripts/release-gate.mjs`: release artifacts checked.

These are source and local-runtime evidence only. They do not prove production
configuration, provider delivery, or behavior for real accounts.

## Still open (needs a decision or production access)

1. **Clerk flows** (email sign-up and verification, sign-in, Apple sign-in,
   account deletion, `/sso-callback`) were not run. Verify on a preview
   deployment with the production Clerk instance.
2. **Schedule-change late fee.** Approving a guest's daily/weekly schedule
   request replaces the host's own late fee with a fixed $5 daily or $25 weekly
   (`convex/paymentSchedule.ts`). The UI explains it, but it overrides a term
   the host set. Product decision needed.
3. **Dark appearance** needs a full pass (many components use fixed light
   colors) before `data-theme="dark"` is applied automatically again. The
   public roadmap already lists it as in development.
4. **Referral codes** use `Math.random` with 32^6 combinations and there is no
   rate limit on code lookups or joins. Consider a crypto source and limits.
5. **Internal doc drift.** `LAUNCH_READINESS.md` "Approved decisions" says Plus
   allows three guests; code, paywall and the public FAQ say five.
6. **Payments and subscriptions** (RevenueCat web checkout, webhooks, Plus
   trial, entitlement expiry) were not exercised; Plus was seeded directly.
7. **Notifications** (Knock, email, SMS) were not exercised; providers were
   unconfigured in the local run.
8. **Help center.** User guides and the public changelog are unchanged because
   nothing here is released. After release, update host getting-started (step
   validation, monthly sublease rules), announcements, and phone navigation.

## Screenshots

`docs/screenshots/launch-2026-11/` holds 56 captures (desktop 2x, phone 3x) of
a synthetic household, with an index and usage notes.
