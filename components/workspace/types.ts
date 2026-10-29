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
  | "householdTerms"
  | "stayName"
  | null;

/** Actions that need an explicit confirmation; voided records keep their history. */
export type DestructiveAction =
  | { type: "end" }
  | { type: "cancelCharge"; obligationId: Id<"obligations">; title: string }
  | {
      type: "voidContribution";
      contributionId: Id<"contributions">;
      title: string;
    }
  | { type: "voidChore"; choreId: Id<"chores">; title: string }
  | { type: "voidClaim"; claimId: Id<"pointClaims">; title: string }
  | { type: "regenerateCode" };

const VOID_DESCRIPTION =
  "The record stays in the history but no longer counts toward the balance or current activity.";

export function destructiveActionCopy(action: DestructiveAction): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  switch (action.type) {
    case "end":
      return {
        title: "End this stay?",
        description:
          "Guests will no longer be able to add to this stay. Its agreements and history will remain available under Past stays, and you can start another stay.",
        confirmLabel: "End stay",
      };
    case "cancelCharge":
      return {
        title: `Cancel “${action.title}”?`,
        description: `This removes “${action.title}” from the guest’s balance. The charge history will be retained.`,
        confirmLabel: "Cancel charge",
      };
    case "voidContribution":
    case "voidChore":
    case "voidClaim":
      return {
        title: `Void “${action.title}”?`,
        description: VOID_DESCRIPTION,
        confirmLabel: "Void record",
      };
    case "regenerateCode":
      return {
        title: "Create a new join code?",
        description:
          "The current code stops working right away. Anyone who hasn’t joined yet will need the new code. People already in the stay aren’t affected.",
        confirmLabel: "Create new code",
      };
  }
}

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
