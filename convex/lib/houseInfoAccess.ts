import type { Doc } from "../_generated/dataModel";

export function canViewAccessCodes(
  stay: Pick<Doc<"stays">, "status">,
  membership: Pick<Doc<"memberships">, "role" | "acceptedTermsId">,
): boolean {
  if (membership.role === "host") {
    return true;
  }
  return stay.status !== "ended" && Boolean(membership.acceptedTermsId);
}

export function redactStayForMember<
  T extends Pick<Doc<"stays">, "status" | "houseInfo">,
>(
  stay: T,
  membership: Pick<Doc<"memberships">, "role" | "acceptedTermsId">,
): T {
  if (canViewAccessCodes(stay, membership) || !stay.houseInfo) {
    return stay;
  }
  const nextHouseInfo = { ...stay.houseInfo };
  delete nextHouseInfo.doorCode;
  delete nextHouseInfo.wifiPassword;
  return {
    ...stay,
    houseInfo: nextHouseInfo,
  };
}
