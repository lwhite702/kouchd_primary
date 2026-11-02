# Subleases & Bill Splitting — Step 3: Monthly Rent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `"monthly"` cadence support to Kouchd agreements and the obligation ledger: calendar-month obligation periods, `paymentDayOfMonth` (`1..28`) due-date calculation with partial first-month due-date clamping, partial first/last month proration across 28/29/30/31-day calendar months, server validation that `"monthly"` requires `stay.arrangement === "sublease"`, and guards preventing monthly agreements from being converted to daily/weekly schedules.

**Architecture:**
1. **Pure domain obligation & date rules (`lib/domain/dates.ts`, `lib/domain/pricing.ts`, `lib/domain/obligations.ts`)**:
   - Extend `Cadence` to `"daily" | "weekly" | "monthly"` and `ObligationTerms` with `paymentDayOfMonth?: number`.
   - Add calendar-month helpers in `lib/domain/dates.ts` (`daysInCalendarMonth`, `calendarMonthEnd`, `calendarMonthDueDate`) using UTC calendar dates (`YYYY-MM-DD`).
   - Update `buildObligationPeriods` in `lib/domain/obligations.ts` so `cadence === "monthly"` splits `[startDate, endDate]` into calendar-month periods (`YYYY-MM-01` through the last day of that month, clamped to `startDate` and `endDate`).
   - Full calendar month (`periodStart` is day `01` and `periodEnd` is the last day of that month): `baseAmountCents = terms.rateCents`.
   - Partial first or last calendar month: `baseAmountCents = Math.round((terms.rateCents * daysCovered) / daysInThatMonth)` in whole cents, where `daysCovered = stayDays(periodStart, periodEnd)` and `daysInThatMonth` is the exact calendar month length (`28`, `29` in leap years, `30`, or `31`).
   - Due date for each monthly period: `YYYY-MM-${pad2(paymentDayOfMonth)}`, clamped so if that date is earlier than `periodStart` (for example, a partial first month starting after `paymentDayOfMonth`), `dueDate = periodStart`.
2. **Convex schema, validation & server guards (`convex/schema.ts`, `convex/lib/validation.ts`, `convex/lib/stayTerms.ts`, `convex/terms.ts`, `convex/stays.ts`, `convex/invites.ts`, `convex/paymentSchedule.ts`, `convex/occupancy.ts`)**:
   - Add `arrangement: v.optional(v.union(v.literal("home_stay"), v.literal("sublease")))` to `stays` and `cadence: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))` plus `paymentDayOfMonth: v.optional(v.number())` to `terms` in `convex/schema.ts`.
   - Update `assertStayTerms` in `convex/lib/validation.ts` to accept an optional `{ arrangement?: "home_stay" | "sublease" }` context:
     - When `cadence === "monthly"`: require `arrangement === "sublease"`, require integer `paymentDayOfMonth` in `1..28`, reject `paymentDayOfWeek !== undefined`, require `(billingBasis ?? "continuous") === "continuous"`, reject `earlyDiscountEnabled`, and reject `rewards?.enabled`.
     - When `cadence !== "monthly"`: reject `paymentDayOfMonth !== undefined`.
   - Update `ensureGuestTerms` in `convex/lib/stayTerms.ts` to copy `paymentDayOfMonth` when creating guest terms from household defaults, and update `acceptGuestAgreement` so mid-stay agreement revisions on monthly terms preserve `dueDate: obligation.dueDate <= periodEnd ? obligation.dueDate : periodEnd` when truncating an overlapping period.
   - Update `convex/terms.ts` (`acceptCurrent`, `updateCurrent`, `updateGuest`), `convex/paymentSchedule.ts` (`requestChange`, `reviewRequest`), `convex/invites.ts` (`preview`), and `convex/occupancy.ts` (`recordNight`, `summary`) so `"monthly"` is validated and cannot be converted into daily/weekly schedules via `initialCadence` or `paymentSchedule`.
3. **Web & iOS cadence display compatibility (`components/`, `ios/Kouchd/`)**:
   - Update cadence labels and schedule-switcher components across Web (`components/workspace/stay-screen.tsx`, `components/household/payment-schedule-card.tsx`, `components/household/guest-agreement-form.tsx`, `components/onboarding/guest-onboarding-flow.tsx`, `components/referral/join-household.tsx`) and iOS (`ios/Kouchd/StayScreens.swift`, `ios/Kouchd/MoreScreens.swift`, `ios/Kouchd/HostExtras.swift`) so `"monthly"` terms render `"month"` / `"Monthly"` and due day of month cleanly, and hide daily/weekly schedule switchers when a stay is on a monthly agreement.
4. **Release records & verification (`CHANGELOG.md`, `docs/internal/CHANGELOG.md`, `release/change.json`)**:
   - Record `WRE-270` in `CHANGELOG.md`, `docs/internal/CHANGELOG.md`, and `release/change.json`, and run `npm run release:check`, `git diff --check`, and iOS Simulator `xcodebuild`.

**Tech Stack:** TypeScript, Next.js 16, React 19, Convex (`convex-test`, Vitest), SwiftUI (iOS).

**Linear Issue:** `WRE-270` (`https://linear.app/wrelik/issue/WRE-270/kouchd-add-monthly-rent-cadence-calendar-month-proration-and-ledger`)
**Design Spec:** `docs/superpowers/specs/2026-10-30-subleases-and-bill-splitting-design.md` (Sections 1, 2, 10, 12)

---

## Roadmap Status

| Step | Scope | Status |
| --- | --- | --- |
| **Step 1** | Access code protection (`WRE-266`, PR #132) | Completed |
| **Step 2** | Bill splitting on Plus (`WRE-268`, PR #137) | Completed |
| **Step 3 (this plan)** | Monthly rent (`WRE-270`) | In progress |
| **Step 4** | Sublease type, setup, consent, and lock | Planned after Step 3 |
| **Step 5** | Checklists and deposit record | Planned after Step 4 |
| **Step 6** | Blog post, sublease page, and help articles | Planned after Step 5 |

---

## Task 1: Monthly Date Helpers, Proration & Obligation Period Generation

**Files:**
- Modify: `lib/domain/dates.ts`
- Modify: `lib/domain/pricing.ts`
- Modify: `lib/domain/obligations.ts`
- Create: `tests/monthly-rent.test.ts`

- [ ] **Step 1: Add calendar-month helpers in `lib/domain/dates.ts`**
  - Add `daysInCalendarMonth(year: number, monthOneBased: number): number` using `new Date(Date.UTC(year, monthOneBased, 0)).getUTCDate()`.
  - Add `calendarMonthEnd(dateStr: string): string` returning the `YYYY-MM-DD` of the last day of `dateStr`'s UTC calendar month.
  - Add `calendarMonthDueDate(periodStart: string, paymentDayOfMonth = 1): string` returning `YYYY-MM-${String(clampedDay).padStart(2, "0")}` for `periodStart`'s calendar month, or `periodStart` when that date is earlier than `periodStart` (`dueCandidate < periodStart ? periodStart : dueCandidate`).

- [ ] **Step 2: Extend `Cadence` and `ObligationTerms` (`lib/domain/pricing.ts`, `lib/domain/obligations.ts`)**
  - In `lib/domain/pricing.ts`:
    - Update `export type Cadence = "daily" | "weekly" | "monthly";`.
    - Update `calculateStayChargeCents` so `cadence === "monthly"` computes the sum of calendar-month periods across `[startDate, endDate]` (or when called with only `days`, falls back to `Math.round((days * rateCents) / 30)`).
  - In `lib/domain/obligations.ts`:
    - Add `paymentDayOfMonth?: number;` to `ObligationTerms`.
    - In `buildObligationPeriods(terms)`:
      - When `terms.cadence === "monthly"`:
        - Walk calendar months from `cursor = terms.startDate` while `cursor <= terms.endDate`:
          - `monthEnd = calendarMonthEnd(cursor)`
          - `periodEnd = monthEnd < terms.endDate ? monthEnd : terms.endDate`
          - Parse `year` and `month` from `cursor`, compute `daysInMonth = daysInCalendarMonth(year, month)` and `daysCovered = stayDays(cursor, periodEnd)`.
          - `isFullMonth = daysCovered === daysInMonth`
          - `baseAmountCents = isFullMonth ? terms.rateCents : Math.round((terms.rateCents * daysCovered) / daysInMonth)`
          - `dueDate = calendarMonthDueDate(cursor, terms.paymentDayOfMonth ?? 1)` (if `dueDate > periodEnd`, clamp to `periodEnd`? Wait: check spec! Spec section 2: *"Each period covers one calendar month (`YYYY-MM-01` through the last day of that month, clamped to the stay's `startDate` and `endDate`). Its due date is `paymentDayOfMonth` of that month, or `startDate` if that day has already passed in a partial first month."* What if a partial last month ends BEFORE `paymentDayOfMonth`, e.g., ends on `2026-12-10` when `paymentDayOfMonth` is `15`? Clamping `dueDate` to `periodEnd` when `dueDate > periodEnd` ensures the obligation is due by the end of the stay period rather than after the stay ends; if `paymentDayOfMonth` is `1`, `2026-12-01 <= 2026-12-10` so `dueDate` is `2026-12-01`!).
          - Advance `cursor = addUtcDays(periodEnd, 1)`.

- [ ] **Step 3: Write unit tests in `tests/monthly-rent.test.ts`**
  - Test full calendar months (e.g., `2026-10-01` to `2026-12-31` at `$1,500/mo` with `paymentDayOfMonth: 1` and `paymentDayOfMonth: 15`).
  - Test partial first month where `startDate` is after `paymentDayOfMonth` (e.g., `startDate: "2026-10-15"`, `paymentDayOfMonth: 1` -> Oct period `2026-10-15`..`2026-10-31`, `17` days in a `31`-day month, `Math.round((150000 * 17) / 31) = 82258`, `dueDate: "2026-10-15"`).
  - Test partial first month where `startDate` is before `paymentDayOfMonth` (e.g., `startDate: "2026-10-05"`, `paymentDayOfMonth: 15` -> `dueDate: "2026-10-15"`).
  - Test partial last month across `28`-day (`2027-02`), `29`-day leap year (`2028-02`), `30`-day (`2026-11`), and `31`-day (`2026-12`) months.
  - Test `calculateObligationLedger` with monthly obligations: FIFO credit allocation across multiple months, partial payment leaving balance, and late fee calculation after `dueDate + graceDays`.

---

## Task 2: Convex Schema, Validation & Server Safeguards

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/lib/validation.ts`
- Modify: `convex/lib/stayTerms.ts`
- Modify: `convex/terms.ts`
- Modify: `convex/stays.ts`
- Modify: `convex/invites.ts`
- Modify: `convex/paymentSchedule.ts`
- Modify: `convex/occupancy.ts`
- Modify: `tests/monthly-rent.test.ts`

- [ ] **Step 1: Update `convex/schema.ts`**
  - Add `arrangement: v.optional(v.union(v.literal("home_stay"), v.literal("sublease")))` to `stays`.
  - Update `terms.cadence` to `v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))` and add `paymentDayOfMonth: v.optional(v.number())` right after `paymentDayOfWeek`.

- [ ] **Step 2: Update `assertStayTerms` in `convex/lib/validation.ts`**
  - Update `TermsValidationInput` so `cadence: "daily" | "weekly" | "monthly"`, add `paymentDayOfMonth?: number`, and add an optional second parameter `options?: { arrangement?: "home_stay" | "sublease" }`.
  - Enforce:
    - If `terms.cadence === "monthly"`:
      - If `options?.arrangement !== "sublease"`, throw `new Error("Monthly rent is only available on sublease stays")`.
      - If `terms.paymentDayOfMonth === undefined || !Number.isInteger(terms.paymentDayOfMonth) || terms.paymentDayOfMonth < 1 || terms.paymentDayOfMonth > 28`, throw `new Error("Monthly payment day must be a whole number from 1 to 28")`.
      - If `terms.paymentDayOfWeek !== undefined`, throw `new Error("Monthly contributions do not use a weekly payment day")`.
      - If `(terms.billingBasis ?? "continuous") !== "continuous"`, throw `new Error("Monthly subleases must bill every day in the stay")`.
      - If `terms.earlyDiscountEnabled || terms.earlyDiscountPercentage > 0 || terms.earlyDiscountDays > 0`, throw `new Error("Early contribution discounts are not available on monthly subleases")`.
      - If `terms.rewards?.enabled`, throw `new Error("Contribution rewards are not available on monthly subleases")`.
    - If `terms.cadence !== "monthly"` and `terms.paymentDayOfMonth !== undefined`:
      - Throw `new Error("Only monthly contributions use a monthly payment day")`.

- [ ] **Step 3: Update `convex/lib/stayTerms.ts`, `convex/terms.ts`, `convex/stays.ts`, `convex/invites.ts`, `convex/paymentSchedule.ts`, `convex/occupancy.ts`**
  - `convex/lib/stayTerms.ts`:
    - In `ensureGuestTerms`, copy `...(defaults.paymentDayOfMonth !== undefined ? { paymentDayOfMonth: defaults.paymentDayOfMonth } : {})`.
    - In `acceptGuestAgreement`, when replacing an overlapping obligation (`obligation.periodStart < effectiveBoundary && obligation.periodEnd >= effectiveBoundary`), set `dueDate: obligation.dueDate <= periodEnd ? obligation.dueDate : periodEnd` so a monthly obligation whose due date was the 1st of the month keeps its original due date instead of shifting to `periodEnd`.
  - `convex/terms.ts`:
    - Add `v.literal("monthly")` and `paymentDayOfMonth: v.optional(v.number())` to `termsInput`.
    - In `acceptCurrent`:
      - Load `stay = await ctx.db.get(stayId)`.
      - If `terms.cadence === "monthly"`:
        - Reject if `initialCadence !== undefined && initialCadence !== ("monthly" as string)` or `initialPaymentDayOfWeek !== undefined` (`throw new Error("Monthly sublease agreements cannot be switched to daily or weekly schedules")`).
        - Keep `terms` as-is (do not run the daily/weekly `initialCadence` conversion branch).
    - In `updateCurrent` and `updateGuest`:
      - Pass `{ arrangement: stay.arrangement }` to `assertStayTerms(terms, { arrangement: stay.arrangement })`.
      - Propagate `paymentDayOfMonth` appropriately when updating household defaults (`updateCurrent`) or guest terms (`updateGuest`).
  - `convex/stays.ts`:
    - Update `termsValidator` to include `v.literal("monthly")` and `paymentDayOfMonth: v.optional(v.number())`.
    - Pass `{ arrangement: undefined }` (or stay arrangement) to `assertStayTerms(args.terms)` so `stays.create` rejects `"monthly"` until Step 4 adds sublease creation with `arrangement: "sublease"`.
  - `convex/paymentSchedule.ts`:
    - In `requestChange`: if `terms.cadence === "monthly"`, throw `new Error("Monthly agreements do not support daily or weekly schedule changes")`.
    - In `reviewRequest`: if `previous.cadence === "monthly"`, throw `new Error("Monthly agreements do not support daily or weekly schedule changes")`.
  - `convex/invites.ts`:
    - Update `preview` return validator `terms.cadence` to `v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))`.
  - `convex/occupancy.ts`:
    - Update `summary` return validator `cadence` to `v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))`.
    - In `recordNight`: if `terms.cadence === "monthly"`, throw `new Error("Monthly agreements use continuous billing and do not record individual nights")`.

- [ ] **Step 4: Add `convex-test` integration tests in `tests/monthly-rent.test.ts`**
  - Verify `terms.updateCurrent` / `stays.create` rejects `cadence: "monthly"` when `stay.arrangement !== "sublease"`.
  - Verify that on a stay with `arrangement: "sublease"`, `terms.updateCurrent` with `cadence: "monthly"`, `paymentDayOfMonth: 1`, and `rateCents: 180_000` succeeds, and `terms.acceptCurrent` generates calendar-month obligations with prorated partial months.
  - Verify `terms.acceptCurrent` with `initialCadence: "daily"` or `"weekly"` is rejected on a monthly stay.
  - Verify `paymentSchedule.requestChange` is rejected on a monthly stay.
  - Verify FIFO contribution recording (`contributions.create`) and overdue recovery plan request (`obligations.requestOverduePlan`) work seamlessly with monthly obligations.
  - Verify mid-month agreement revision (`terms.updateGuest` + `terms.acceptCurrent`) prorates the split month and preserves the earlier `dueDate`.

---

## Task 3: Web & iOS Cadence Display Compatibility

**Files:**
- Modify: `components/workspace/stay-screen.tsx`
- Modify: `components/household/payment-schedule-card.tsx`
- Modify: `components/household/guest-agreement-form.tsx`
- Modify: `components/onboarding/guest-onboarding-flow.tsx`
- Modify: `components/referral/join-household.tsx`
- Modify: `ios/Kouchd/StayScreens.swift`
- Modify: `ios/Kouchd/MoreScreens.swift`
- Modify: `ios/Kouchd/HostExtras.swift`

- [ ] **Step 1: Update Web components for `"monthly"` cadence**
  - `components/workspace/stay-screen.tsx`:
    - Format cadence unit as `cadence === "monthly" ? "month" : cadence === "weekly" ? "week" : "day"` in the Contribution plan card and guest list.
    - Only render `PaymentScheduleCard` when `terms.cadence !== "monthly"` (or pass `cadence: "daily" | "weekly" | "monthly"` and let `PaymentScheduleCard` show the fixed monthly due day for guests without the daily/weekly change form).
  - `components/household/payment-schedule-card.tsx`:
    - Accept `cadence: "daily" | "weekly" | "monthly"` and `paymentDayOfMonth?: number`.
    - When `cadence === "monthly"` and `!isHost`, display `Current schedule: Monthly · due day ${paymentDayOfMonth ?? 1} of each month` and note that monthly sublease schedules are fixed by the agreement (hide the daily/weekly request form).
  - `components/household/guest-agreement-form.tsx`:
    - Include `"paymentDayOfMonth"` in `GuestTerms` and preserve `cadence === "monthly"` + `paymentDayOfMonth` when editing a monthly agreement.
  - `components/onboarding/guest-onboarding-flow.tsx`:
    - Support `terms.cadence === "monthly"`: hide the daily/weekly switcher when `terms.cadence === "monthly"`, display `/ month` and `Due day ${terms.paymentDayOfMonth ?? 1} of each month`, and do not pass `initialCadence` when `terms.cadence === "monthly"`.
  - `components/referral/join-household.tsx`:
    - Format `preview.cadence === "monthly" ? "mo" : preview.cadence === "weekly" ? "wk" : "day"`.

- [ ] **Step 2: Update iOS views for `"monthly"` cadence**
  - `ios/Kouchd/StayScreens.swift`:
    - In `AgreementScreen`: when ` store.bundle["terms"]["cadence"].text == "monthly"`, hide the daily/weekly `Picker("Rhythm")` and call `terms:acceptCurrent` with only `["stayId": store.selectedStayID]`.
  - `ios/Kouchd/MoreScreens.swift`:
    - In `ScheduleScreen`: if `store.bundle["terms"]["cadence"].text == "monthly"`, show a note that monthly agreements use a fixed monthly due date instead of the daily/weekly change picker.
  - `ios/Kouchd/HostExtras.swift`:
    - In `TermsEditScreen`: preserve `paymentDayOfMonth` when `cadence == "monthly"`.

---

## Task 4: Release Records, Roadmap Sync & Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-10-30-sublease-step-1-access-codes.md`
- Modify: `docs/superpowers/plans/2026-11-02-sublease-step-2-bill-splitting.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/internal/CHANGELOG.md`
- Modify: `release/change.json`

- [ ] **Step 1: Update changelogs, roadmap tables, and `release/change.json`**
  - Add `WRE-270` summary to `CHANGELOG.md`, `docs/internal/CHANGELOG.md`, and `release/change.json`.
  - Update roadmap status tables in Step 1 and Step 2 plan files.
- [ ] **Step 2: Run full verification suite**
  - Run `npm test`, `npm run release:check`, `git diff --check`, and iOS Simulator `xcodebuild`.
