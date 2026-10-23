"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { CustomerInfo, Package } from "@revenuecat/purchases-js";
import { api } from "@/convex/_generated/api";
import {
  getCustomerInfo,
  getSubscriptionOfferings,
  openCustomerCenter,
  purchaseSubscriptionPackage,
} from "@/lib/revenuecat";
import { useFeatureFlag } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";

interface PaywallModalProps {
  userId?: string;
  userEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (info: CustomerInfo) => void;
}

export function PaywallModal({
  userId,
  userEmail,
  isOpen,
  onClose,
  onPurchaseSuccess,
}: PaywallModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [options, setOptions] = useState<
    Array<{ label: string; package: Package }>
  >([]);
  const summary = useQuery(
    api.subscriptions.currentAccountSummary,
    userId ? {} : "skip",
  );
  const enabled = useFeatureFlag(FEATURE_FLAGS.BILLING_PORTAL);
  const available = enabled && summary?.canManageSubscription;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (isOpen && element && !element.open) element.showModal();
    if (!isOpen && element?.open) element.close();
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || !available || !userId) return;
    let active = true;
    void getSubscriptionOfferings(userId)
      .then((result) => {
        if (active)
          setOptions([
            ...(result.monthlyPackage
              ? [{ label: "Monthly", package: result.monthlyPackage }]
              : []),
            ...(result.yearlyPackage
              ? [{ label: "Annual", package: result.yearlyPackage }]
              : []),
          ]);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "We could not load Plus. Please try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [isOpen, available, userId, attempt]);
  async function purchase(rcPackage: Package) {
    if (submitting.current || !userId || !available) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await purchaseSubscriptionPackage(rcPackage, {
        appUserId: userId,
        customerEmail: userEmail,
        htmlTarget: target.current ?? undefined,
      });
      if (mounted.current) {
        onPurchaseSuccess?.(result.customerInfo);
        onClose();
      }
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Checkout could not be completed. Please try again.",
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal-card billing-dialog"
      aria-labelledby="billing-title"
      onCancel={(event) => {
        if (submitting.current) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <h2 id="billing-title">Kouchd Plus</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close billing"
        >
          ×
        </button>
      </div>
      {!available ? (
        <p>Plus billing is being prepared. Guests always join for free.</p>
      ) : (
        <>
          <p>
            Up to three active stays and three guest memberships across your
            host account.
          </p>
          {!options.length && !error && (
            <p role="status">Loading current subscription options…</p>
          )}
          {options.map((option) => (
            <button
              className="button soft"
              type="button"
              key={option.package.identifier}
              disabled={busy}
              onClick={() => void purchase(option.package)}
            >
              {option.label} ·{" "}
              {option.package.product.currentPrice.formattedPrice}
            </button>
          ))}
          {error && (
            <div role="alert">
              <p>{error}</p>
              {!options.length && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setAttempt((value) => value + 1);
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
          <div ref={target} aria-busy={busy} />
        </>
      )}
      <p className="muted">
        Your plan updates after your subscription is verified. Household
        contributions happen outside Kouchd.
      </p>
    </dialog>
  );
}

/** Server summary is the only authority for paid access. */
export function useKouchdPlus(userId?: string) {
  const summary = useQuery(
    api.subscriptions.currentAccountSummary,
    userId ? {} : "skip",
  );
  const customerCenterEnabled = useFeatureFlag(FEATURE_FLAGS.CUSTOMER_CENTER);
  const [snapshot, setSnapshot] = useState<{
    userId: string;
    info: CustomerInfo;
  } | null>(null);
  const customerInfo =
    snapshot && snapshot.userId === userId ? snapshot.info : null;
  return {
    hasPlus: Boolean(
      summary?.canManageSubscription &&
      (summary.plan === "hostPlus" || summary.plan === "householdPro"),
    ),
    isLoading: Boolean(userId && summary === undefined),
    customerInfo,
    refreshStatus: async () => {
      if (userId) setSnapshot({ userId, info: await getCustomerInfo(userId) });
    },
    manageSubscription: async () =>
      userId && customerCenterEnabled ? openCustomerCenter(userId) : null,
  };
}
