import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { createIntroOfferEligibilityJws, readIntroOfferSigningConfig } from "../lib/domain/introOfferSignature";

const ANNUAL_PRODUCT = "kouchd_plus_yearly";
const PLUS_PRODUCTS = new Set(["kouchd_plus_monthly", ANNUAL_PRODUCT]);

/**
 * One free trial per host billing account across web and iPhone. StoreKit
 * only knows the person's App Store history, so the iPhone app asks here
 * before showing trial wording or buying, and passes the returned JWS to
 * StoreKit (`Product.PurchaseOption.introductoryOfferEligibility`) so the
 * Apple sheet matches what Kouchd decided.
 *
 * `eligible: null` means Kouchd could not answer (signing is not configured
 * or the app sent no App Store transaction ID). The app then shows no trial
 * wording of its own and must not claim a trial Apple has not confirmed.
 */
export const signEligibility = action({
  args: {
    productId: v.string(),
    /** AppTransaction.appTransactionID (or any transaction ID of this App Store account). */
    appTransactionId: v.optional(v.string()),
  },
  returns: v.object({
    eligible: v.union(v.boolean(), v.null()),
    jws: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ eligible: boolean | null; jws?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (!PLUS_PRODUCTS.has(args.productId)) throw new Error("Unknown Kouchd Plus product");

    const decision: { eligible: boolean } | null = await ctx.runQuery(internal.subscriptions.introOfferEligibilityForViewer, {
      clerkUserId: identity.subject,
    });
    if (!decision) throw new Error("Only a host can buy Kouchd Plus.");

    // The free trial belongs to Annual only, whatever is set up in App Store Connect.
    const eligible = decision.eligible && args.productId === ANNUAL_PRODUCT;
    const config = readIntroOfferSigningConfig(process.env);
    const transactionId = args.appTransactionId?.trim();
    if (!config || !transactionId || !/^[0-9]{1,30}$/.test(transactionId)) {
      return { eligible: null };
    }
    try {
      const jws = await createIntroOfferEligibilityJws(config, {
        productId: args.productId,
        allowIntroductoryOffer: eligible,
        transactionId,
      });
      return { eligible, jws };
    } catch {
      // A malformed key must not block the purchase, only the trial wording.
      console.warn("intro_offer_signing_failed");
      return { eligible: null };
    }
  },
});
