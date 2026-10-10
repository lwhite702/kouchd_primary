export type StayStatus = "pending" | "active" | "ended";

export interface RetainedStay<TAgreement, TContribution, TChore> {
  status: StayStatus;
  agreement: TAgreement;
  contributions: TContribution[];
  chores: TChore[];
  endedAt?: string;
}

export function endStay<TAgreement, TContribution, TChore>(
  stay: RetainedStay<TAgreement, TContribution, TChore>,
  endedAt: string,
): RetainedStay<TAgreement, TContribution, TChore> {
  if (stay.status === "ended") return stay;
  return { ...stay, status: "ended", endedAt };
}
