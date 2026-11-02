import { parseCalendarDate, stayDays } from "./dates";

export const BILL_CATEGORIES = [
  "electricity",
  "water",
  "gas",
  "internet",
  "trash",
  "other",
] as const;

export type BillCategory = (typeof BILL_CATEGORIES)[number];

export const BILL_SPLIT_METHODS = ["equal", "percentage", "fixed"] as const;

export type BillSplitMethod = (typeof BILL_SPLIT_METHODS)[number];

export interface BillGuestParticipantInput {
  guestUserId: string;
  joinedAt: number;
  stayStartDate: string;
  stayEndDate: string;
  input?: number;
}

export interface BillSplitCalculationInput {
  totalCents: number;
  serviceStart: string;
  serviceEnd: string;
  splitMethod: BillSplitMethod;
  includeHost: boolean;
  prorateByStayDates: boolean;
  guests: BillGuestParticipantInput[];
}

export interface CalculatedGuestShare {
  guestUserId: string;
  input?: number;
  prorationDays?: number;
  amountCents: number;
}

const MAX_BILL_TOTAL_CENTS = 100_000_000;
const PERCENTAGE_TOLERANCE = 0.01;
const REMAINDER_EPSILON = 1e-9;

export function overlapStayDays(
  serviceStart: string,
  serviceEnd: string,
  stayStartDate: string,
  stayEndDate: string,
): number {
  const serviceStartMs = parseCalendarDate(serviceStart);
  const serviceEndMs = parseCalendarDate(serviceEnd);
  const stayStartMs = parseCalendarDate(stayStartDate);
  const stayEndMs = parseCalendarDate(stayEndDate);

  if (serviceEndMs < serviceStartMs || stayEndMs < stayStartMs) {
    return 0;
  }

  const overlapStart = serviceStartMs >= stayStartMs ? serviceStart : stayStartDate;
  const overlapEnd = serviceEndMs <= stayEndMs ? serviceEnd : stayEndDate;
  return stayDays(overlapStart, overlapEnd);
}

interface ParticipantShareCandidate {
  id: string;
  isHost: boolean;
  guestUserId?: string;
  joinedAt: number;
  input?: number;
  prorationDays?: number;
  rawCents: number;
  floorCents: number;
  remainder: number;
}

function allocateLargestRemainder(
  candidates: ParticipantShareCandidate[],
  targetTotalCents: number,
): Map<string, number> {
  const floorSum = candidates.reduce((sum, c) => sum + c.floorCents, 0);
  const leftoverCents = Math.max(0, Math.min(candidates.length, targetTotalCents - floorSum));

  const ranked = [...candidates].sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > REMAINDER_EPSILON) {
      return b.remainder - a.remainder;
    }
    if (a.joinedAt !== b.joinedAt) {
      return a.joinedAt - b.joinedAt;
    }
    return a.id.localeCompare(b.id);
  });

  const bonusIds = new Set(ranked.slice(0, leftoverCents).map((c) => c.id));
  const result = new Map<string, number>();
  for (const candidate of candidates) {
    result.set(candidate.id, candidate.floorCents + (bonusIds.has(candidate.id) ? 1 : 0));
  }
  return result;
}

export function calculateBillShares(input: BillSplitCalculationInput): CalculatedGuestShare[] {
  const {
    totalCents,
    serviceStart,
    serviceEnd,
    splitMethod,
    includeHost,
    prorateByStayDates,
    guests,
  } = input;

  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents <= 0 ||
    totalCents > MAX_BILL_TOTAL_CENTS
  ) {
    throw new Error("Bill total must be a positive whole-cent amount up to $1,000,000.00.");
  }

  const serviceStartMs = parseCalendarDate(serviceStart);
  const serviceEndMs = parseCalendarDate(serviceEnd);
  if (serviceEndMs < serviceStartMs) {
    throw new Error("Bill service end date cannot be before the service start date.");
  }
  const serviceDays = stayDays(serviceStart, serviceEnd);
  if (serviceDays <= 0) {
    throw new Error("Bill service window must cover at least one day.");
  }

  if (!Array.isArray(guests) || guests.length === 0) {
    throw new Error("Select at least one guest to split this bill.");
  }

  const seenGuests = new Set<string>();
  for (const guest of guests) {
    if (!guest.guestUserId || typeof guest.guestUserId !== "string") {
      throw new Error("Each bill participant must have a valid guest user ID.");
    }
    if (seenGuests.has(guest.guestUserId)) {
      throw new Error(`Duplicate guest participant: ${guest.guestUserId}`);
    }
    seenGuests.add(guest.guestUserId);
    if (!Number.isFinite(guest.joinedAt)) {
      throw new Error(`Invalid joinedAt timestamp for guest ${guest.guestUserId}.`);
    }
    const stayStartMs = parseCalendarDate(guest.stayStartDate);
    const stayEndMs = parseCalendarDate(guest.stayEndDate);
    if (stayEndMs < stayStartMs) {
      throw new Error(`Invalid stay dates for guest ${guest.guestUserId}.`);
    }
  }

  // Sort guests deterministically by joinedAt ascending, then guestUserId lexical order
  const sortedGuests = [...guests].sort((a, b) => {
    if (a.joinedAt !== b.joinedAt) {
      return a.joinedAt - b.joinedAt;
    }
    return a.guestUserId.localeCompare(b.guestUserId);
  });

  if (splitMethod === "fixed") {
    let fixedSum = 0;
    for (const guest of sortedGuests) {
      if (
        typeof guest.input !== "number" ||
        !Number.isSafeInteger(guest.input) ||
        guest.input <= 0
      ) {
        throw new Error("Each fixed share must be a positive whole-cent amount.");
      }
      fixedSum += guest.input;
    }
    if (fixedSum > totalCents) {
      throw new Error("Guest fixed shares cannot total more than the bill.");
    }

    return sortedGuests.map((guest) => {
      const baseCents = guest.input!;
      if (!prorateByStayDates) {
        return {
          guestUserId: guest.guestUserId,
          input: baseCents,
          amountCents: baseCents,
        };
      }
      const prorationDays = overlapStayDays(
        serviceStart,
        serviceEnd,
        guest.stayStartDate,
        guest.stayEndDate,
      );
      const amountCents = Math.round((baseCents * prorationDays) / serviceDays);
      return {
        guestUserId: guest.guestUserId,
        input: baseCents,
        prorationDays,
        amountCents,
      };
    });
  }

  if (splitMethod === "percentage") {
    let percentageSum = 0;
    for (const guest of sortedGuests) {
      if (
        typeof guest.input !== "number" ||
        !Number.isFinite(guest.input) ||
        guest.input <= 0 ||
        guest.input > 100
      ) {
        throw new Error("Each guest percentage must be between 0 and 100.");
      }
      percentageSum += guest.input;
    }

    if (!includeHost) {
      if (Math.abs(percentageSum - 100) > PERCENTAGE_TOLERANCE) {
        throw new Error("When the host is excluded, guest percentages must total 100%.");
      }
    } else if (percentageSum > 100 + PERCENTAGE_TOLERANCE) {
      throw new Error("Guest percentages cannot total more than 100%.");
    }

    const candidates: ParticipantShareCandidate[] = sortedGuests.map((guest) => {
      const rawCents = (totalCents * guest.input!) / 100;
      const floorCents = Math.floor(rawCents + REMAINDER_EPSILON);
      return {
        id: guest.guestUserId,
        isHost: false,
        guestUserId: guest.guestUserId,
        joinedAt: guest.joinedAt,
        input: guest.input,
        rawCents,
        floorCents,
        remainder: Math.max(0, rawCents - floorCents),
      };
    });

    if (includeHost) {
      const hostPercentage = Math.max(0, 100 - percentageSum);
      const rawCents = (totalCents * hostPercentage) / 100;
      const floorCents = Math.floor(rawCents + REMAINDER_EPSILON);
      candidates.push({
        id: "__host__",
        isHost: true,
        joinedAt: -Infinity,
        rawCents,
        floorCents,
        remainder: Math.max(0, rawCents - floorCents),
      });
    }

    const fullPeriodAllocated = allocateLargestRemainder(candidates, totalCents);

    return sortedGuests.map((guest) => {
      const fullShareCents = fullPeriodAllocated.get(guest.guestUserId) ?? 0;
      if (!prorateByStayDates) {
        return {
          guestUserId: guest.guestUserId,
          input: guest.input,
          amountCents: fullShareCents,
        };
      }
      const prorationDays = overlapStayDays(
        serviceStart,
        serviceEnd,
        guest.stayStartDate,
        guest.stayEndDate,
      );
      const amountCents = Math.round((fullShareCents * prorationDays) / serviceDays);
      return {
        guestUserId: guest.guestUserId,
        input: guest.input,
        prorationDays,
        amountCents,
      };
    });
  }

  // splitMethod === "equal"
  const participantCount = sortedGuests.length + (includeHost ? 1 : 0);
  const rawPerParticipant = totalCents / participantCount;
  const floorPerParticipant = Math.floor(rawPerParticipant + REMAINDER_EPSILON);
  const remainderPerParticipant = Math.max(0, rawPerParticipant - floorPerParticipant);

  const candidates: ParticipantShareCandidate[] = sortedGuests.map((guest) => ({
    id: guest.guestUserId,
    isHost: false,
    guestUserId: guest.guestUserId,
    joinedAt: guest.joinedAt,
    rawCents: rawPerParticipant,
    floorCents: floorPerParticipant,
    remainder: remainderPerParticipant,
  }));

  if (includeHost) {
    candidates.push({
      id: "__host__",
      isHost: true,
      joinedAt: -Infinity,
      rawCents: rawPerParticipant,
      floorCents: floorPerParticipant,
      remainder: remainderPerParticipant,
    });
  }

  const fullPeriodAllocated = allocateLargestRemainder(candidates, totalCents);

  return sortedGuests.map((guest) => {
    const fullShareCents = fullPeriodAllocated.get(guest.guestUserId) ?? 0;
    if (!prorateByStayDates) {
      return {
        guestUserId: guest.guestUserId,
        amountCents: fullShareCents,
      };
    }
    const prorationDays = overlapStayDays(
      serviceStart,
      serviceEnd,
      guest.stayStartDate,
      guest.stayEndDate,
    );
    const amountCents = Math.round((fullShareCents * prorationDays) / serviceDays);
    return {
      guestUserId: guest.guestUserId,
      prorationDays,
      amountCents,
    };
  });
}
