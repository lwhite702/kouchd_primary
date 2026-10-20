# Kouchd GTM Feature Set, Product Requirements, and Roadmap

**Status date:** 2026-10-20
**Document status:** Product direction and roadmap draft; implementation status is evidence-based and may differ by branch.
**Primary context:** [Kouchd Notion project home](https://app.notion.com/p/3fe11f2a539081a2b2acd73ce496ef3c)

## 1. Product summary

Kouchd helps people coordinate shared living with less friction. Hosts organize stays and household expectations; guests receive free access to participate. The product combines stay agreements, household information, chores, check-ins, and contribution records in a shared context.

Kouchd records contribution and schedule information. It must not be described as collecting, holding, transferring, or processing household payments. Guests remain free on every plan. Host subscription access is household/account-oriented and server-authoritative.

## 2. GTM feature list and benefits

### Kouchd

For hosts managing one stay and its day-to-day coordination, with guests invited to participate for free.

- **Stay agreements and history:** Share expectations and retain the applicable agreement history. Benefit: hosts and guests can refer to the same terms.
- **Core contribution ledger:** Record contribution expectations, entries, and status. Benefit: give household members a clearer shared record without suggesting money moves through Kouchd.
- **Basic chores:** Assign and track household tasks. Benefit: make ownership and completion easier to see.
- **Guest functions:** Invite guests and let them use the household tools relevant to their stay. Benefit: coordination includes the people affected by household plans.
- **One active stay and one active guest (Starter limits):** Keep the entry plan focused on one small household. Benefit: provide a usable starting point for a host coordinating a single guest.

### Kouchd Plus

For hosts who need more tools to manage a busier stay. **Kouchd Plus web price: $6.99/month or $69.99/year. iOS price: $8.99/month or $89.99/year.** Signing up on the web saves about 22% on either billing period. The yearly price averages about $5.83/month on web and $7.50/month on iOS.

- **Up to three active stays and three active guests:** This is the current plan-policy proposal; the exact meaning of “guest” versus “room/stay” needs product confirmation before commercial enforcement.
- **Flexible terms:** More ways to configure stay terms. Benefit: better fit different host arrangements.
- **Recurring chores:** Schedule repeated chores with due reminders. Benefit: reduce manual recreation of routine tasks.
- **Expanded Koins/rewards:** Give hosts more room to use the existing rewards concept. Benefit: support household participation. Exact allowances need confirmation.
- **Host reporting:** Surface household-level information for the host. Benefit: understand activity without assembling a separate manual report.
- **Welcome kit:** Organize practical arrival information for guests. Benefit: make essential stay details easier to find.

Plus benefits above are plan capabilities in the subscription policy worktree, not evidence that each benefit is released, billing is live, or limits are enforced in production. Do not market SMS allowances as a Plus benefit until quotas, consent, provider configuration, and delivery behavior are decided and verified.

### Short marketing copy

**Kouchd:** A calmer way to live together. Keep stay expectations, household details, chores, check-ins, and contribution records in one shared place. Hosts stay organized, guests know where to find what they need, and guests can participate for free.

**Kouchd Plus:** More room and useful host tools for a busier household. Kouchd Plus adds flexible terms, recurring chores, host reporting, and a guest welcome kit, with monthly and annual options. Guests remain free.

**Sign-up online discount:** “Save over 20% when you sign up at [app.kouchd.com](https://app.kouchd.com).” The $6.99 web monthly price is about 22.2% below the $8.99 iOS monthly price; the $69.99 web annual price is about 22.2% below the $89.99 iOS annual price. This offer may be promoted on the marketing site, email, and social channels.

**iOS offer presentation:** For the U.S. App Store storefront, Kouchd may show a link or button to web checkout; the purchase completes in the browser. Do not show or promote the lower web price or link to web checkout from Kouchd’s in-app surfaces outside the U.S. storefront unless a separate region-specific Apple entitlement and product approval are confirmed. Apple’s current App Review Guidelines make the U.S. storefront exception and describe region-specific external-purchase entitlements; review the applicable rules before shipping any regional variation ([App Review Guidelines, section 3.1.1(a)](https://developer.apple.com/app-store/review/guidelines/)).

**Checkout and paywall implementation:** The web checkout uses the existing $6.99 and $69.99 products; no product setup change is needed for this pricing update. Keep prices sourced dynamically from the relevant store/provider. The iOS annual card should display the store-provided $89.99/year price and may show its equivalent of about $7.50/month. Do not hardcode prices or infer availability from product catalog state.

Keep checkout, entitlement, and customer availability claims tied to current provider and release evidence.

## 3. Plan requirements

### Starter / Kouchd

- One active stay and one active guest under the current policy proposal.
- Stay agreements and history, individual records, core ledger, basic chores, and guest functions.
- Guests can join, review applicable terms, see authorized household information, and participate without subscribing.

### Host Plus / Kouchd Plus

- Proposed allowance of three active stays and three active guests; resolve whether the limit is per guest, room, or stay before enforcing or advertising it as final.
- Includes Starter capabilities plus flexible terms, recurring chores, expanded Koins, host reporting, and a welcome kit.
- Web price: $6.99 monthly or $69.99 annually. iOS price: $8.99 monthly or $89.99 annually. Guests remain free.
- Subscription belongs to the host or household billing owner, never each guest.

### Higher-tier boundary

The current policy model reserves multi-stay management beyond the Plus limit, co-host administration, and consolidated reporting for Household Pro. Pro pricing and launch scope are not specified in this document.

### Entitlement rules

- The server is authoritative for host or household plan access; a client-side entitlement response cannot independently grant paid capabilities.
- Preserve existing stays and records through cancellation, expiry, and downgrade. Block new over-limit actions rather than deleting data.
- Keep test and production billing distinct. A configured offering or test purchase is not production billing proof.
- Guests remain free and retain authorized access to existing household records under every host plan state.

## 4. Technical PRD

### Goals

1. Keep household coordination clear and role-appropriate for hosts and guests.
2. Provide a reliable, privacy-scoped record for stays, agreements, chores, check-ins, and contributions.
3. Add shopping and household operations features without conflating shopping with ledger balances.
4. Give hosts useful household planning information without presenting estimates as invoices, payments, or guarantees.
5. Apply subscription capabilities on the server while protecting guest access and preserving household data.

### Current product foundations

- Household/stay setup, host and guest membership, invitation/referral flows.
- Versioned stay terms and guest acceptance history.
- Contribution records and status, host-configured schedules, and rewards/Koins foundations.
- One-time chores, assignees, completion/reopen, and activity history.
- Host-set next check-in date, household details, announcements, reminders, and role-specific onboarding.
- Server-side subscription policy exists in the WRE-188 RevenueCat setup worktree. Provider checkout, production configuration, and released entitlement behavior must be verified separately.

### Planned feature requirements

#### Shared shopping lists (WRE-179)

- Lists and items are scoped to a stay.
- Items include name, quantity, optional note, visibility (shared or personal), and completion state.
- Active members may create and update items subject to server-side authorization.
- Personal items are visible only to their creator and the host; shared items are visible to active members.
- Meaningful list changes appear in household activity.
- Shopping records do not create contributions or change a balance. Expense splitting was explicitly deferred from WRE-179.

#### Household inventory (proposed extension)

- Track household supplies separately from a shopping list, with item name, quantity/on-hand state, optional unit, location, and low-stock threshold.
- Authorized members can update counts; the product records who changed an item and when.
- Low-stock signals may suggest adding an item to a list; they must not silently create purchases or financial records.
- Decide whether inventory is Starter or Plus before implementing gates.

#### Recurring chores and rotation (WRE-180 plus proposed rotation)

- A host can create a one-time or recurring chore, assign it to a member, role, or shared household, and set cadence and next due date.
- Completing or aging an occurrence produces at most one next occurrence at the configured cadence.
- Reminders target active assignees and are deduplicated per occurrence/date.
- Preserve one-time chore behavior.
- Rotation is a separate extension: define eligible members, order, skip/unavailable handling, and reassignment audit history before implementation.

#### Structured check-ins and acknowledgements (proposed)

- Extend the current host-set next check-in date into an optional household check-in with agenda/prompts, date, participants, and follow-up items.
- Allow members to acknowledge relevant house guidelines or check-in items with a timestamp and actor identity.
- Distinguish an onboarding checkbox from a durable, auditable acknowledgement record.
- Keep responses private to authorized household members and avoid implying legal consent unless explicitly designed and reviewed for that purpose.

#### Expense allocation (proposed; separate from shopping records)

- Let authorized members record a household expense with amount, currency, date, category, payer, participants, and allocation method.
- Support equal and explicitly entered shares first; define rounding in integer minor units so allocations sum exactly to the recorded total.
- Preserve a clear audit trail for edits and approvals.
- Do not initiate transfers, create automatic debt collection, or modify existing contribution balances unless a separate product decision defines that integration.
- WRE-179 explicitly deferred expense splitting; this scope is not included in its completed issue.

#### Household forecasting (proposed)

- Show clearly labeled estimates based on host-entered stay dates, agreed terms, scheduled check-ins/occupancy where applicable, and recorded household inputs.
- Explain assumptions, date range, included records, and missing data alongside every forecast.
- Recompute when source data changes; show the calculation inputs and last-updated time.
- Forecasts are planning aids, not invoices, payment promises, financial advice, or proof that a contribution will be made.
- Do not infer external payments or use unverified money movement data.

### Data and security requirements

- Scope every household record to its stay/household and enforce membership/role authorization in Convex mutations and queries.
- Keep personal shopping items visible only to their owner and host.
- Keep inventory, expense, check-in, forecast, and acknowledgement records auditable and privacy-scoped.
- Store currency values as integer minor units; define deterministic allocation and rounding behavior.
- Avoid retaining or exposing sensitive household data beyond its product purpose.
- Preserve existing records and guest access during plan changes.

### Acceptance criteria

1. A guest can join and participate in a household without a paid plan.
2. An unauthorized member cannot read or mutate another household’s records.
3. A shopping list item supports quantity, note, shared/personal visibility, completion, and activity history.
4. Shopping list activity never changes contribution records or balances.
5. A recurring chore generates one next occurrence at the configured cadence without duplicate generation or reminders.
6. A durable acknowledgement identifies the member, item/version, and timestamp; onboarding-only checkbox state is not presented as a durable record.
7. Expense allocations sum exactly to the entered amount in integer minor units and require explicit participant/allocation data.
8. Forecast views disclose assumptions and never represent estimates as payments due or paid.
9. Downgrade/expiry preserves data and blocks only new actions that exceed verified plan access.
10. Plus checkout displays store/provider-sourced prices for the user's platform: web $6.99 monthly / $69.99 yearly and iOS $8.99 monthly / $89.99 yearly; purchase, restore, cancellation, renewal, and expiry are verified before claims of live billing.
11. The web-signup discount is advertised outside the app; in-app web checkout links and price comparisons follow the U.S.-only rollout rule unless an approved regional entitlement changes the scope.

## 5. Roadmap and progress tracker

Status meanings: **Implemented** = found in the reviewed source; **In progress** = an active engineering issue exists; **Tracker/source mismatch** = Linear says complete but the reviewed checkout does not contain the implementation; **Proposed** = product opportunity, not scheduled or in development.

| Workstream | Current status (2026-10-20) | Evidence / tracker | Next step |
|---|---|---|---|
| Core agreements, ledger, basic chores, check-ins, household details | Implemented in reviewed source | `kouchd_primary` source; check-ins currently include a host-set next date | Maintain parity and verify role-specific flows as part of future changes |
| Shared shopping lists | Tracker/source mismatch | [WRE-179](https://linear.app/wrelik/issue/WRE-179/add-shared-shopping-lists-to-kouchd) is Done and references merged PR #37; no shopping module was found in the reviewed `codex/WRE-10-redact-invite-analytics` checkout | Reconcile against current `origin/main`/merged PR and update the status from a current source checkout |
| Recurring chores and due reminders | In progress; not verified in reviewed checkout | [WRE-180](https://linear.app/wrelik/issue/WRE-180/add-recurring-chores-and-due-reminders) is In Progress; current reviewed `convex/chores.ts` has one-time chore fields/actions | Continue WRE-180; verify occurrence generation, deduplication, and reminder authorization |
| Household inventory and low-stock suggestions | Proposed | No inventory implementation or active Kouchd issue confirmed in this review | Define MVP data fields, visibility, and plan placement |
| Chore rotation | Proposed extension | Recurrence is covered by WRE-180; rotation rules are not in its scope | Specify assignment order and edge cases after recurrence foundations land |
| Durable guideline acknowledgements | Partial foundation; durable history unverified | Guest onboarding has a rules acknowledgement checkbox; no dedicated acknowledgement record was confirmed in the reviewed schema | Decide whether durable acknowledgements are needed and what they mean |
| Structured household check-ins | Partial foundation | A host-set next check-in date and reminders exist; structured agenda, responses, and follow-ups were not confirmed | Define check-in workflow and retention/privacy needs |
| Expense allocation / splitting | Proposed | Explicitly deferred from WRE-179; no expense allocation model confirmed | Decide use cases, share methods, approval, and record boundaries |
| Household forecasting | Proposed discovery | No forecasting implementation or confirmed issue found in this review | Validate demand and define transparent inputs before implementation |
| Kouchd Plus capability gates | In progress in subscription workstream; production state unverified | WRE-188 policy branch defines Starter/Host Plus/Household Pro capabilities; current limits are advisory pending product confirmation | Confirm limit semantics and capability gates; verify provider purchase/restore/webhook and server enforcement |
| Kouchd Plus prices | Product-owner decision recorded | Web: $6.99 monthly / $69.99 yearly; iOS: $8.99 monthly / $89.99 yearly | Web products already use the requested prices; preserve dynamic paywall display and verify live store values |
| Web-signup discount promotion | Ready for marketing copy; iOS regional presentation constrained | About 22% on both monthly and annual web prices; approved copy: “Save over 20% when you sign up at app.kouchd.com” | Promote on external channels; show in-app web checkout CTA only for U.S. storefront under the current rollout rule |

### Roadmap phases

1. **Reconcile current baseline:** Verify merged shopping-list PR in current `origin/main`; keep WRE-180 status accurate; confirm Plus guest/stay limit semantics and align the Notion plan summary.
2. **Complete household coordination foundations:** Finish recurring chores/reminders; define durable acknowledgements and structured check-ins if validated by users.
3. **Expand household operations:** Add inventory and low-stock-to-list flow after shopping-list source status is settled; then design chore rotation.
4. **Improve shared expense visibility:** Define expense allocation as a separate record system with exact arithmetic and clear approval; never imply transfer/payment processing.
5. **Explore planning forecasts:** Validate demand and source-data quality; prototype transparent estimates only after obligations/occupancy inputs are dependable.
6. **Launch Plus safely:** Keep platform pricing distinct (web $6.99/$69.99; iOS $8.99/$89.99), confirm entitlement boundaries and server enforcement, verify purchase/restore/expiry, and apply storefront-specific offer presentation.

No ETA is assigned. Roadmap sequence is an order of dependencies and readiness, not a promise of delivery dates.

## 6. Product decisions to keep visible in Notion

- Guests stay free under every plan.
- Kouchd Plus is $6.99 monthly / $69.99 yearly on web and $8.99 monthly / $89.99 yearly on iOS. Web signup is about 22% less for both billing periods; external marketing may promote the savings.
- In-app web checkout links and lower-web-price promotion follow the U.S.-only rollout rule. Recheck Apple policy and any approved entitlements before enabling other storefronts.
- Proposed Starter/Plus limits are one active stay and one active guest for Starter, and three active stays and three active guests for Plus; confirm exact semantics before enforcement or final marketing.
- Household Pro is the current concept for multi-stay administration beyond Plus, co-host administration, and consolidated reporting; pricing and release scope remain open.
- Inventory, chore rotation, durable acknowledgements, structured check-ins, expense allocation, and forecasting are future roadmap items unless implementation evidence changes their status.
- Notion is the shared product-context and decision brain; source code and release evidence continue to determine what is implemented and available.
