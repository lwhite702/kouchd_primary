const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_256_HEX = /^[a-f0-9]{64}$/i;

const MAX_MONEY_CENTS = 100_000_000;
const MAX_RULE_DAYS = 365;
const MAX_STAY_DAYS = 730;
const MAX_HOUSE_NOTES_LENGTH = 5_000;
const MAX_ENTRY_NOTE_LENGTH = 2_000;
const MAX_CHORE_TITLE_LENGTH = 160;
const MAX_ANNOUNCEMENT_TITLE_LENGTH = 160;
const E164_PHONE = /^\+[1-9]\d{7,14}$/;
const MAX_INVITE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;
const PAYMENT_PROVIDERS = new Set(["paypal", "cashapp", "zelle", "applepay"]);

export type StayTermsInput = {
  startDate: string;
  endDate: string;
  cadence: "daily" | "weekly";
  rateCents: number;
  earlyDiscountEnabled: boolean;
  earlyDiscountPercentage: number;
  earlyDiscountDays: number;
  lateFeeEnabled: boolean;
  lateFeeCents: number;
  graceDays: number;
  houseNotes: string;
  houseRules?: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    required: boolean;
  }>;
  rewards?: {
    enabled: boolean;
    coinName: string;
    centsPerPoint: number;
    maxCreditPerPeriodCents: number;
  };
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

  if (!terms.earlyDiscountEnabled && (terms.earlyDiscountPercentage !== 0 || terms.earlyDiscountDays !== 0)) {
    throw new Error("Disabled early discounts must use zero values");
  }
  if (!terms.lateFeeEnabled && (terms.lateFeeCents !== 0 || terms.graceDays !== 0)) {
    throw new Error("Disabled late fees must use zero values");
  }

  if (terms.houseNotes.length > MAX_HOUSE_NOTES_LENGTH) {
    throw new Error(`House notes must be ${MAX_HOUSE_NOTES_LENGTH} characters or fewer`);
  }

  if (terms.houseRules) {
    if (!Array.isArray(terms.houseRules) || terms.houseRules.length > 50) {
      throw new Error("House rules must contain 50 or fewer items");
    }
    for (const rule of terms.houseRules) {
      if (!rule.title.trim() || rule.title.length > 160) {
        throw new Error("Each house rule title must be between 1 and 160 characters");
      }
      if (rule.description.length > 1_000) {
        throw new Error("Each house rule description must be 1,000 characters or fewer");
      }
    }
  }

  if (terms.rewards) {
    if (terms.rewards.enabled) {
      assertIntegerInRange(terms.rewards.centsPerPoint, 1, 100_000, "Cents per point");
      assertIntegerInRange(terms.rewards.maxCreditPerPeriodCents, 0, MAX_MONEY_CENTS, "Max reward credit per period");
      if (!terms.rewards.coinName.trim() || terms.rewards.coinName.length > 30) {
        throw new Error("Coin name must be between 1 and 30 characters");
      }
    }
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

export function assertAdhocChargeInput(title: string, amountCents: number, effectiveDate: string, dueDate: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > MAX_CHORE_TITLE_LENGTH) {
    throw new Error(`Charge title must be between 1 and ${MAX_CHORE_TITLE_LENGTH} characters`);
  }
  assertIntegerInRange(amountCents, 1, MAX_MONEY_CENTS, "Charge amount");
  assertCalendarDate(effectiveDate, "Charge date");
  assertCalendarDate(dueDate, "Charge due date");
  if (dueDate < effectiveDate) throw new Error("Charge due date cannot be before its effective date");
}

export function assertAnnouncementInput(title: string, body: string, pinnedUntil?: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > MAX_ANNOUNCEMENT_TITLE_LENGTH) {
    throw new Error(`Announcement title must be between 1 and ${MAX_ANNOUNCEMENT_TITLE_LENGTH} characters`);
  }
  if (!body.trim() || body.length > MAX_ENTRY_NOTE_LENGTH) {
    throw new Error(`Announcement body must be between 1 and ${MAX_ENTRY_NOTE_LENGTH} characters`);
  }
  if (pinnedUntil) assertCalendarDate(pinnedUntil, "Pinned-until date");
}

export function assertPhone(phone?: string) {
  if (phone && !E164_PHONE.test(phone)) throw new Error("Phone number must use E.164 format, such as +15551234567");
}

export function assertReferralCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (!clean || clean.length > 32) {
    throw new Error("Referral code is required and must be 32 characters or fewer");
  }
}

export function assertContributionRuleInput(title: string, pointsAwarded: number, description: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 160) {
    throw new Error("Contribution rule title must be between 1 and 160 characters");
  }
  assertIntegerInRange(pointsAwarded, 1, 10_000, "Points awarded");
  if (description.length > 1_000) {
    throw new Error("Contribution rule description must be 1,000 characters or fewer");
  }
}

export function assertPointClaimInput(title: string, points: number, note: string, date: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 160) {
    throw new Error("Claim title must be between 1 and 160 characters");
  }
  assertIntegerInRange(points, 1, 10_000, "Points");
  assertCalendarDate(date, "Claim date");
  if (note.length > MAX_ENTRY_NOTE_LENGTH) {
    throw new Error(`Claim note must be ${MAX_ENTRY_NOTE_LENGTH} characters or fewer`);
  }
}

export type HouseInfoInput = {
  wifiNetwork?: string;
  wifiPassword?: string;
  streetAddress?: string;
  unit?: string;
  cityStateZip?: string;
  doorCode?: string;
  parkingNotes?: string;
  trashDay?: string;
  emergencyContact?: string;
  otherNotes?: string;
};

export function assertHouseInfoInput(info: HouseInfoInput) {
  if (info.wifiNetwork && info.wifiNetwork.length > 100) throw new Error("WiFi network name must be 100 characters or fewer");
  if (info.wifiPassword && info.wifiPassword.length > 100) throw new Error("WiFi password must be 100 characters or fewer");
  if (info.streetAddress && info.streetAddress.length > 200) throw new Error("Street address must be 200 characters or fewer");
  if (info.unit && info.unit.length > 50) throw new Error("Unit/Apt must be 50 characters or fewer");
  if (info.cityStateZip && info.cityStateZip.length > 100) throw new Error("City, state, zip must be 100 characters or fewer");
  if (info.doorCode && info.doorCode.length > 100) throw new Error("Door/gate code must be 100 characters or fewer");
  if (info.parkingNotes && info.parkingNotes.length > 1000) throw new Error("Parking notes must be 1,000 characters or fewer");
  if (info.trashDay && info.trashDay.length > 200) throw new Error("Trash schedule must be 200 characters or fewer");
  if (info.emergencyContact && info.emergencyContact.length > 300) throw new Error("Emergency contact must be 300 characters or fewer");
  if (info.otherNotes && info.otherNotes.length > 2000) throw new Error("House notes must be 2,000 characters or fewer");
}

export type PaymentOptionInput = { provider: "paypal" | "cashapp" | "zelle" | "applepay"; detail: string };

export function assertPaymentOptionsInput(options: PaymentOptionInput[]) {
  if (!Array.isArray(options) || options.length > PAYMENT_PROVIDERS.size) {
    throw new Error("Choose up to four household payment options");
  }
  const seen = new Set<string>();
  for (const option of options) {
    if (!PAYMENT_PROVIDERS.has(option.provider)) throw new Error("Unsupported payment option");
    if (seen.has(option.provider)) throw new Error("Each payment option can be added only once");
    seen.add(option.provider);
    const detail = option.detail.trim();
    if (!detail || detail.length > 250) throw new Error("Payment details must be between 1 and 250 characters");
    if (/^[a-z][a-z0-9+.-]*:/i.test(detail)) {
      let url: URL;
      try {
        url = new URL(detail);
      } catch {
        throw new Error("Payment links must be valid HTTPS URLs");
      }
      if (url.protocol !== "https:") throw new Error("Payment links must use HTTPS");
    }
  }
}
