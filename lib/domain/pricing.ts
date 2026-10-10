import { stayDays } from "./dates";

export type Cadence = "daily" | "weekly";
export type ContributionStatus = "pending" | "confirmed" | "disputed" | "voided";

export interface ContributionCredit {
  amountCents: number;
  countsTowardBalance: boolean;
  status: ContributionStatus;
}

export function calculateStayChargeCents({
  startDate,
  endDate,
  cadence,
  rateCents,
}: {
  startDate: string;
  endDate: string;
  cadence: Cadence;
  rateCents: number;
}): number {
  const days = stayDays(startDate, endDate);
  return cadence === "weekly" ? Math.round((days * rateCents) / 7) : days * rateCents;
}

export function confirmedCreditCents(contributions: ContributionCredit[]): number {
  return contributions
    .filter((entry) => entry.status === "confirmed" && entry.countsTowardBalance)
    .reduce((total, entry) => total + entry.amountCents, 0);
}

export function balanceCents({
  chargeCents,
  contributions,
  adjustmentsCents = 0,
}: {
  chargeCents: number;
  contributions: ContributionCredit[];
  adjustmentsCents?: number;
}): number {
  return chargeCents + adjustmentsCents - confirmedCreditCents(contributions);
}

export function earlyDiscountCents(amountCents: number, percentage: number): number {
  return -Math.round((amountCents * percentage) / 100);
}
