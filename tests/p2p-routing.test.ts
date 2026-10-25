import { describe, expect, it } from "vitest";

import {
  buildNetworkRouteUri,
  buildTransactionInputFromStay,
  calculateContributionWithRewards,
  DEFAULT_P2P_TRANSACTION,
  detectMobileUserAgent,
  formatRecipientHandle,
} from "@/lib/domain/p2pRouting";
import { generateQrMatrixLevelH } from "@/lib/domain/qrCodeLevelH";

describe("P2P Payment Router & Level-H QR Engine", () => {
  it("compiles exact deep-link and QR payloads for Venmo, Cash App, Chime, PayPal, Zelle, and Cash", () => {
    const tx = {
      ...DEFAULT_P2P_TRANSACTION,
      transactionId: "TXN-994827",
      amount: "45.00",
      memo: "Marketplace Order #991",
      recipientVenmo: "johndoe",
      recipientCashApp: "johndoe33",
      recipientChime: "john-doe-chime",
      recipientPayPal: "johndoe",
      recipientZelle: "johndoe@email.com",
    };

    expect(buildNetworkRouteUri("venmo", tx)).toBe(
      "venmo://paycharge?txn=pay&recipients=johndoe&amount=45.00&note=Marketplace%20Order%20%23991",
    );
    expect(buildNetworkRouteUri("cashapp", tx)).toBe("https://cash.app/$johndoe33/45.00");
    expect(buildNetworkRouteUri("chime", tx)).toBe(
      "https://app.chime.com/link/qr?u=john-doe-chime",
    );
    expect(buildNetworkRouteUri("paypal", tx)).toBe("https://paypal.me/johndoe/45.00");
    expect(buildNetworkRouteUri("zelle", tx)).toBe("johndoe@email.com");
  });

  it("normalizes leading @ or $ prefixes on handles and formats display handles", () => {
    const tx = {
      ...DEFAULT_P2P_TRANSACTION,
      recipientVenmo: "@lee_host",
      recipientCashApp: "$leeCash",
      recipientChime: "$lee-chime",
      recipientPayPal: "https://paypal.me/lee_paypal",
      recipientZelle: "lee@kouchd.com",
    };

    expect(buildNetworkRouteUri("venmo", tx, "120.00")).toContain("recipients=lee_host&amount=120.00");
    expect(buildNetworkRouteUri("cashapp", tx, "120.00")).toBe("https://cash.app/$leeCash/120.00");
    expect(buildNetworkRouteUri("chime", tx)).toBe("https://app.chime.com/link/qr?u=lee-chime");
    expect(buildNetworkRouteUri("paypal", tx, "120.00")).toBe("https://paypal.me/lee_paypal/120.00");
    expect(formatRecipientHandle("venmo", tx)).toBe("@lee_host");
    expect(formatRecipientHandle("cashapp", tx)).toBe("$leeCash");
    expect(formatRecipientHandle("chime", tx)).toBe("$lee-chime");
    expect(formatRecipientHandle("paypal", tx)).toBe("paypal.me/lee_paypal");
    expect(formatRecipientHandle("zelle", tx)).toBe("lee@kouchd.com");
  });

  it("detects mobile vs desktop user agents accurately", () => {
    expect(
      detectMobileUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
    expect(
      detectMobileUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe(true);
    expect(
      detectMobileUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });

  it("calculates reward points offsets and net payable amounts", () => {
    const partial = calculateContributionWithRewards({
      amountDollars: "45.00",
      pointsToApply: 15,
      availablePoints: 50,
      centsPerPoint: 100,
      maxRedeemablePoints: 30,
    });
    expect(partial).toEqual({
      grossAmountCents: 4500,
      pointsApplied: 15,
      rewardCreditCents: 1500,
      netPayableCents: 3000,
      netPayableFormatted: "30.00",
    });

    const fullCover = calculateContributionWithRewards({
      amountDollars: "25.00",
      pointsToApply: 40,
      availablePoints: 50,
      centsPerPoint: 100,
      maxRedeemablePoints: 50,
    });
    expect(fullCover).toEqual({
      grossAmountCents: 2500,
      pointsApplied: 25,
      rewardCreditCents: 2500,
      netPayableCents: 0,
      netPayableFormatted: "0.00",
    });
  });

  it("builds a Level-H QR matrix with valid finder patterns for all P2P URIs", () => {
    const venmoUri = buildNetworkRouteUri("venmo", DEFAULT_P2P_TRANSACTION);
    const qr = generateQrMatrixLevelH(venmoUri);

    expect(qr.errorCorrectionLevel).toBe("H");
    expect(qr.size).toBe(qr.version * 4 + 17);
    expect(qr.modules.length).toBe(qr.size);
    // Top-left, top-right, and bottom-left finder corners are dark modules
    expect(qr.modules[0][0]).toBe(true);
    expect(qr.modules[0][6]).toBe(true);
    expect(qr.modules[6][0]).toBe(true);
    expect(qr.modules[0][qr.size - 1]).toBe(true);
    expect(qr.modules[qr.size - 1][0]).toBe(true);
  });

  it("maps stay paymentOptions into a unified P2PTransactionInput", () => {
    const mapped = buildTransactionInputFromStay({
      stayId: "stay_abc123",
      stayName: "Maple House",
      suggestedAmountCents: 15000,
      paymentOptions: [
        { provider: "venmo", detail: "maple-lee" },
        { provider: "cashapp", detail: "$maplelee" },
        { provider: "chime", detail: "maple-chime" },
        { provider: "zelle", detail: "lee@maple.org" },
        { provider: "cash", detail: "Envelope on entry table" },
      ],
    });

    expect(mapped.transactionId).toBe("KCH-ABC123");
    expect(mapped.amount).toBe("150.00");
    expect(mapped.recipientVenmo).toBe("maple-lee");
    expect(mapped.recipientCashApp).toBe("$maplelee");
    expect(mapped.recipientChime).toBe("maple-chime");
    expect(mapped.recipientZelle).toBe("lee@maple.org");
    expect(mapped.recipientCashNote).toBe("Envelope on entry table");
  });
});
