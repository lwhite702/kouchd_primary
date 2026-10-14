# Kouchd notification setup

Kouchd sends transactional email and SMS through server-side Convex actions. The Knock API key belongs in each Convex deployment environment; do not add it to Vercel client variables, browser code, or source control. Configure Development and Production separately.

## Workflow contracts

Create or verify these exact Knock workflow keys. Templates should use only the listed fields and follow the current Kouchd SMS terms, including the brand, message-rate disclosure, and STOP/HELP instructions.

| Workflow key | Trigger | Payload fields |
| --- | --- | --- |
| `guest-invitation` | Host creates an invite with an email address | `hostName`, `stayName`, `inviteUrl`, `expiresAt` |
| `check-in-reminder` | Daily reminder job, for the day before the stay's next check-in in that stay's timezone | `stayName`, `hostName`, `checkInDate` |
| `agreement-pending` | Twice-daily reminder job (10:00 UTC morning, 22:00 UTC evening) for pending stays where host or guest agreement is unsigned | `recipientRole`, `stayName`, `stayId`, `hostName`, `guestName`, `termsUrl`, `rate`, `rateCents`, `cadence`, `version`, `detail`, `action` |
| `payment-due-reminder` | Daily reminder job across progressive payment stages (upcoming, due today, grace overdue, grace final warning, compounding late fee assessed, and critical delinquency); repeats on schedule until paid in full; fully paid obligations (`balanceCents <= 0`) are omitted | `stayName`, `amountDue`, `periodLabel`, `dueDate`, `balance`, `urgencyLevel`, `stage`, `stageTitle`, `warningMessage`, `consequences`, `actionRequired`, `daysOverdue`, `graceEndDate`, `lateFeeCents` |
| `chore-reminder` | Daily reminder job, on the chore's due date in that stay's timezone | `choreTitle`, `dueDate` |
| `adhoc-fee-posted` | Host creates a one-off charge | `hostName`, `feeTitle`, `amount`, `dueDate` |

All amounts are integer cents. Templates must format them as currency. The invitation is an email to the address the host entered; other workflows target the Kouchd user record.

### Workflow cancellation keys

Workflows with scheduled or repeating reminders use stable cancellation keys:
- `agreement-pending`:
  - Guest reminder: `agreement-pending:${stayId}:${guestUserId}`
  - Host reminder for specific guest: `agreement-pending:${stayId}:${hostUserId}:${guestUserId}`
  - Host reminder (host unsigned): `agreement-pending:${stayId}:${hostUserId}`
  - Reminders are automatically cancelled when the recipient or guest accepts the terms via `acceptCurrent`.


## Channels and consent

- Email preference defaults to enabled; SMS defaults to disabled.
- SMS is enabled only after an explicit opt-in with a valid E.164 number. Kouchd stores an append-only opt-in/opt-out event with its source and consent version.
- An in-app opt-out schedules a Knock preference update. Provider STOP handling and suppression must also be configured and verified in Knock's SMS provider; the app has no inbound STOP webhook.
- The code records when Knock accepts a workflow trigger. This is not proof of downstream email or SMS delivery.
- A Knock in-app notification inbox is not part of this setup; the configured workflows use email and SMS preferences.

## Verification checklist

Before enabling a production channel, verify each workflow key and payload mapping in Knock, confirm its email/SMS channels and providers, then send a test event to a controlled test recipient. Check the Knock workflow run and the recipient outcome separately. Confirm SMS opt-out behavior with the configured provider. Never test with an uninvolved household member or broadcast to a real audience.
