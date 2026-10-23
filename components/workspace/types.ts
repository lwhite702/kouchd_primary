import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { GuideRole } from "@/components/onboarding/guided-tour";

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export type Member = {
  membership: Doc<"memberships">;
  person: {
    id: Id<"users">;
    name: string;
    imageUrl?: string;
    email?: string;
    phone?: string;
  };
  terms?: Doc<"terms"> | null;
  agreementOffer?: Doc<"agreementOffers"> | null;
};

export type StayBundle = {
  stay: Doc<"stays">;
  terms: Doc<"terms"> | null;
  membership: Doc<"memberships">;
  members: Member[];
};

export type LedgerItem = {
  _id: Id<"obligations">;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  baseAmountCents: number;
  type: "cadence" | "adhoc" | "occupancy";
  title?: string;
  earlyDiscountCents: number;
  lateFeeCents: number;
  lateFeeOccurrences: number;
  effectiveChargeCents: number;
  creditedCents: number;
  balanceCents: number;
  status: "upcoming" | "due" | "late" | "paid";
  lateFeeWaived: boolean;
};

export type Screen =
  "home" | "contributions" | "chores" | "shopping" | "checkins" | "stay";

export function activityScreen(kind: string): Screen {
  if (["contribution", "obligation", "reward"].includes(kind))
    return "contributions";
  if (kind === "shopping") return "shopping";
  if (kind === "check_in") return "checkins";
  if (kind === "chore") return "chores";
  if (kind === "announcement") return "home";
  return "stay";
}

export type Panel =
  | "contribution"
  | "chore"
  | "adhoc"
  | "announcement"
  | "settings"
  | "invite"
  | "houseInfo"
  | "paymentOptions"
  | "guestTerms"
  | null;

export type GuideProgressState = {
  step: number;
  status: "in_progress" | "completed" | "skipped";
};

export type GuideProgress = Partial<Record<GuideRole, GuideProgressState>>;

export type Viewer = {
  id: Id<"users">;
  name: string;
  email?: string;
  phone?: string;
  notifyEmail: boolean;
  notifySms: boolean;
  guideProgress?: GuideProgress;
};

export function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function formatDate(value: string) {
  return date.format(new Date(`${value}T00:00:00Z`));
}

export function value(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export type StayMembershipSummary = {
  stay: Doc<"stays">;
  membership: Doc<"memberships">;
};
