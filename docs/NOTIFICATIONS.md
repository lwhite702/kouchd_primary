# Kouchd notification setup

Kouchd sends transactional email and SMS through server-side Convex actions. The Knock API key belongs in each Convex deployment environment; do not add it to Vercel client variables, browser code, or source control. Configure Development and Production separately.

## Workflow contracts

Create or verify these exact Knock workflow keys. Templates should use only the listed fields and follow the current Kouchd SMS terms, including the brand, message-rate disclosure, and STOP/HELP instructions.

| Workflow key | Trigger | Payload fields |
| --- | --- | --- |
| `guest-invitation` | Host creates an invite with an email address | `hostName`, `stayName`, `inviteUrl`, `expiresAt` |
| `check-in-reminder` | Daily reminder job (13:00 UTC), for the day before the stay's next check-in in that stay's timezone | `stayName`, `hostName`, `checkInDate` |
| `agreement-pending` | Once-daily reminder job (13:30 UTC) for pending stays where host or guest agreement is unsigned. Hosts with multiple unsigned guests receive 1 consolidated reminder per day | `recipientRole`, `stayName`, `stayId`, `hostName`, `guestName`, `termsUrl`, `rate`, `rateCents`, `cadence`, `version`, `detail`, `action`, `unsignedGuestCount` |
| `payment-due-reminder` | Daily reminder job (13:00 UTC) across progressive payment stages (upcoming, due today, grace overdue, grace final warning, compounding late fee assessed, and critical delinquency); repeats on schedule until paid in full; fully paid obligations (`balanceCents <= 0`) are omitted | `stayName`, `amountDue`, `periodLabel`, `dueDate`, `balance`, `urgencyLevel`, `stage`, `stageTitle`, `warningMessage`, `consequences`, `actionRequired`, `daysOverdue`, `graceEndDate`, `lateFeeCents` |
| `chore-reminder` | Daily reminder job (13:00 UTC), on the chore's due date in that stay's timezone. Multiple chores due on the same day for a user are consolidated into 1 reminder | `choreTitle`, `dueDate`, `choreCount`, `additionalChoresCount` |
| `adhoc-fee-posted` | Host creates a one-off charge | `hostName`, `feeTitle`, `amount`, `dueDate` |

All amounts are integer cents. Templates must format them as currency. The invitation is an email to the address the host entered; other workflows target the Kouchd user record.

### Daily reminder capping and prioritization

To avoid notification fatigue, Kouchd enforces a global daily cap of at most 1 reminder notification per user per calendar day across all reminder workflows (`payment-due-reminder`, `agreement-pending`, `chore-reminder`, `check-in-reminder`).

1. **Daily schedule & evaluation priority**:
   - At 13:00 UTC, the daily reminder job evaluates candidates in strict order of urgency:
     1. **Payment due reminders** (ranked by stage severity: `critical_delinquency` > `late_fee_assessed` > `late_fee_warning` > `grace_final` > `grace_overdue` > `due_today` > `upcoming`, capped at 1 payment reminder per user).
     2. **Chore reminders** (consolidated so that multiple chores due on the same day produce at most 1 reminder per user, referencing the count and titles).
     3. **Check-in reminders** (day before scheduled check-in).
   - At 13:30 UTC, the once-daily agreement pending job evaluates unsigned agreements.
2. **Consolidation**:
   - **Host agreement pending**: A host with multiple unsigned guests receives at most 1 consolidated reminder per day referencing the guest names and count (`unsignedGuestCount`).
   - **Chores**: Multiple chores assigned to or shared with a user due on the same day are consolidated into a single reminder.
3. **Cross-workflow suppression**:
   - If a user receives any reminder notification on a calendar day (in their stay's timezone), all other reminder workflows are suppressed for that user for the remainder of that calendar day.

### Workflow cancellation keys

Workflows with scheduled or repeating reminders use stable cancellation keys:
- `agreement-pending`:
  - Guest reminder: `agreement-pending:${stayId}:${guestUserId}`
  - Host reminder for specific guest: `agreement-pending:${stayId}:${hostUserId}:${guestUserId}`
  - Host reminder (consolidated or host unsigned): `agreement-pending:${stayId}:${hostUserId}`
  - Reminders are automatically cancelled when the recipient or guest accepts the terms via `acceptCurrent`.


## Channels and consent

- Email preference defaults to enabled; SMS defaults to disabled.
- SMS is enabled only after an explicit opt-in with a valid E.164 number. Kouchd stores an append-only opt-in/opt-out event with its source and consent version.
- An in-app opt-out schedules a Knock preference update. Provider STOP handling and suppression must also be configured and verified in Knock's SMS provider; the app has no inbound STOP webhook.
- The code records when Knock accepts a workflow trigger. This is not proof of downstream email or SMS delivery.
- A Knock in-app notification inbox is not part of this setup; the configured workflows use email and SMS preferences.

## Verification checklist

Before enabling a production channel, verify each workflow key and payload mapping in Knock, confirm its email/SMS channels and providers, then send a test event to a controlled test recipient. Check the Knock workflow run and the recipient outcome separately. Confirm SMS opt-out behavior with the configured provider. Never test with an uninvolved household member or broadcast to a real audience.
