"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useFeatureFlag } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";

const PaywallModal = dynamic(() =>
  import("./paywall-modal").then((m) => m.PaywallModal),
);

type PlanUsageLabelInput = {
  planConfigured: boolean;
  plan: "free" | "plus" | "pro";
  guests: { used: number; limit: number | null };
};

/** The button text. Without a readable plan we never guess at a tier or limit. */
export function hostPlanLabel(usage: PlanUsageLabelInput | null | undefined) {
  if (!usage || !usage.planConfigured) return "Host plan";
  if (usage.plan === "plus") {
    return `Plan · Plus (${usage.guests.used}/${usage.guests.limit ?? 5} spots)`;
  }
  if (usage.plan === "pro") return "Plan · Pro";
  return `Host plan · Free (${usage.guests.used}/${usage.guests.limit ?? 1} spots)`;
}

export function HostBillingButton() {
  const { user } = useUser();
  const summary = useQuery(
    api.subscriptions.currentAccountSummary,
    user ? {} : "skip",
  );
  const usage = useQuery(
    api.subscriptions.planUsage,
    user && summary?.canManageSubscription ? {} : "skip",
  );
  const enabled = useFeatureFlag(FEATURE_FLAGS.BILLING_PORTAL);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!summary?.canManageSubscription || !enabled) return null;

  const label = hostPlanLabel(usage);
  const blockedCount = usage?.blockedJoins?.length ?? 0;

  return (
    <>
      <button
        className="button soft compact"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={blockedCount > 0 ? `${label}, ${blockedCount} waiting to join` : undefined}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <span>{label}</span>
        {blockedCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              marginLeft: "6px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "18px",
              height: "18px",
              padding: "0 5px",
              borderRadius: "9999px",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "0.72rem",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {blockedCount}
          </span>
        )}
      </button>
      {open && (
        <PaywallModal
          key={user?.id}
          isOpen={open}
          onClose={close}
          userId={user?.id}
          userEmail={user?.primaryEmailAddress?.emailAddress}
        />
      )}
    </>
  );
}
