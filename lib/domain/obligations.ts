import { addCalendarDays, stayDays } from "./dates";
import type { Cadence } from "./pricing";

export interface ObligationTerms {
  startDate: string;
  endDate: string;
  cadence: Cadence;
  rateCents: number;
  earlyDiscountEnabled?: boolean;
  earlyDiscountPercentage: number;
  earlyDiscountDays: number;
  lateFeeEnabled?: boolean;
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
  type?: "cadence" | "adhoc";
  title?: string;
  lateFeeWaived?: boolean;
  voided?: boolean;
}

export interface AllocatableContribution {
  amountCents: number;
  date: string;
}

export type ObligationStatus = "upcoming" | "due" | "late" | "paid";

export interface ObligationLedgerItem extends ObligationRecord {
  earlyDiscountCents: number;
  lateFeeCents: number;
  lateFeeOccurrences: number;
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

  const discountEnabled = terms.earlyDiscountEnabled ?? terms.earlyDiscountPercentage > 0;
  const lateFeeEnabled = terms.lateFeeEnabled ?? terms.lateFeeCents > 0;

  return [...obligations]
    .filter((obligation) => !obligation.voided)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.periodStart.localeCompare(right.periodStart))
    .map((obligation) => {
      const earlyThreshold = addCalendarDays(obligation.dueDate, -terms.earlyDiscountDays);
      const availableByEarlyThreshold = creditLots
        .filter((credit) => credit.date <= earlyThreshold)
        .reduce((total, credit) => total + credit.remainingCents, 0);
      const discountAmount = Math.round(
        (obligation.baseAmountCents * terms.earlyDiscountPercentage) / 100,
      );
      const discountedCharge = obligation.baseAmountCents - discountAmount;
      const qualifiesForEarlyDiscount = (obligation.type ?? "cadence") === "cadence"
        && discountEnabled
        && terms.earlyDiscountPercentage > 0
        && availableByEarlyThreshold >= discountedCharge;
      const earlyDiscountCents = qualifiesForEarlyDiscount ? -discountAmount : 0;
      const chargeBeforeLateFee = obligation.baseAmountCents + earlyDiscountCents;

      const graceEnd = addCalendarDays(obligation.dueDate, terms.graceDays);
      const isPastGrace = asOfDate > graceEnd;
      let remainingCharge = chargeBeforeLateFee;
      let creditedCents = 0;
      let lateFeeOccurrences = 0;

      const applyCreditsThrough = (cutoff: string) => {
        for (const credit of creditLots) {
          if (remainingCharge === 0) break;
          if (credit.date > cutoff) continue;
          const applied = Math.min(credit.remainingCents, remainingCharge);
          credit.remainingCents -= applied;
          remainingCharge -= applied;
          creditedCents += applied;
        }
      };

      if (isPastGrace && lateFeeEnabled && terms.lateFeeCents > 0 && !obligation.lateFeeWaived) {
        let assessmentDate = addCalendarDays(graceEnd, 1);
        while (assessmentDate <= asOfDate) {
          applyCreditsThrough(assessmentDate);
          if (remainingCharge === 0) break;
          remainingCharge += terms.lateFeeCents;
          lateFeeOccurrences += 1;
          assessmentDate = addCalendarDays(assessmentDate, 7);
        }
      }

      applyCreditsThrough(asOfDate);

      const lateFeeCents = lateFeeOccurrences * terms.lateFeeCents;
      const effectiveChargeCents = chargeBeforeLateFee + lateFeeCents;
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
        lateFeeOccurrences,
        effectiveChargeCents,
        creditedCents,
        balanceCents: remainingCharge,
        status,
      };
    });
}
