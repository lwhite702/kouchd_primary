"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import "@revenuecat/purchases-js/styles";
import {
  presentRevenueCatPaywall,
  checkKouchdPlusAccess,
  openCustomerCenter,
  getCustomerInfo,
} from "@/lib/revenuecat";
import { useFeatureFlag } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";
import type { CustomerInfo } from "@revenuecat/purchases-js";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isBillingEnabled = useFeatureFlag(FEATURE_FLAGS.BILLING_PORTAL);
  const isPaywallFlagEnabled = useFeatureFlag(FEATURE_FLAGS.REVENUECAT_PAYWALL);
  const isPaywallAvailable = isBillingEnabled || isPaywallFlagEnabled;

  useEffect(() => {
    if (!isOpen || !isPaywallAvailable || !containerRef.current) return;

    let isMounted = true;
    setError(null);

    startTransition(async () => {
      try {
        if (!containerRef.current) return;
        const result = await presentRevenueCatPaywall({
          htmlTarget: containerRef.current,
          customerEmail: userEmail,
          onBack: (close) => {
            close();
            onClose();
          },
          onVisitCustomerCenter: async () => {
            await openCustomerCenter(userId);
          },
        });

        if (isMounted && result?.customerInfo) {
          onPurchaseSuccess?.(result.customerInfo);
          onClose();
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to load paywall.";
          setError(message);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, isPaywallAvailable, userId, userEmail, onClose, onPurchaseSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
        <div className="flex justify-between items-center p-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Kouchd Plus
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 min-h-[400px] flex flex-col justify-center">
          {!isPaywallAvailable ? (
            <div className="text-center p-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 text-xl font-bold">
                ✨
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                  Early Access Preview
                </h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                  Kouchd Plus subscription billing is currently in rollout and invite-only. Stay tuned for wider availability!
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          ) : error ? (
            <div className="text-center p-6 space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div ref={containerRef} className="w-full h-full min-h-[380px]" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * React hook to manage Kouchd Plus subscription state and Customer Center access.
 */
export function useKouchdPlus(userId?: string) {
  const isEntitlementEnforced = useFeatureFlag(FEATURE_FLAGS.KOUCHD_PLUS_ENTITLEMENT);
  const isCustomerCenterEnabled = useFeatureFlag(FEATURE_FLAGS.CUSTOMER_CENTER);

  const [entitled, setEntitled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(isEntitlementEnforced);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isEntitlementEnforced) return;

    setIsLoading(true);
    try {
      const isEntitled = await checkKouchdPlusAccess(userId);
      setEntitled(isEntitled);
      const info = await getCustomerInfo(userId);
      setCustomerInfo(info);
    } catch (err) {
      console.error("Error checking Kouchd Plus status:", err);
      setEntitled(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isEntitlementEnforced]);

  useEffect(() => {
    if (!isEntitlementEnforced) return;

    let cancelled = false;

    void (async () => {
      try {
        const isEntitled = await checkKouchdPlusAccess(userId);
        if (!cancelled) setEntitled(isEntitled);
        const info = await getCustomerInfo(userId);
        if (!cancelled) setCustomerInfo(info);
      } catch (err) {
        console.error("Error checking Kouchd Plus status:", err);
        if (!cancelled) setEntitled(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isEntitlementEnforced]);

  const manageSubscription = async () => {
    if (!isCustomerCenterEnabled) {
      console.warn("Customer Center is disabled by feature flag.");
      return null;
    }
    return await openCustomerCenter(userId);
  };

  const hasPlus = !isEntitlementEnforced || entitled;

  return {
    hasPlus,
    isLoading: isEntitlementEnforced ? isLoading : false,
    customerInfo,
    refreshStatus,
    manageSubscription,
  };
}
