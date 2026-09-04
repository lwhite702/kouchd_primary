import { addCalendarDays, stayDays } from "./dates";
import type { Cadence } from "./pricing";

export interface ObligationTerms {
  startDate: string;
  endDate: string;
  cadence: Cadence;
  rateCents: number;
  earlyDiscountPercentage: number;
  earlyDiscountDays: number;
  lateFeeCents: number;
  graceDays: number;
}

export interface ObligationPeriod {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  baseAmountCents: number;
}

export interface ObligationRecord extends ObligationPeriod {
  _id?: string;
  lateFeeWaived?: boolean;
}

export interface AllocatableContribution {
  amountCents: number;
  date: string;
}

export type ObligationStatus = "upcoming" | "due" | "late" | "paid";

export interface ObligationLedgerItem extends ObligationRecord {
  earlyDiscountCents: number;
  lateFeeCents: number;
  effectiveChargeCents: number;
  creditedCents: number;
  balanceCents: number;
  status: ObligationStatus;
}

export function buildObligationPeriods(terms: ObligationTerms): ObligationPeriod[] {
  const periods: ObligationPeriod[] = [];
  let periodStart = terms.startDate;

  while (periodStart <= terms.endDate) {
    const proposedEnd = terms.cadence === "weekly" ? addCalendarDays(periodStart, 6) : periodStart;
    const periodEnd = proposedEnd < terms.endDate ? proposedEnd : terms.endDate;
    const periodDays = stayDays(periodStart, periodEnd);
    periods.push({
      periodStart,
      periodEnd,
      dueDate: periodEnd,
      baseAmountCents: terms.cadence === "weekly"
        ? Math.round((periodDays * terms.rateCents) / 7)
        : terms.rateCents,
    });
    periodStart = addCalendarDays(periodEnd, 1);
  }

  return periods;
}

export function calculateObligationLedger({
  obligations,
  contributions,
  asOfDate,
  terms,
}: {
  obligations: ObligationRecord[];
  contributions: AllocatableContribution[];
  asOfDate: string;
  terms: ObligationTerms;
}): ObligationLedgerItem[] {
  const creditLots = contributions
    .filter((entry) => entry.amountCents > 0 && entry.date <= asOfDate)
    .map((entry, index) => ({ ...entry, index, remainingCents: entry.amountCents }))
    .sort((left, right) => left.date.localeCompare(right.date) || left.index - right.index);

  return [...obligations]
    .sort((left, right) => left.periodStart.localeCompare(right.periodStart))
    .map((obligation) => {
      const earlyThreshold = addCalendarDays(obligation.dueDate, -terms.earlyDiscountDays);
      const availableByEarlyThreshold = creditLots
        .filter((credit) => credit.date <= earlyThreshold)
        .reduce((total, credit) => total + credit.remainingCents, 0);
      const discountAmount = Math.round(
        (obligation.baseAmountCents * terms.earlyDiscountPercentage) / 100,
      );
      const discountedCharge = obligation.baseAmountCents - discountAmount;
      const qualifiesForEarlyDiscount = terms.earlyDiscountPercentage > 0
        && availableByEarlyThreshold >= discountedCharge;
      const earlyDiscountCents = qualifiesForEarlyDiscount ? -discountAmount : 0;
      const chargeBeforeLateFee = obligation.baseAmountCents + earlyDiscountCents;

      const graceEnd = addCalendarDays(obligation.dueDate, terms.graceDays);
      const availableByGraceEnd = creditLots
        .filter((credit) => credit.date <= graceEnd)
        .reduce((total, credit) => total + credit.remainingCents, 0);
      const isPastGrace = asOfDate > graceEnd;
      const lateFeeCents = isPastGrace
        && availableByGraceEnd < chargeBeforeLateFee
        && !obligation.lateFeeWaived
        ? terms.lateFeeCents
        : 0;
      const effectiveChargeCents = chargeBeforeLateFee + lateFeeCents;

      let remainingCharge = effectiveChargeCents;
      for (const credit of creditLots) {
        if (remainingCharge === 0) break;
        const applied = Math.min(credit.remainingCents, remainingCharge);
        credit.remainingCents -= applied;
        remainingCharge -= applied;
      }

      const creditedCents = effectiveChargeCents - remainingCharge;
      const status: ObligationStatus = remainingCharge === 0
        ? "paid"
        : isPastGrace
          ? "late"
          : asOfDate >= obligation.dueDate
            ? "due"
            : "upcoming";

      return {
        ...obligation,
        earlyDiscountCents,
        lateFeeCents,
        effectiveChargeCents,
        creditedCents,
        balanceCents: remainingCharge,
        status,
      };
    });
}
