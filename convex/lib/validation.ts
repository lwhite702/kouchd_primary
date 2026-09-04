const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_256_HEX = /^[a-f0-9]{64}$/i;

const MAX_MONEY_CENTS = 100_000_000;
const MAX_RULE_DAYS = 365;
const MAX_STAY_DAYS = 730;
const MAX_HOUSE_NOTES_LENGTH = 5_000;
const MAX_ENTRY_NOTE_LENGTH = 2_000;
const MAX_CHORE_TITLE_LENGTH = 160;
const MAX_INVITE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

export type StayTermsInput = {
  startDate: string;
  endDate: string;
  cadence: "daily" | "weekly";
  rateCents: number;
  earlyDiscountPercentage: number;
  earlyDiscountDays: number;
  lateFeeCents: number;
  graceDays: number;
  houseNotes: string;
};

export function assertCalendarDate(value: string, label = "Date") {
  if (!CALENDAR_DATE.test(value)) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format`);
  }
}

function assertIntegerInRange(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}`);
  }
}

export function assertTimezone(timezone: string) {
  if (!timezone.trim() || timezone.length > 100) throw new Error("Timezone is required");

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error("Timezone must be a valid IANA timezone");
  }
}

export function assertStayTerms(terms: StayTermsInput) {
  assertCalendarDate(terms.startDate, "Start date");
  assertCalendarDate(terms.endDate, "End date");
  if (terms.endDate < terms.startDate) throw new Error("End date must be on or after start date");
  const stayLength = Math.floor((Date.parse(`${terms.endDate}T00:00:00.000Z`) - Date.parse(`${terms.startDate}T00:00:00.000Z`)) / 86_400_000) + 1;
  if (stayLength > MAX_STAY_DAYS) throw new Error(`Stay length cannot exceed ${MAX_STAY_DAYS} days`);

  assertIntegerInRange(terms.rateCents, 0, MAX_MONEY_CENTS, "Rate");
  assertIntegerInRange(terms.earlyDiscountPercentage, 0, 100, "Early discount percentage");
  assertIntegerInRange(terms.earlyDiscountDays, 0, MAX_RULE_DAYS, "Early discount days");
  assertIntegerInRange(terms.lateFeeCents, 0, MAX_MONEY_CENTS, "Late fee");
  assertIntegerInRange(terms.graceDays, 0, MAX_RULE_DAYS, "Grace days");

  if (terms.houseNotes.length > MAX_HOUSE_NOTES_LENGTH) {
    throw new Error(`House notes must be ${MAX_HOUSE_NOTES_LENGTH} characters or fewer`);
  }
}

export function assertInvite(tokenHash: string, expiresAt: number, now = Date.now()) {
  assertInviteHash(tokenHash);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error("Invite expiry must be in the future");
  if (expiresAt > now + MAX_INVITE_LIFETIME_MS) throw new Error("Invite expiry cannot be more than 30 days away");
}

export function assertInviteHash(tokenHash: string) {
  if (!SHA_256_HEX.test(tokenHash)) throw new Error("Secure invite hash must be a 64-character SHA-256 value");
}

export function assertContributionInput(amountCents: number, date: string, note: string) {
  assertIntegerInRange(amountCents, 1, MAX_MONEY_CENTS, "Amount");
  assertCalendarDate(date, "Contribution date");
  if (note.length > MAX_ENTRY_NOTE_LENGTH) throw new Error(`Contribution note must be ${MAX_ENTRY_NOTE_LENGTH} characters or fewer`);
}

export function assertChoreInput(title: string, note: string, dueDate: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > MAX_CHORE_TITLE_LENGTH) {
    throw new Error(`Chore title must be between 1 and ${MAX_CHORE_TITLE_LENGTH} characters`);
  }
  if (note.length > MAX_ENTRY_NOTE_LENGTH) throw new Error(`Chore note must be ${MAX_ENTRY_NOTE_LENGTH} characters or fewer`);
  assertCalendarDate(dueDate, "Chore due date");
}
