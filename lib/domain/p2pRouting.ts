import { pointsToCents } from "./rewards";

export type P2PNetworkId = "venmo" | "cashapp" | "chime" | "paypal" | "zelle";
export type ExtendedPaymentChannelId = P2PNetworkId | "cash" | "applepay";

export interface P2PTransactionInput {
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
    .replace(/^(https?:\/\/)?(www\.)?paypal\.me(\/|$)/i, "")
    .split(/[/?#]/)[0]
    .trim();
}

function normalizeVenmoHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").trim();
}

function normalizeDollarHandle(raw: string): string {
  return raw.trim().replace(/^\$/, "").trim();
}

/**
 * The person-identifying part of a channel's handle, or "" when there is none.
 * A bare prefix such as "@" or an empty paypal.me link names nobody.
 * Never substitute a placeholder here: a made-up handle can belong to a real stranger.
 */
function normalizedRecipient(
  network: Exclude<ExtendedPaymentChannelId, "cash">,
  tx: P2PTransactionInput,
): string {
  switch (network) {
    case "venmo":
      return normalizeVenmoHandle(tx.recipientVenmo);
    case "cashapp":
      return normalizeDollarHandle(tx.recipientCashApp);
    case "chime":
      return normalizeDollarHandle(tx.recipientChime);
    case "paypal":
      return normalizePayPalHandle(tx.recipientPayPal ?? "");
    case "zelle":
      return tx.recipientZelle.trim();
    case "applepay":
      return tx.recipientApplePay?.trim() ?? "";
  }
}

/**
 * Every channel except cash routes to a person, so it needs a real handle
 * before any app link, QR code, or copy step.
 */
export function hasUsableRecipient(
  network: ExtendedPaymentChannelId,
  tx: P2PTransactionInput,
): boolean {
  return network === "cash" || normalizedRecipient(network, tx) !== "";
}

/**
 * Builds the exact outbound deep-link, QR string, or copy value for a given network and transaction.
 * Returns null when the channel has no real handle, and the route stays blocked.
 * 1. Venmo:      venmo://paycharge?txn=pay&recipients=[username]&amount=[amount]&note=[url_encoded_memo]
 * 2. CashApp:    https://cash.app/$[cashtag]/[amount]
 * 3. Chime:      https://app.chime.com/link/qr?u=[chimesign]
 * 4. PayPal:     https://paypal.me/[username]/[amount]
 * 5. Zelle:      raw recipient credential string
 * 6. Apple Cash: raw recipient credential string
 */
export function buildNetworkRouteUri(
  network: ExtendedPaymentChannelId,
  tx: P2PTransactionInput,
  overrideAmount?: string,
): string | null {
  if (network === "cash") {
    return tx.recipientCashNote?.trim() || "In-person cash handoff with your host";
  }

  const recipient = normalizedRecipient(network, tx);
  if (!recipient) return null;

  const cleanAmount = (overrideAmount ?? tx.amount).trim();
  const encodedRecipient = encodeURIComponent(recipient);

  switch (network) {
    case "venmo":
      return `venmo://paycharge?txn=pay&recipients=${encodedRecipient}&amount=${encodeURIComponent(cleanAmount)}&note=${encodeURIComponent(tx.memo.trim())}`;
    case "cashapp":
      return `https://cash.app/$${encodedRecipient}/${encodeURIComponent(cleanAmount)}`;
    case "chime":
      return `https://app.chime.com/link/qr?u=${encodedRecipient}`;
    case "paypal":
      return `https://paypal.me/${encodedRecipient}/${encodeURIComponent(cleanAmount)}`;
    case "zelle":
    case "applepay":
      return recipient;
  }
}

export function formatRecipientHandle(
  network: ExtendedPaymentChannelId,
  tx: P2PTransactionInput,
): string {
  if (network === "cash") {
    return tx.recipientCashNote?.trim() || "Hand directly to your host";
  }

  const recipient = normalizedRecipient(network, tx);
  if (!recipient) return "Not set by host";

  switch (network) {
    case "venmo":
      return `@${recipient}`;
    case "cashapp":
    case "chime":
      return `$${recipient}`;
    case "paypal":
      return `paypal.me/${recipient}`;
    case "zelle":
    case "applepay":
      return recipient;
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
  stayName?: string;
  suggestedAmountCents?: number;
  defaultMemo?: string;
  paymentOptions?: Array<{ provider: string; detail: string }>;
}): P2PTransactionInput {
  const byProvider = new Map(
    (params.paymentOptions ?? []).map((item) => [item.provider, item.detail.trim()]),
  );
  const amount =
    typeof params.suggestedAmountCents === "number" && params.suggestedAmountCents > 0
      ? (params.suggestedAmountCents / 100).toFixed(2)
      : "";

  return {
    amount,
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
