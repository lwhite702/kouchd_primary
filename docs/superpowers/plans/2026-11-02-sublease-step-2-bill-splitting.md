# Bill Splitting on Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Plus hosts split household bills (equal, percentage, or fixed amount, with optional stay-date proration) into guest-scoped `adhoc` ledger obligations in one atomic transaction, while keeping each guest's share private from other guests.

**Architecture:** A pure domain module (`lib/domain/billSplitting.ts`) computes deterministic whole-cent shares using largest-remainder rounding with ties broken by earliest membership `joinedAt`. A server capability guard (`assertPlanCapability` in `convex/lib/planCapacity.ts`) enforces `billSplits` on the host's billing account and triggers the existing `plan_limit` upgrade flow for Free hosts. `convex/bills.ts` owns atomic bill creation, guest-redacted queries, and full-bill voiding, gated behind `FEATURE_FLAGS.BILL_SPLITTING`.

**Tech Stack:** Convex, TypeScript, Vitest with `convex-test`, Next.js web client, SwiftUI iOS client.

**Spec:** `docs/superpowers/specs/2026-10-30-subleases-and-bill-splitting-design.md` (sections 1, 3, 6, 10, 12; rollout step 2)

## Roadmap

| Step | Plan | Status |
| --- | --- | --- |
| 1 | Access code protection | Shipped in PR #132 (0.8.8, WRE-266) |
| 2 | Bill splitting on Plus | This document |
| 3 | Monthly rent | Not written |
| 4 | Sublease type, setup, consent, and lock | Not written |
| 5 | Checklists and deposit record | Not written |
| 6 | Blog post, sublease page, and help articles | Not written |

## What reading the code changed

1. **Direct `voidAdhocCharge` leak on bill obligations:** `obligations.voidAdhocCharge` (`convex/obligations.ts:225`) currently voids any `adhoc` obligation by ID. If a host voided one guest's bill-generated obligation from the ledger directly, the `bill` and `billShares` would stay active while one charge was voided, violating Section 3 ("Voiding a bill voids all its charges... Posted charges never change silently"). `voidAdhocCharge` must check whether the obligation belongs to a `billShare` and refuse with `"This charge comes from a split bill. Void the bill to void its charges."`
2. **Proration math for single-guest and host-excluded bills:** If proration normalized weights only across selected participants, a 1-guest bill with the host excluded (the whole-place preset) would give `overlapDays / overlapDays = 100%` even when the guest was only there for half the billing cycle. Instead, proration scales each participant's pre-proration share by `overlapDays / serviceDays` (`stayDays(serviceStart, serviceEnd)`), so a 15-day overlap on a 30-day bill reduces a 100% share to 50% and a 50% share to 25%. When proration is off, equal and 100%-total percentage splits distribute leftover cents by largest remainder with ties broken by earliest `joinedAt`.
3. **Existing `plan_limit` upgrade flow:** Both web (`lib/planLimitError.ts`) and iOS (`ios/Kouchd/Models.swift:361`) already open the Plus upgrade sheet when a mutation throws `ConvexError` with `code: "plan_limit"`. Extending `CapacityDimension` with `"billSplits" | "subleases"` lets `assertPlanCapability` reuse that exact flow with `limit: 0` on Free and refuse when `usage.plan === null`.

## Global Constraints

- Gated behind `FEATURE_FLAGS.BILL_SPLITTING` (`defaultValue: false` until rollout). Every `bills` mutation calls `requireFeature` and `bills.list` returns `[]` when the flag is off.
- Plus check (`billSplits` capability) runs on the host's billing account on `bills.create`. Guests never need Plus to view their bill shares.
- If `usage.plan === null` (subscription environment not configured), `bills.create` refuses.
- When Plus ends on a stay, already-posted bills and their obligations remain visible; only creating new bills is blocked.
- Guest privacy: `bills.list` for a guest returns the bill metadata and **only that guest's own `billShare`**, never another guest's share or user ID.
- Host equal-split notice: before posting an equal split, the UI tells the host that guests in an equal split can work out each other's amounts.
- Do not claim Kouchd collects, holds, transfers, or processes money.

---

### Task 1: Plan capabilities, feature flag, and server capability guard

**Files:**
- Modify: `lib/domain/subscriptionPlans.ts`
- Modify: `lib/planLimitError.ts`
- Modify: `convex/lib/planCapacity.ts`
- Modify: `lib/flags/config.ts`
- Test: `tests/bill-splitting.test.ts`

**Interfaces:**
- Adds `billSplits: boolean` and `subleases: boolean` to `PlanCapabilities` (`false` on `starter`, `true` on `hostPlus` and `householdPro`).
- Adds `FEATURE_FLAGS.BILL_SPLITTING = "feature_bill_splitting"` (`category: "household"`, `defaultValue: false`).
- Produces `assertPlanCapability(ctx: MutationCtx, ownerUserId: Id<"users">, capability: "billSplits" | "subleases", householdAccountId?: Id<"householdAccounts">): Promise<void>`.

- [ ] **Step 1: Write failing tests for plan capabilities and `assertPlanCapability`**
  - `getPlanCapabilities("starter").billSplits === false`, `getPlanCapabilities("hostPlus").billSplits === true`, `getPlanCapabilities("householdPro").billSplits === true` (and same for `subleases`).
  - Free host calling a capability-guarded action gets `ConvexError` with `code: "plan_limit"`, `dimension: "billSplits"`, `plan: "free"`, `limit: 0`, `atHighestPlan: false`.
  - Unconfigured subscription environment (`SUBSCRIPTION_EXPECTED_ENVIRONMENT` unset with a household account) refuses with `"Host plan limits are being configured"`.
  - Plus host passes.

- [ ] **Step 2: Implement capability fields, flag, and `assertPlanCapability`**
- [ ] **Step 3: Run tests and commit**

---

### Task 2: Pure bill-splitting & proration calculation (`lib/domain/billSplitting.ts`)

**Files:**
- Create: `lib/domain/billSplitting.ts`
- Test: `tests/bill-splitting.test.ts`

**Interfaces:**
- Produces `calculateBillShares(input: BillSplitCalculationInput): CalculatedGuestShare[]`
  - Supports `splitMethod: "equal" | "percentage" | "fixed"`, `includeHost: boolean`, `prorateByStayDates: boolean`, `serviceStart: string`, `serviceEnd: string`, `totalCents: number`, and guest participants `{ guestUserId, joinedAt, stayStartDate, stayEndDate, input? }`.
  - Validates: `totalCents` positive safe integer (`<= 100_000_000`), `serviceStart <= serviceEnd`, at least 1 guest, no duplicate `guestUserId`, guest shares never exceed `totalCents`, percentage inputs in `0..100` totaling `<= 100` (and `=== 100` when `includeHost === false`), fixed inputs positive integers totaling `<= totalCents`.
  - Whole-cent allocation: exact cents via floor + largest remainder, with ties broken by earliest `joinedAt` (then `guestUserId` lexical order for determinism).
  - Proration: computes inclusive overlap days between `[serviceStart, serviceEnd]` and `[stayStartDate, stayEndDate]` and scales each guest's share by `prorationDays / serviceDays`.

- [ ] **Step 1: Write unit tests in `tests/bill-splitting.test.ts`**
  - Equal split: 1000 cents across host + 2 guests -> 333 each for guests (or 334/333/333 with host included, tie-broken by `joinedAt`).
  - Equal split with host excluded: 1000 cents across 3 guests -> 334, 333, 333 ordered by `joinedAt`.
  - Determinism: shuffling input array order produces identical per-guest `amountCents`.
  - Percentage split: 33.33% / 33.33% / 33.34% or 50% / 50% with odd cents.
  - Fixed split: exact cents per guest, rejects sum > `totalCents`.
  - Proration: 30-day service window, guest overlapping 15 days on a whole-place (100%, host excluded) split gets 50% of `totalCents`; guest with 0 overlap days gets 0 cents.
- [ ] **Step 2: Implement `lib/domain/billSplitting.ts`**
- [ ] **Step 3: Run tests and commit**

---

### Task 3: Schema, `convex/bills.ts`, and `voidAdhocCharge` guard

**Files:**
- Modify: `convex/schema.ts` (add `bills` and `billShares` tables)
- Create: `convex/bills.ts` (`create`, `voidBill`, `list`)
- Modify: `convex/obligations.ts` (`voidAdhocCharge` refuses obligations linked to a `billShare`)
- Test: `tests/bill-splitting.test.ts`

**Schema (`convex/schema.ts`):**
- `bills`: `stayId`, `createdBy`, `title`, `category` (`"electricity" | "water" | "gas" | "internet" | "trash" | "other"`), `serviceStart`, `serviceEnd`, `totalCents`, `dueDate`, `splitMethod` (`"equal" | "percentage" | "fixed"`), `includeHost` (`v.boolean()`), `prorateByStayDates` (`v.boolean()`), `createdAt`, `voidedAt?`, `voidedBy?`. Indexes: `by_stay` (`["stayId"]`), `by_stay_created_at` (`["stayId", "createdAt"]`).
- `billShares`: `billId`, `stayId`, `guestUserId`, `input?`, `prorationDays?`, `amountCents`, `obligationId`. Indexes: `by_bill` (`["billId"]`), `by_stay_guest` (`["stayId", "guestUserId"]`), `by_obligation` (`["obligationId"]`).

**Mutations & Queries (`convex/bills.ts`):**
- `bills.create`:
  - Requires `FEATURE_FLAGS.BILL_SPLITTING`, `requireHost(ctx, stayId)`, non-ended stay, and `assertPlanCapability(ctx, stay.hostUserId, "billSplits", stay.householdAccountId)`.
  - Verifies every selected guest is an active guest member of `stayId` and resolves their agreement dates (`getAcceptedGuestTerms` / `getCurrentGuestTerms`).
  - Runs `calculateBillShares`. Rejects if all resulting guest shares are `0` cents.
  - Inserts `bills`, and for each guest share with `amountCents > 0`, inserts an `adhoc` obligation (`title: "${billTitle} (${categoryLabel})"`, `periodStart: serviceStart`, `periodEnd: serviceEnd`, `dueDate`, `baseAmountCents: share.amountCents`) and a `billShares` row in one transaction.
  - Records activity (`kind: "obligation"`, `action: "bill_created"`) and triggers `adhoc-fee-posted` Knock workflow per charged guest.
- `bills.voidBill`:
  - Requires `FEATURE_FLAGS.BILL_SPLITTING` and `requireHost(ctx, bill.stayId)`.
  - Marks `bill.voidedAt` / `bill.voidedBy` and patches every linked `obligationId` with `voidedAt` / `voidedBy` in one transaction, recording activity (`action: "bill_voided"`).
- `bills.list`:
  - Returns `[]` if `FEATURE_FLAGS.BILL_SPLITTING` is disabled.
  - Requires membership in `stayId`.
  - Host receives all bills for the stay with all `shares` (including guest names).
  - Guest receives only bills where they have a `billShare`, with `shares` filtered to **only their own `billShare`** (never another guest's share or user ID).

- [ ] **Step 1: Write failing integration tests in `tests/bill-splitting.test.ts`**
  - Free host blocked with `plan_limit`; Plus host creates bill and obligations appear on each guest's ledger.
  - When Plus expires after posting, existing bills and ledger obligations remain visible to host and guests, while new `bills.create` is refused.
  - Privacy: Guest A querying `bills.list` sees total, service dates, split method, and Guest A's share only; Guest B's share and ID are absent from the response.
  - Direct `obligations.voidAdhocCharge` on a bill's obligation is refused; `bills.voidBill` voids the bill and all its guest obligations at once.
  - Feature flag kill switch: when `FEATURE_FLAGS.BILL_SPLITTING` is disabled, `bills.create` and `bills.voidBill` throw and `bills.list` returns `[]`.
- [ ] **Step 2: Implement schema, `convex/bills.ts`, and `convex/obligations.ts` guard**
- [ ] **Step 3: Run tests and commit**

---

### Task 4: Web bill-splitting UI

**Files:**
- Create: `components/household/bill-splitting-card.tsx`
- Modify: `components/workspace/use-live-stay.ts`
- Modify: `components/workspace/contributions-screen.tsx`
- Modify: `components/workspace/workspace-panels.tsx`
- Modify: `components/workspace/types.ts`

**Behavior:**
- Wrapped in `<FeatureGate flag={FEATURE_FLAGS.BILL_SPLITTING}>`.
- On the **Ledger** screen (`contributions-screen.tsx`), shows a **Shared bills** section:
  - Host sees **Split a bill** button (opens `"splitBill"` panel) and each bill with its total, service window, split method, per-guest shares, and **Void bill** action on active bills.
  - If a Free host submits **Split a bill**, catches `planLimitError` and opens the Plus upgrade flow.
  - Guest sees bills that include them, showing the bill total, service dates, how their share was calculated, and their own share amount.
- In the **Split a bill** modal (`workspace-panels.tsx`):
  - Fields: Title, Category, Service start, Service end, Total ($), Due date, Split method (`Equal`, `Percentage`, `Fixed amount`), `Include host in split` toggle (for Equal/Percentage), `Prorate by guest stay dates` toggle, and per-guest inputs.
  - Live preview of each guest's calculated share before posting.
  - When `splitMethod === "equal"` and more than one guest is selected, displays the privacy notice: `"In an equal split, guests can work out each other's share from the bill total."`

- [ ] **Step 1: Implement `bill-splitting-card.tsx` and wire into workspace state, Ledger screen, and modal panels**
- [ ] **Step 2: Verify with `npm run lint && npm run typecheck`**
- [ ] **Step 3: Commit**

---

### Task 5: iOS bill-splitting UI

**Files:**
- Modify: `ios/Kouchd/Models.swift` (add `feature_bill_splitting` tool/flag check if needed)
- Modify: `ios/Kouchd/MainScreens.swift` (`LedgerScreen` bills section)
- Modify: `ios/Kouchd/HostExtras.swift` (`BillSplitSheet`)

**Behavior:**
- Shown when `store.isFeatureEnabled("feature_bill_splitting")` is true.
- Host can open **Split a bill** from Ledger, enter bill details, see the equal-split notice when applicable, post the bill (routing `plan_limit` errors to `store.planLimit`), and void posted bills.
- Guest sees their own share and calculation details on each bill in Ledger.

- [ ] **Step 1: Implement iOS bill list and `BillSplitSheet`**
- [ ] **Step 2: Build for iOS Simulator and verify `** BUILD SUCCEEDED **`**
- [ ] **Step 3: Commit**

---

### Task 6: Release records and verification

**Files:**
- Modify: `CHANGELOG.md`, `docs/internal/CHANGELOG.md`
- Modify: `help/product/roadmap.mdx` (note bill splitting in progress)
- Modify: `VERSION`, `package.json`, `package-lock.json`, `release/change.json`, `ios/project.yml`, `ios/Kouchd.xcodeproj/project.pbxproj`

- [ ] **Step 1: Update version, changelogs, and roadmap**
- [ ] **Step 2: Run `npm run verify && npm run build && npm run release:check && git diff --check`**
- [ ] **Step 3: Commit**
