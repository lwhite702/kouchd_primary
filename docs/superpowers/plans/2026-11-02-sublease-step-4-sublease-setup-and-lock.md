# Subleases & Bill Splitting — Step 4: Sublease Type, Setup, Landlord Consent, and Subscription Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the sublease stay type (`arrangement: "sublease"`), whole-place (`whole_place`) and private-room (`private_room`) layouts, roommate count/names, landlord consent question with a dismissible warning, Plus capability enforcement, `getSubleaseLockState` & mutation lock guards across all sublease-scoped mutations, access-code sublease end-date redaction & end-of-sublease reminder, lock/renewal notifications & catch-up late-fee-waived logic, and Web + iOS sublease setup & invite disclosures.

**Architecture:**
1. **Schema, feature flag & subscription retry tracking (`lib/flags/config.ts`, `convex/schema.ts`, `convex/subscriptions.ts`, `convex/lib/validation.ts`)**:
   - Add `FEATURE_FLAGS.SUBLEASES` (`feature_subleases`, `defaultValue: false`) to `lib/flags/config.ts`.
   - Extend `stays` in `convex/schema.ts` with:
     - `subleaseLayout: v.optional(v.union(v.literal("whole_place"), v.literal("private_room")))`
     - `roommateCount: v.optional(v.number())`
     - `roommateNames: v.optional(v.array(v.string()))`
     - `landlordConsent: v.optional(v.object({ answer: v.union(v.literal("written_permission"), v.literal("not_required"), v.literal("not_confirmed")), answeredAt: v.number(), warningDismissedAt: v.optional(v.number()) }))`
     - `subleaseBillPreset: v.optional(v.union(v.literal("whole_place"), v.literal("private_room")))`
     - `subleaseLockedAt: v.optional(v.number())` (tracks when a sublease entered a locked state so renewal catch-up can waive late fees for obligations due during the locked window and send one renewal summary).
   - Extend `subscriptionSnapshots` in `convex/schema.ts` with `billingRetryStartedAt: v.optional(v.number())` and update `applyProviderSnapshotEvent` in `convex/subscriptions.ts` so:
     - When `args.status === "billing_retry"`, `billingRetryStartedAt` is preserved from `snapshot.billingRetryStartedAt` if already `"billing_retry"`, or set to `args.occurredAt` on first entry into `"billing_retry"`.
     - When `args.status !== "billing_retry"`, `billingRetryStartedAt` is cleared (`undefined`).
2. **Sublease lock engine, access-code end-date rule & renewal catch-up (`convex/lib/subleaseLock.ts`, `convex/lib/houseInfoAccess.ts`, `convex/subscriptions.ts`)**:
   - Create `convex/lib/subleaseLock.ts` exporting:
     - `SUBLEASE_BILLING_RETRY_GRACE_MS = 7 * 24 * 60 * 60 * 1000` (7 days).
     - `getSubleaseLockState(ctx, stay, nowMs)`:
       - Returns `{ locked: false, billingRetryWarning: false, reason: null }` when `stay.arrangement !== "sublease"`.
       - Resolves the host billing account via `resolveHouseholdOwnerForStay(ctx, stay)` and `expectedEnvironment`.
       - Per Spec Sections 6 & 7:
         - If `expectedEnvironment` is not configured (`plan === null` / unreadable plan) or no snapshot exists or `snapshot.status === "unknown"`, **never lock** (`locked: false, operationalAlert: true`).
         - If `snapshot.status === "grace_period"` and `nowMs < (snapshot.currentPeriodEndsAt ?? 0)`, `locked: false`.
         - If `snapshot.status === "active"` or `"canceled"`: if `snapshot.currentPeriodEndsAt !== undefined && nowMs < snapshot.currentPeriodEndsAt` and `entitlement` is `"plus"` or `"pro"`, `locked: false`; if `nowMs >= snapshot.currentPeriodEndsAt`, `locked: true, reason: "period_ended"`.
         - If `snapshot.status === "expired"` or `"refunded"`, `locked: true, reason: snapshot.status`.
         - If `snapshot.status === "billing_retry"`: compute `retryStartedAt = snapshot.billingRetryStartedAt ?? snapshot.latestProviderEventAt ?? snapshot.updatedAt`; if `nowMs - retryStartedAt > SUBLEASE_BILLING_RETRY_GRACE_MS`, `locked: true, reason: "billing_retry_exceeded"`; otherwise `locked: false, billingRetryWarning: true`.
     - `assertSubleaseUnlocked(ctx, stayId, options?: { allowHostEnd?: boolean; viewerRole?: "host" | "guest" })`:
       - Loads `stay`, checks `getSubleaseLockState(ctx, stay)`.
       - If `locked` and not `options?.allowHostEnd`, throws a clear role-appropriate error:
         - For host: `"Your Plus subscription has ended. This sublease is locked and exports are blocked until you have an active subscription."`
         - For guest (no billing details): `"This sublease is read-only and exports are blocked until the host renews. Your sublease agreement still applies, so keep paying rent as agreed. Kouchd's record being locked doesn't change it."`
     - `reconcileAccountSubleaseLocks(ctx, householdAccountId, nowMs)`:
       - Called from `applyProviderSnapshotEvent` in `convex/subscriptions.ts` whenever a host's subscription snapshot updates:
         - When a sublease transitions into `locked`: sets `subleaseLockedAt: nowMs`, records activity, and queues the host and guest lock notifications (Spec Section 7 exact copy).
         - When a sublease is in the 7-day `billing_retry` warning window: queues a host-only warning notification (guest is never notified during the 7-day retry period).
         - When a locked sublease transitions back to unlocked on renewal: clears `subleaseLockedAt`, waives late fees (`lateFeeWaivedAt: nowMs`) on any unpaid obligations whose `dueDate` fell during `[subleaseLockedAtDate, today]` and ensures all calendar-month rent obligations exist without duplicates, and queues one summary notification to the guest.
   - Update `canViewAccessCodes` and `redactStayForMember` in `convex/lib/houseInfoAccess.ts`:
     - Accept optional `{ arrangement?: "home_stay" | "sublease"; termsEndDate?: string; currentDate?: string }` (or infer from `stay` + `terms`).
     - On a sublease (`stay.arrangement === "sublease"`), if `currentDate` (in `stay.timezone`) is after `termsEndDate` (`currentDate > termsEndDate`), return `false` so `doorCode` and `wifiPassword` are redacted after the sublease agreement end date.
3. **Sublease-scoped mutation guards & sublease creation/consent (`convex/stays.ts`, `convex/invites.ts`, `convex/referral.ts`, `convex/terms.ts`, `convex/bills.ts`, `convex/obligations.ts`, `convex/contributions.ts`, `convex/chores.ts`, `convex/shopping.ts`, `convex/checkIns.ts`, `convex/announcements.ts`, `convex/paymentSchedule.ts`, `convex/occupancy.ts`, `convex/rewards.ts`, `convex/notifications.ts`)**:
   - Enforce `assertSubleaseUnlocked` on every stay-scoped mutation (except `stays.end`, which allows the host to end a locked sublease, and reminds the host to change physical door/Wi-Fi codes when ending a sublease).
   - Pause payment reminders, agreement-pending reminders, auto-accept offers, and late fee assessment while a sublease is locked.
   - Extend `stays.create` in `convex/stays.ts` to accept optional `arrangement`, `subleaseLayout`, `roommateCount`, `roommateNames`, `landlordConsentAnswer`, and `subleaseBillPreset`:
     - When `arrangement === "sublease"`:
       - Require `FEATURE_FLAGS.SUBLEASES` (`requireFeature(ctx, FEATURE_FLAGS.SUBLEASES, "Subleases are currently disabled by platform policy.")`).
       - Require Plus capability (`assertPlanCapability(ctx, user._id, "subleases", householdAccountId)`).
       - Validate `subleaseLayout` (`"whole_place" | "private_room"`), `roommateCount` / `roommateNames` (allowed only on `private_room`), and `assertStayTerms(args.terms, { arrangement: "sublease" })`.
   - Add `stays.recordLandlordConsent` and `stays.dismissLandlordConsentWarning` mutations in `convex/stays.ts`.
   - In `invites.create` (`convex/invites.ts`) and `referral.joinWithCode` (`convex/referral.ts`):
     - On a sublease (`stay.arrangement === "sublease"`), require `stay.landlordConsent` to be recorded before the first invite can be created (`"Answer the landlord consent question before sending a sublease invite"`).
     - Expose `subleaseLock` state in `stays.getBundle`, and expose `arrangement`, `subleaseLayout`, `roommateCount`, `roommateNames`, and lock disclosure requirements in `invites.preview` and `referral.preview`.
4. **Web & iOS sublease setup, lock banner, bill presets & disclosures (`components/`, `ios/Kouchd/`, `help/support/app-support.mdx`, `lib/domain/subscriptionPlans.ts`)**:
   - Update `HostOnboardingWizard` (`components/onboarding/host-onboarding-wizard.tsx`), `GuestOnboardingFlow` (`components/onboarding/guest-onboarding-flow.tsx`), `StayScreen` (`components/workspace/stay-screen.tsx`), `BillSplittingCard` (`components/household/bill-splitting-card.tsx`), and `useLiveStay` (`components/workspace/use-live-stay.ts`).
   - Update iOS `CreateStayScreen` (`ios/Kouchd/StayScreens.swift`), `AgreementScreen` (`ios/Kouchd/StayScreens.swift`), and `BillSplitSheet` (`ios/Kouchd/HostExtras.swift`).
   - Update `lib/domain/subscriptionPlans.ts` capability comment and `help/support/app-support.mdx` to explain routine support export blocks on locked subleases versus formal legal data requests.
5. **Release records & verification (`CHANGELOG.md`, `docs/internal/CHANGELOG.md`, `help/product/roadmap.mdx`, `release/change.json`)**:
   - Run `npm test`, `npm run release:check`, `git diff --check`, and iOS Simulator `xcodebuild`.

**Tech Stack:** TypeScript, Next.js 16, React 19, Convex (`convex-test`, Vitest), SwiftUI (iOS), Mintlify MDX.

**Linear Issue:** `WRE-272` (`https://linear.app/wrelik/issue/WRE-272/kouchd-add-sublease-arrangement-setup-landlord-consent-and`)
**Design Spec:** `docs/superpowers/specs/2026-10-30-subleases-and-bill-splitting-design.md` (Sections 1, 3, 4, 6, 7, 8, 10, 12)

---

## Roadmap Status

| Step | Scope | Status |
| --- | --- | --- |
| **Step 1** | Access code protection (`WRE-266`, PR #132) | Completed |
| **Step 2** | Bill splitting on Plus (`WRE-268`, PR #137) | Completed |
| **Step 3** | Monthly rent (`WRE-270`, PR #141) | Completed |
| **Step 4 (this plan)** | Sublease type, setup, consent, and lock (`WRE-272`) | In progress |
| **Step 5** | Checklists and deposit record | Planned after Step 4 |
| **Step 6** | Blog post, sublease page, and help articles | Planned after Step 5 |

---

## Complete List of Sublease-Scoped Mutations Guarded by `assertSubleaseUnlocked`

Per Spec Section 7 (*"Every sublease-scoped mutation calls the lock guard. The implementation plan must list these mutations and test each one"*):

| Module | Mutation(s) | Lock Behavior |
| --- | --- | --- |
| `convex/stays.ts` | `updateAgreementAutoAccept`, `updateName`, `updatePaymentOptions`, `updateGuestPreferredName`, `updateHouseInfo`, `recordLandlordConsent`, `dismissLandlordConsentWarning` | Blocked while locked |
| `convex/stays.ts` | `end` | **Allowed for host** while locked (`allowHostEnd: true`);Guest blocked |
| `convex/terms.ts` | `acceptCurrent`, `updateCurrent`, `updateGuest`, `autoAcceptOffer` | Blocked / skipped while locked |
| `convex/invites.ts` | `create`, `accept` | Blocked while locked |
| `convex/referral.ts` | `joinWithCode`, `regenerateCode` | Blocked while locked |
| `convex/contributions.ts` | `create`, `confirm`, `dispute`, `voidContribution` | Blocked while locked |
| `convex/obligations.ts` | `createAdhocCharge`, `voidAdhocCharge`, `waiveLateFee`, `requestOverduePlan`, `reviewOverduePlan` | Blocked while locked |
| `convex/bills.ts` | `create`, `voidBill` | Blocked while locked |
| `convex/paymentSchedule.ts` | `requestChange`, `reviewRequest` | Blocked while locked |
| `convex/occupancy.ts` | `recordOvernight`, `voidOvernight` | Blocked while locked |
| `convex/chores.ts` | `create`, `toggle`, `voidChore` | Blocked while locked |
| `convex/shopping.ts` | `create`, `update`, `toggle`, `remove` | Blocked while locked |
| `convex/checkIns.ts` | `create`, `respond`, `setStatus` | Blocked while locked |
| `convex/announcements.ts` | `create` | Blocked while locked |
| `convex/rewards.ts` | `createRule`, `toggleRule`, `submitClaim`, `confirmClaim`, `disputeClaim`, `voidClaim`, `redeem` | Blocked while locked |

---

## Task 1: Schema, Feature Flag, Sublease Lock Helper & Access-Code End-Date Rule

**Files:**
- Modify: `lib/flags/config.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/lib/houseInfoAccess.ts`
- Modify: `convex/lib/validation.ts`
- Create: `convex/lib/subleaseLock.ts`
- Modify: `convex/subscriptions.ts`
- Modify: `tests/house-info-access.test.ts`
- Create: `tests/sublease-lock.test.ts`

- [ ] **Step 1: Add `FEATURE_FLAGS.SUBLEASES` in `lib/flags/config.ts` and schema fields in `convex/schema.ts`**
- [ ] **Step 2: Update `canViewAccessCodes` & `redactStayForMember` in `convex/lib/houseInfoAccess.ts` for sublease end dates**
- [ ] **Step 3: Implement `getSubleaseLockState`, `assertSubleaseUnlocked`, and `reconcileAccountSubleaseLocks` in `convex/lib/subleaseLock.ts`, and wire `billingRetryStartedAt` + lock reconciliation in `convex/subscriptions.ts`**
- [ ] **Step 4: Write unit tests in `tests/house-info-access.test.ts` and `tests/sublease-lock.test.ts`**

---

## Task 2: Sublease Setup Mutations, Landlord Consent & Sublease Lock Enforcement Across All Stay Mutations

**Files:**
- Modify: `convex/stays.ts`
- Modify: `convex/terms.ts`
- Modify: `convex/invites.ts`
- Modify: `convex/referral.ts`
- Modify: `convex/contributions.ts`
- Modify: `convex/obligations.ts`
- Modify: `convex/bills.ts`
- Modify: `convex/paymentSchedule.ts`
- Modify: `convex/occupancy.ts`
- Modify: `convex/chores.ts`
- Modify: `convex/shopping.ts`
- Modify: `convex/checkIns.ts`
- Modify: `convex/announcements.ts`
- Modify: `convex/rewards.ts`
- Modify: `convex/notifications.ts`
- Modify: `convex/lib/ledger.ts`
- Modify: `tests/sublease-lock.test.ts`

- [ ] **Step 1: Extend `stays.create`, `stays.getBundle`, `stays.listMine`, `stays.end`, and add `stays.recordLandlordConsent` / `stays.dismissLandlordConsentWarning` in `convex/stays.ts`**
- [ ] **Step 2: Enforce landlord consent before first invite on a sublease and add `assertSubleaseUnlocked` to all 14 stay-scoped Convex modules**
- [ ] **Step 3: Pause late fees and reminders on locked subleases in `convex/lib/ledger.ts` and `convex/notifications.ts`**
- [ ] **Step 4: Expand `tests/sublease-lock.test.ts` with `convex-test` integration tests for sublease creation, Plus check, landlord consent, every locked mutation, host `stays.end` while locked, 7-day `billing_retry` boundary, `unknown` / unreadable plan non-lock, and renewal catch-up with waived late fees**

---

## Task 3: Web Sublease Setup, Landlord Consent, Bill Presets, Lock Banner & Invite Disclosure

**Files:**
- Modify: `components/onboarding/host-onboarding-wizard.tsx`
- Modify: `components/onboarding/guest-onboarding-flow.tsx`
- Modify: `components/household/bill-splitting-card.tsx`
- Modify: `components/workspace/stay-screen.tsx`
- Modify: `components/workspace/home-screen.tsx`
- Modify: `components/workspace/use-live-stay.ts`
- Modify: `components/workspace/types.ts`

- [ ] **Step 1: Add arrangement chooser ("Someone staying with me" vs "Subletting my place"), layout/roommates, monthly rent, landlord consent with dismissible warning, bill preset, and lock disclosure to `HostOnboardingWizard`**
- [ ] **Step 2: Add sublease lock disclosure and record-keeping copy to `GuestOnboardingFlow`**
- [ ] **Step 3: Add sublease lock banner, landlord consent warning card, end-sublease door/Wi-Fi code reminder, and sublease bill split presets (`whole_place`: 100% guest with host excluded; `private_room`: `1 / (roommateCount + 1)` editable) to `StayScreen`, `HomeScreen`, and `BillSplittingCard`**

---

## Task 4: iOS Sublease Setup, Lock Banner, Disclosures, Export Copy & Release Verification

**Files:**
- Modify: `ios/Kouchd/StayScreens.swift`
- Modify: `ios/Kouchd/HostExtras.swift`
- Modify: `ios/Kouchd/MainScreens.swift`
- Modify: `lib/domain/subscriptionPlans.ts`
- Modify: `help/support/app-support.mdx`
- Modify: `help/product/roadmap.mdx`
- Modify: `CHANGELOG.md`
- Modify: `docs/internal/CHANGELOG.md`
- Modify: `release/change.json`

- [ ] **Step 1: Add sublease arrangement, layout/roommates, landlord consent, lock disclosure, and lock banner to iOS screens**
- [ ] **Step 2: Update `lib/domain/subscriptionPlans.ts` and `help/support/app-support.mdx` export policy copy, plus changelogs and roadmap**
- [ ] **Step 3: Run full verification (`npm test`, `npm run release:check`, `git diff --check`, and iOS Simulator `xcodebuild`)**
