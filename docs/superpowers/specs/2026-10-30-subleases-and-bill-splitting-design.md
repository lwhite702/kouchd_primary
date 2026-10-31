# Subleases and bill splitting: design

Status: awaiting review. Nothing in this document has been built or released.
Source checked: `kouchd_primary` `main` at `41a5a41` (code reading only, nothing run).

## Goal

Make subleasing a committed Kouchd segment for students, interns, and young professionals, and add a general bill split feature. A host can run a full sublease, from invite to deposit record, without leaving Kouchd, on web and iOS. Existing stays behave exactly as they do today.

## Decisions

| Topic | Decision |
| --- | --- |
| Segment | Committed, not a demand test |
| Layouts | Whole place and private room, both in the first release |
| Model | A sublease is a type of stay, not a separate workspace |
| Roommates | Never accounts. Plain-text names and a count only |
| Landlord consent | Required answer with a dismissible warning. It never blocks the invite |
| Plan | Subleases and bill splits are Plus only, checked on the host's account |
| Plus ends mid-sublease | That sublease becomes read-only and exports are blocked until there is an active subscription |
| Lock scope | The affected sublease only, not the whole account |

## Out of scope

Roommate accounts, listings or matching, bank or utility connections, collecting or holding money, sublease contract templates, state-specific legal advice, photos, receipt uploads, recurring bills, guest-posted bills, bills the host owes back to a guest, and a self-serve export feature.

## Current product facts this design relies on

- Agreements support `daily` and `weekly` cadence only (`convex/schema.ts`).
- `adhoc` obligations exist and only a host can create them (`convex/obligations.ts`).
- `PlanCapabilities` and `resolveSubscriptionPlan` live in `lib/domain/subscriptionPlans.ts`. Plus allows 3 active stays and 5 guests.
- `billing_retry`, `expired`, `refunded`, and `unknown` currently resolve to no paid access (`convex/lib/subscriptionAccess.ts`).
- `getBundle` returns the full stay, including `houseInfo.doorCode` and `houseInfo.wifiPassword`, to any active member, and ending a stay does not change memberships (`convex/stays.ts`).
- No in-app export code was found. `help/support/app-support.mdx` says support can help export stay records. A code comment lists "personal exports" among core capabilities.
- `help/support/app-support.mdx` already says Kouchd cannot resolve deposit disputes.

## 1. Data model

All new fields are optional so existing rows stay valid.

**`stays`**
- `arrangement`: `home_stay | sublease`. A missing value means `home_stay`.
- `subleaseLayout`: `whole_place | private_room`. Required when `arrangement` is `sublease`.
- `roommateCount`: integer, private room only.
- `roommateNames`: array of plain-text names, private room only.
- `landlordConsent`: `{ answer: written_permission | not_required | not_confirmed, answeredAt, warningDismissedAt? }`. Required before the first invite on a sublease. Kouchd records the answer, does not verify it, and does not store the lease.

**`terms`**
- `cadence` gains `monthly`, allowed only on subleases at first.
- `paymentDayOfMonth`: integer 1 to 28, required for `monthly`.
- `billingBasis` must be `continuous` on subleases. Recorded nights are off.
- Late fees default to off on subleases. Early discounts and rewards are not offered on `monthly` terms in the first release.

**New tables**
- `bills`: `stayId`, `createdBy`, `title`, `category`, `serviceStart`, `serviceEnd`, `totalCents`, `dueDate`, `splitMethod`, `createdAt`, `voidedAt?`, `voidedBy?`.
- `billShares`: `billId`, `stayId`, `guestUserId`, `input` (percent or fixed cents, when used), `prorationDays?`, `amountCents`, `obligationId`.
- `conditionChecklists`: `stayId`, `guestUserId`, `stage` (`move_in | move_out`), `items` (`id`, `area`, `label`, `status`, `note`), `submittedBy?`, `submittedAt?`, `confirmedBy?`, `confirmedAt?`, `disputeNote?`.
- `depositRecords`: `stayId`, `guestUserId`, `amountCents`, `heldBy` (free text), `agreedReturnDate`, `deductions` (`label`, `amountCents`), `status` (`recorded | return_proposed | confirmed | disputed`), plus timestamps and actors.

Database roles stay `host` and `guest`. Screens also say "host" and "guest" on subleases, matching the rest of the product and `AGENTS.md`. Permission and financial privacy rules do not fork.

## 2. Monthly rent

- Periods follow calendar months. The due date is `paymentDayOfMonth` of that month, or the start date if that day has passed in a partial first month.
- Partial first and last months are prorated: `round(monthlyCents * daysCovered / daysInThatMonth)` in whole cents.
- Generating `monthly` obligations is the riskiest ledger change, so it ships and is tested as its own step. Payment schedule change requests, overdue plans, and FIFO credit allocation must all be checked against it.

## 3. Bill splitting (any Plus stay)

**Flow**
1. The host enters the bill title, category, service dates, total, due date, and the guests sharing it.
2. Each guest's share uses one method: equal, percentage, or fixed amount. Proration by days overlapping the service dates is optional per bill.
3. One mutation creates the bill, its shares, and one `adhoc` obligation per guest, so a bill cannot be half-created.

**Calculation**
- Equal and percentage shares include the host as a participant unless the host is excluded. The host's share is never posted to the ledger.
- Shares use whole cents. Leftover cents go by largest remainder, with ties broken by earliest membership `joinedAt`, so the same inputs always give the same result.
- Guest shares may not total more than the bill.

**Sublease presets**
- Whole place: 100% to the guest, with the host excluded.
- Private room: `1 / (roommateCount + 1)` to the guest, editable before posting.

**Privacy**
- A guest sees the total, their own share, and how it was calculated. The server never returns another guest's share to a guest.
- In an equal split, guests can work out each other's amounts. The host is told this before posting.

**Corrections**
- Voiding a bill voids all its charges and writes to the activity log. To change an amount, the host voids and posts again. Posted charges never change silently.

## 4. Access details (all stays, ships first)

This fixes existing behavior and does not depend on the rest of this document.

- The server removes `doorCode` and `wifiPassword` from responses to a guest unless the stay has not ended, that guest has accepted an agreement version, and, on a sublease, the current date is not after the agreement end date. A pending new version doesn't remove access, and neither does another guest not having accepted yet, because either would lock out someone already living there. A guest who rejoins must accept again.
- The redaction lives in one shared helper, used by every query that returns a stay to a guest, and is covered by server tests.
- Ending a sublease reminds the host to change the codes, because Kouchd cannot revoke a physical code.

## 5. Move-in, move-out, and deposit

**Checklists**
- A checklist by area is completed at move-in and again at move-out. One person submits and the other confirms or adds a dispute note. Both actions are timestamped.
- Private room checklists separate the room from shared spaces.

**Deposit record**
- It records the amount, who holds it, the agreed return date, and itemized deductions. The guest can confirm or dispute.
- It never affects the rent balance, obligations, or credits. Kouchd does not hold the money or decide disputes.

## 6. Plus access

- Add `subleases` and `billSplits` to `PlanCapabilities`: on for `hostPlus` and `householdPro`, off for `starter`.
- The server checks the host's account for every create or post action. Guests never need Plus.
- A Free host who tries either feature gets the existing upgrade flow.
- If the plan cannot be read (`plan === null`), new subleases and new bills are refused, and existing subleases are not locked.
- When Plus ends on a non-sublease stay, posted bills stay on the ledger and new bills are blocked. Nothing else changes.

## 7. Sublease lock

**When it applies**
- It is derived on the server from subscription state by one helper, `getSubleaseLockState`, and applies only to `arrangement: sublease`.
- It locks on `expired`, `refunded`, a canceled or trial period that has ended, or `billing_retry` lasting more than 7 days. The first `billing_retry` time comes from the subscription snapshot. The existing `grace_period` keeps access.
- `unknown` status or an unreadable plan never locks a sublease. It raises an operational alert instead, so a provider problem cannot lock a household.

**While locked**

| Action | Host | Guest |
| --- | --- | --- |
| View terms, ledger, bills, and history | Yes | Own records |
| View door code and Wi-Fi | Yes | Yes, until the sublease end date |
| Add or edit anything, including pending invites and agreement acceptance | No | No |
| End the sublease | Yes | No |
| Exports in the app or through routine support | No | No |
| Formal legal data request through support | Yes | Yes |

- New charges, reminders, and late fees pause.
- Every sublease-scoped mutation calls the lock guard. The implementation plan must list these mutations and test each one.
- Other stays on the account continue under normal Free limits.

**Notifications**
- Host, in-app and email: "Your Plus subscription has ended. This sublease is locked and exports are blocked until you have an active subscription."
- Guest, in-app and email: "This sublease is read-only and exports are blocked until the host renews. Your sublease agreement still applies, so keep paying rent as agreed. Kouchd's record being locked doesn't change it."
- The guest's notice contains no billing details. Text messages go only to people who opted in.
- During the 7-day `billing_retry` period, the host gets warnings. The guest is not told.

**On renewal**
- Everything unlocks. Rent charges for the locked period are added in one transaction, labeled as added late, with no late fees for that time and no duplicates.
- Reminders do not send for each added charge at once. The guest gets one summary.

**Disclosure**
- The host sees the lock rule before buying Plus through the sublease flow and before creating a sublease.
- The guest sees it before accepting the invite, along with advice to keep their own copy of the agreement. This is required.

**Exports**
- No export feature is built in this project. The block applies to routine support exports, and support needs a written process that separates routine requests from formal legal data requests.
- The "personal exports" capability comment and `help/support/app-support.mdx` must be updated to match.

**Accepted risk**
A guest who has paid everything can lose exports and editing because of something they don't control, possibly during a deposit dispute. The owner accepted this risk. The invite disclosure and the formal request route are the mitigations.

## 8. Onboarding

**Host**
1. Choose "Someone staying with me" or "Subletting my place". Without Plus, the second choice opens the upgrade flow.
2. Choose the layout, and enter the roommate count if it is a private room.
3. Enter dates, monthly rent, and an optional deposit record.
4. Answer the landlord consent question. `not_confirmed` shows a dismissible warning, and the answer is saved either way.
5. Add access details and a bill split preset.
6. Review the lock rule and the notice that Kouchd's record does not replace a written sublease, then send the invite.

**Guest**
1. Open the invite and sign in. No Plus is needed.
2. Review the agreement, deposit record, and lock disclosure.
3. Accept, which unlocks access details. The move-in checklist is the first task.

## 9. Legal and policy (counsel review required before launch)

- Terms: subleases, the lock rule, the export block and its exception, and that a host who is a tenant usually stays responsible under their original lease.
- Privacy policy: deposit, consent, checklist, roommate name, and bill data.
- Consent wording, and whether a lock can fairly block a guest's access to their own records.
- Which formal data requests must be honored, by location.

Kouchd stays a record-keeping tool. It is not a landlord, broker, or property manager, and it does not replace a written sublease or legal advice.

## 10. Rollout

Each step ships on its own. Steps 2 to 5 sit behind `featureFlags`. Web and iOS ship each step together. Each product step needs a Linear issue, a version, and changelog and help updates, as `AGENTS.md` requires.

| Step | Ships | Notes |
| --- | --- | --- |
| 1 | Access-code fix | All stays, no flag |
| 2 | Bill splitting on Plus | Useful on its own, and subleases depend on it |
| 3 | Monthly rent | Available only through the sublease path once step 4 ships |
| 4 | Sublease type, setup, consent, lock | Needs counsel sign-off before the flag opens to users |
| 5 | Checklists and deposit record | Completes the sublease |
| 6 | Blog post, sublease page, help articles | Only after counsel sign-off and a verified release |

## 11. Marketing rules

- The draft post "How to Split Utilities with a Subletter" keeps its keyword and its flat-rate versus actual-usage structure.
- Remove "Sublease Dashboard", "Sublease Ledger", "Free Sublease Space", and the promise to recover a deposit.
- Present subleasing as a Plus feature. Mention a trial only if checkout offers one at publish time.
- Add advice to get landlord consent and to note that the tenant usually stays responsible under the lease.
- Posts go in `src/data/post/` in `kouchd_marketing` and must follow its existing frontmatter schema.
- Public copy may use "subletter" and "sublease" as search terms, but must explain that the app calls these people the host and the guest.
- Follow the brand voice in `AGENTS.md`. Don't describe a guest or subletter as a debtor.

## 12. Testing

- **Money:** monthly proration across month lengths and leap years, cent rounding that always totals correctly, and catch-up after a lock with no duplicates or late fees.
- **Permissions:** Plus checks, the guard on each locked mutation, and code redaction by stay status, acceptance, and end date.
- **Privacy:** no guest query returns another guest's share or rates.
- **Lock states:** every subscription status, including the 7-day boundary, `unknown`, and an unreadable plan.
- **No regressions:** existing `home_stay` agreements, ledgers, and notifications are unchanged, including rows with no `arrangement` value.
- **Parity:** the same server behavior is exercised from web and iOS.

Passing tests are evidence about code only. Release and production behavior are verified separately.

## 13. Measures

Sublease setups started and completed, upgrades from the sublease flow, guest invites accepted, bills posted by arrangement type, how often `not_confirmed` is chosen, locks and renewals, and cancellations after a first sublease ends. Students and interns may only need Plus for 2 to 4 months, so cancellations after a first sublease are the number to watch.

## Done means

- A host and a guest complete a whole-place sublease and a private-room sublease from invite to deposit record on both web and iOS.
- A lapsed subscription locks only the affected sublease, and renewal restores it with a correct ledger.
- Plus limits on subleases and bill splits hold on the server.
- Former guests can't get access codes from the server.
- Counsel has signed off on the wording in section 9.
