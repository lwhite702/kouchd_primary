import type { Doc } from "../_generated/dataModel";

type AccessMembership = Pick<Doc<"memberships">, "role" | "acceptedTermsId" | "accessCodesNeedAcceptance">;

export type AccessCodesHiddenReason = "needs_acceptance" | "ended";

export function canViewAccessCodes(
  stay: Pick<Doc<"stays">, "status">,
  membership: AccessMembership,
): boolean {
  if (membership.role === "host") {
    return true;
  }
  return (
    stay.status !== "ended" &&
    Boolean(membership.acceptedTermsId) &&
    !membership.accessCodesNeedAcceptance
  );
}

/** Why configured codes were withheld, or null when nothing was removed. */
export function accessCodesHiddenReason(
  stay: Pick<Doc<"stays">, "status" | "houseInfo">,
  membership: AccessMembership,
): AccessCodesHiddenReason | null {
  const hasCodes = Boolean(stay.houseInfo?.doorCode || stay.houseInfo?.wifiPassword);
  if (!hasCodes || canViewAccessCodes(stay, membership)) return null;
  return stay.status === "ended" ? "ended" : "needs_acceptance";
}

export function redactStayForMember<
  T extends Pick<Doc<"stays">, "status" | "houseInfo">,
>(
  stay: T,
  membership: AccessMembership,
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
