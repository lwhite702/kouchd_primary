# Subleases Step 5: Condition Checklists and Deposit Records Implementation Plan

## Goal
Implement Section 5 ("Move-in, move-out, and deposit") of the Subleases & Bill Splitting specification (`docs/superpowers/specs/2026-10-30-subleases-and-bill-splitting-design.md`):
1. **Move-in & Move-out Condition Checklists**:
   - Area-based condition checklist for move-in and move-out inspections.
   - For `subleaseLayout: "private_room"`, separate private room areas from shared household areas.
   - Either party (host or guest) can fill and submit the initial checklist; the counterpart confirms or submits itemized dispute notes.
   - All submissions, confirmations, and disputes are explicitly timestamped and immutable once confirmed.
2. **Deposit Record**:
   - Explicit tracking of security/holding deposit amount, custodian (host or third-party/escrow), agreed return date, and itemized post-stay deductions.
   - Counterpart confirmation and dispute workflow.
   - **Crucial Architectural Boundary**: Per `AGENTS.md` and spec §5, deposit records never alter obligations, rent ledger balances, or credits. Kouchd never holds funds or decides disputes.

---

## 1. Schema & Data Model (`convex/schema.ts`)

### `conditionChecklists` table
- `stayId: v.id("stays")`
- `guestUserId: v.id("users")`
- `type: v.union(v.literal("move_in"), v.literal("move_out"))`
- `status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("confirmed"), v.literal("disputed"))`
- `submittedBy: v.optional(v.id("users"))`
- `submittedAt: v.optional(v.string())` // ISO string
- `reviewedBy: v.optional(v.id("users"))`
- `reviewedAt: v.optional(v.string())` // ISO string
- `reviewNote: v.optional(v.string())`
- `items: v.array(v.object({`
  - `id: v.string()`
  - `area: v.string()` // e.g. "Bedroom", "Bathroom", "Kitchen", "Living Room"
  - `category: v.union(v.literal("private"), v.literal("shared"))`
  - `item: v.string()` // e.g. "Walls & Paint", "Flooring", "Windows & Blinds", "Furnishings"
  - `condition: v.union(v.literal("good"), v.literal("fair"), v.literal("damaged"), v.literal("not_applicable"))`
  - `notes: v.optional(v.string())`
  - `disputeNote: v.optional(v.string())`
`}))`
- Indexes: `by_stay_guest: ["stayId", "guestUserId"]`, `by_stay_type: ["stayId", "type"]`.

### `depositRecords` table
- `stayId: v.id("stays")`
- `guestUserId: v.id("users")`
- `amountCents: v.number()`
- `holder: v.union(v.literal("host"), v.literal("landlord"), v.literal("third_party"))`
- `holderName: v.optional(v.string())`
- `agreedReturnDate: v.string()` // YYYY-MM-DD
- `status: v.union(v.literal("recorded"), v.literal("refund_pending"), v.literal("returned"), v.literal("disputed"))`
- `deductions: v.optional(v.array(v.object({`
  - `id: v.string()`
  - `description: v.string()`
  - `amountCents: v.number()`
  - `disputed: v.optional(v.boolean())`
  - `disputeReason: v.optional(v.string())`
`})))`
- `guestConfirmedAt: v.optional(v.string())`
- `disputeNote: v.optional(v.string())`
- Indexes: `by_stay_guest: ["stayId", "guestUserId"]`.

---

## 2. Server Mutations & Queries (`convex/checklists.ts`, `convex/deposits.ts`)

- `convex/checklists.ts`:
  - `getByStay(stayId, guestUserId)`: Returns move-in and move-out checklists.
  - `submit(stayId, type, items)`: Submits inspection items (checks sublease lock guard `assertSubleaseUnlocked`).
  - `review(checklistId, action: "confirm" | "dispute", reviewNote, itemDisputes)`: Confirms or disputes submitted checklist.
- `convex/deposits.ts`:
  - `getByStay(stayId, guestUserId)`: Retrieves deposit record.
  - `record(stayId, guestUserId, amountCents, holder, holderName, agreedReturnDate)`: Records initial deposit (host only, gated by `assertSubleaseUnlocked`).
  - `itemizedDeduction(depositId, deductions)`: Proposes deductions upon move-out.
  - `respond(depositId, action: "confirm" | "dispute", note)`: Guest accepts or disputes deposit return/deductions.

---

## 3. Web UI Components (`components/subleases/`)

- `components/subleases/condition-checklist-card.tsx`:
  - Area breakdown separating Private Room vs Shared Household spaces.
  - Condition pills (Good, Fair, Damaged, N/A).
  - Move-in / move-out comparison view.
  - Confirm / Dispute action drawer.
- `components/subleases/deposit-record-card.tsx`:
  - Deposit amount display with clear disclosure: "Kouchd does not hold or transfer deposit funds."
  - Agreed return date and custodian details.
  - Itemized deductions breakdown with dispute toggle.

---

## 4. Native iOS Views (`ios/Kouchd/`)

- Add checklist & deposit status rows and detail sheets to `StayScreens.swift` / `CoordinationScreens.swift`:
  - Move-in / move-out condition checklist sheet with private room separation.
  - Deposit record overview and deduction dispute actions.

---

## 5. Verification & Tests

- Unit & integration tests in `tests/sublease-checklists-deposits.test.ts`:
  1. Checklist submission by host or guest with private/shared item categorization.
  2. Timestamped counterpart confirmation and dispute note capture.
  3. Deposit recording, deduction proposal, and dispute workflows.
  4. Non-impact verification: confirm ledger balances, obligations, and financial totals remain completely unaltered by deposit records.
  5. Sublease lock enforcement: verify checklist and deposit modifications are blocked when sublease is locked.
- Run `release-version.mjs check`, `vitest run`, and `tsc --noEmit`.
