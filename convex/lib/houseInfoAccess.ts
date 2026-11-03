import { calendarDateInTimezone } from "../../lib/domain/dates";
import type { Doc } from "../_generated/dataModel";

export type AccessMembership = Pick<
  Doc<"memberships">,
  "role" | "acceptedTermsId" | "accessCodesNeedAcceptance"
>;

export type AccessCodesHiddenReason = "needs_acceptance" | "ended";

export interface AccessCodeCheckOptions {
  termsEndDate?: string;
  currentDate?: string;
}

export function canViewAccessCodes(
  stay: Pick<Doc<"stays">, "status"> & {
    arrangement?: "home_stay" | "sublease";
    timezone?: string;
  },
  membership: AccessMembership,
  options?: AccessCodeCheckOptions,
): boolean {
  if (membership.role === "host") {
    return true;
  }
  if (
    stay.status === "ended" ||
    !membership.acceptedTermsId ||
    Boolean(membership.accessCodesNeedAcceptance)
  ) {
    return false;
  }
  if (stay.arrangement === "sublease" && options?.termsEndDate) {
    const currentDate =
      options.currentDate ??
      calendarDateInTimezone(new Date(), stay.timezone ?? "UTC");
    if (currentDate > options.termsEndDate) {
      return false;
    }
  }
  return true;
}

/** Why configured codes were withheld, or null when nothing was removed. */
export function accessCodesHiddenReason(
  stay: Pick<Doc<"stays">, "status" | "houseInfo"> & {
    arrangement?: "home_stay" | "sublease";
    timezone?: string;
  },
  membership: AccessMembership,
  options?: AccessCodeCheckOptions,
): AccessCodesHiddenReason | null {
  const hasCodes = Boolean(stay.houseInfo?.doorCode || stay.houseInfo?.wifiPassword);
  if (!hasCodes || canViewAccessCodes(stay, membership, options)) return null;
  if (stay.status === "ended") return "ended";
  if (stay.arrangement === "sublease" && options?.termsEndDate) {
    const currentDate =
      options.currentDate ??
      calendarDateInTimezone(new Date(), stay.timezone ?? "UTC");
    if (currentDate > options.termsEndDate) return "ended";
  }
  return "needs_acceptance";
}

export function redactStayForMember<
  T extends Pick<Doc<"stays">, "status" | "houseInfo"> & {
    arrangement?: "home_stay" | "sublease";
    timezone?: string;
  },
>(
  stay: T,
  membership: AccessMembership,
  options?: AccessCodeCheckOptions,
): T {
  if (canViewAccessCodes(stay, membership, options) || !stay.houseInfo) {
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
