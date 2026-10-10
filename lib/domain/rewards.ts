export interface SuggestedContributionTask {
  id: string;
  category: "cleaning" | "groceries" | "maintenance" | "cooking" | "care" | "other";
  title: string;
  description: string;
  defaultPoints: number;
}

export const SUGGESTED_CONTRIBUTION_TASKS: SuggestedContributionTask[] = [
  {
    id: "clean_kitchen_deep",
    category: "cleaning",
    title: "Deep clean kitchen & wipe down stovetop/oven",
    description: "Full counter degreasing, clean microwave inside/out, stovetop scrub, and empty kitchen trash.",
    defaultPoints: 25,
  },
  {
    id: "clean_bathroom_scrub",
    category: "cleaning",
    title: "Scrub shared bathroom & restock amenities",
    description: "Disinfect sink, mirror, toilet, scrub shower stall/tub, and empty wastebasket.",
    defaultPoints: 30,
  },
  {
    id: "maint_yard_lawn",
    category: "maintenance",
    title: "Mow lawn, rake leaves, or shovel walkway snow",
    description: "Seasonal outdoor maintenance to keep entryways and yard neat and safe.",
    defaultPoints: 40,
  },
  {
    id: "groceries_pantry_run",
    category: "groceries",
    title: "Communal pantry & supply run",
    description: "Purchase and restock household shared essentials (dish soap, spices, cooking oil, toilet paper, paper towels).",
    defaultPoints: 20,
  },
  {
    id: "cooking_shared_dinner",
    category: "cooking",
    title: "Cook shared household dinner for housemates",
    description: "Prepare a warm communal dinner for the household and tidy cooking prep pots.",
    defaultPoints: 35,
  },
  {
    id: "trash_curb_duty",
    category: "cleaning",
    title: "Trash & recycling bins to curb and back",
    description: "Roll bins out on collection night and return them to storage next morning.",
    defaultPoints: 15,
  },
  {
    id: "care_pets_plants",
    category: "care",
    title: "Pet sitting, dog walking, or indoor plant watering",
    description: "Care for household pets or water all house plants while host is away or working.",
    defaultPoints: 25,
  },
];

export function pointsToCents(points: number, centsPerPoint: number): number {
  if (points <= 0 || centsPerPoint <= 0) return 0;
  return Math.round(points * centsPerPoint);
}

export function centsToPoints(cents: number, centsPerPoint: number): number {
  if (cents <= 0 || centsPerPoint <= 0) return 0;
  return Math.floor(cents / centsPerPoint);
}

export function calculateMaxRedeemablePoints({
  availablePoints,
  centsPerPoint,
  maxCreditPerPeriodCents,
  periodRedeemedCents = 0,
  currentBalanceCents,
}: {
  availablePoints: number;
  centsPerPoint: number;
  maxCreditPerPeriodCents?: number;
  periodRedeemedCents?: number;
  currentBalanceCents: number;
}): {
  maxPoints: number;
  maxCents: number;
} {
  if (availablePoints <= 0 || centsPerPoint <= 0 || currentBalanceCents <= 0) {
    return { maxPoints: 0, maxCents: 0 };
  }

  // Value available in wallet
  let allowedCents = pointsToCents(availablePoints, centsPerPoint);

  // Capped by stay balance owed
  allowedCents = Math.min(allowedCents, currentBalanceCents);

  // Capped by host's max credit allowance per period
  if (maxCreditPerPeriodCents && maxCreditPerPeriodCents > 0) {
    const remainingAllowance = Math.max(0, maxCreditPerPeriodCents - periodRedeemedCents);
    allowedCents = Math.min(allowedCents, remainingAllowance);
  }

  const maxPoints = centsToPoints(allowedCents, centsPerPoint);
  const maxCents = pointsToCents(maxPoints, centsPerPoint);

  return { maxPoints, maxCents };
}
