import { pointsToCents } from "./rewards";

export type P2PNetworkId = "venmo" | "cashapp" | "chime" | "paypal" | "zelle";
export type ExtendedPaymentChannelId = P2PNetworkId | "cash" | "applepay";

export interface P2PTransactionInput {
  transactionId: string;
  amount: string;
  memo: string;
  recipientVenmo: string;
  recipientCashApp: string;
  recipientChime: string;
  recipientZelle: string;
  recipientCashNote?: string;
  recipientPayPal?: string;
  recipientApplePay?: string;
}

export interface RewardOffsetSummary {
  grossAmountCents: number;
  pointsApplied: number;
  rewardCreditCents: number;
  netPayableCents: number;
  netPayableFormatted: string;
}

export const DEFAULT_P2P_TRANSACTION: P2PTransactionInput = {
  transactionId: "TXN-994827",
  amount: "45.00",
  memo: "House stay contribution",
  recipientVenmo: "johndoe",
  recipientCashApp: "johndoe33",
  recipientChime: "john-doe-chime",
  recipientZelle: "johndoe@email.com",
  recipientCashNote: "Leave on the kitchen counter or hand directly to your host.",
  recipientPayPal: "johndoe",
};

/**
 * Parses a client User-Agent string to determine if the device is a mobile phone/tablet
 * capable of native P2P app deep-linking.
 */
export function detectMobileUserAgent(userAgent?: string): boolean {
  const ua =
    typeof userAgent === "string"
      ? userAgent
      : typeof navigator !== "undefined"
        ? navigator.userAgent || navigator.vendor || ""
        : "";
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
}

function normalizePayPalHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
    .replace(/^paypal\.me\//i, "")
    .split(/[/?#]/)[0]
    .trim();
}

/**
 * Builds the exact outbound deep-link or QR string for a given network and transaction.
 * 1. Venmo:   venmo://paycharge?txn=pay&recipients=[username]&amount=[amount]&note=[url_encoded_memo]
 * 2. CashApp: https://cash.app/$[cashtag]/[amount]
 * 3. Chime:   https://app.chime.com/link/qr?u=[chimesign]
 * 4. PayPal:  https://paypal.me/[username]/[amount]
 * 5. Zelle:   raw recipient credential string
 */
export function buildNetworkRouteUri(
  network: ExtendedPaymentChannelId,
  tx: P2PTransactionInput,
  overrideAmount?: string,
): string {
  const cleanAmount = (overrideAmount ?? tx.amount).trim();
  const encodedMemo = encodeURIComponent(tx.memo.trim());

  switch (network) {
    case "venmo": {
      const cleanVenmo = tx.recipientVenmo.replace(/^@/, "").trim();
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(cleanVenmo)}&amount=${encodeURIComponent(cleanAmount)}&note=${encodedMemo}`;
    }
    case "cashapp": {
      const cleanCashtag = tx.recipientCashApp.replace(/^\$/, "").trim();
      return `https://cash.app/$${encodeURIComponent(cleanCashtag)}/${encodeURIComponent(cleanAmount)}`;
    }
    case "chime": {
      const cleanChime = tx.recipientChime.replace(/^\$/, "").trim();
      return `https://app.chime.com/link/qr?u=${encodeURIComponent(cleanChime)}`;
    }
    case "paypal": {
      const cleanPayPal = normalizePayPalHandle(tx.recipientPayPal ?? "");
      if (!cleanPayPal) return "https://paypal.me";
      return `https://paypal.me/${encodeURIComponent(cleanPayPal)}/${encodeURIComponent(cleanAmount)}`;
    }
    case "zelle":
      return tx.recipientZelle.trim();
    case "cash":
      return tx.recipientCashNote?.trim() || "In-person cash handoff with your host";
    case "applepay":
      return tx.recipientApplePay?.trim() || "";
  }
}

export function formatRecipientHandle(
  network: ExtendedPaymentChannelId,
  tx: P2PTransactionInput,
): string {
  switch (network) {
    case "venmo": {
      const handle = tx.recipientVenmo.replace(/^@/, "").trim();
      return handle ? `@${handle}` : "Not set by host";
    }
    case "cashapp": {
      const handle = tx.recipientCashApp.replace(/^\$/, "").trim();
      return handle ? `$${handle}` : "Not set by host";
    }
    case "chime": {
      const handle = tx.recipientChime.replace(/^\$/, "").trim();
      return handle ? `$${handle}` : "Not set by host";
    }
    case "paypal": {
      const handle = normalizePayPalHandle(tx.recipientPayPal ?? "");
      return handle ? `paypal.me/${handle}` : "Not set by host";
    }
    case "zelle":
      return tx.recipientZelle.trim() || "Not set by host";
    case "cash":
      return tx.recipientCashNote?.trim() || "Hand directly to your host";
    case "applepay":
      return tx.recipientApplePay?.trim() || "Not set by host";
  }
}

/**
 * Calculates how applying available reward points affects the remaining cash/P2P amount due.
 */
export function calculateContributionWithRewards(params: {
  amountDollars: string | number;
  pointsToApply: number;
  availablePoints: number;
  centsPerPoint: number;
  maxRedeemablePoints?: number;
}): RewardOffsetSummary {
  const parsedDollars = typeof params.amountDollars === "number"
    ? params.amountDollars
    : Number(params.amountDollars);
  const grossAmountCents = Number.isFinite(parsedDollars) && parsedDollars > 0
    ? Math.round(parsedDollars * 100)
    : 0;

  const capPoints = typeof params.maxRedeemablePoints === "number"
    ? Math.min(params.availablePoints, params.maxRedeemablePoints)
    : params.availablePoints;

  const maxPointsNeededForGross = params.centsPerPoint > 0
    ? Math.floor(grossAmountCents / params.centsPerPoint)
    : 0;

  const clampedPoints = Math.max(
    0,
    Math.min(Math.floor(params.pointsToApply), capPoints, maxPointsNeededForGross),
  );

  const rewardCreditCents = pointsToCents(clampedPoints, params.centsPerPoint);
  const netPayableCents = Math.max(0, grossAmountCents - rewardCreditCents);

  return {
    grossAmountCents,
    pointsApplied: clampedPoints,
    rewardCreditCents,
    netPayableCents,
    netPayableFormatted: (netPayableCents / 100).toFixed(2),
  };
}

/**
 * Maps a stay's configured paymentOptions and current balance into a unified P2PTransactionInput.
 */
export function buildTransactionInputFromStay(params: {
  stayId?: string;
  stayName?: string;
  suggestedAmountCents?: number;
  defaultMemo?: string;
  paymentOptions?: Array<{ provider: string; detail: string }>;
}): P2PTransactionInput {
  const byProvider = new Map(
    (params.paymentOptions ?? []).map((item) => [item.provider, item.detail.trim()]),
  );
  const suffix = (params.stayId ?? "994827").slice(-6).toUpperCase();
  const amountCents =
    typeof params.suggestedAmountCents === "number" && params.suggestedAmountCents > 0
      ? params.suggestedAmountCents
      : 4500;

  return {
    transactionId: `KCH-${suffix}`,
    amount: (amountCents / 100).toFixed(2),
    memo: params.defaultMemo?.trim() || (params.stayName ? `${params.stayName} stay contribution` : "Shared stay contribution"),
    recipientVenmo: byProvider.get("venmo") ?? "",
    recipientCashApp: byProvider.get("cashapp") ?? "",
    recipientChime: byProvider.get("chime") ?? "",
    recipientZelle: byProvider.get("zelle") ?? "",
    recipientCashNote: byProvider.get("cash") ?? "Hand directly to your host or leave in the agreed spot",
    recipientPayPal: byProvider.get("paypal") ?? "",
    recipientApplePay: byProvider.get("applepay") ?? "",
  };
}
