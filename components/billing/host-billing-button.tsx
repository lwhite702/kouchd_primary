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

  let label = "Host plan";
  if (usage) {
    if (usage.plan === "plus") {
      const limit = usage.guests.limit ?? 5;
      label = `Plan · Plus (${usage.guests.used}/${limit} spots)`;
    } else if (usage.plan === "pro") {
      label = "Plan · Pro";
    } else {
      const limit = usage.guests.limit ?? 1;
      label = `Host plan · Free (${usage.guests.used}/${limit} spots)`;
    }
  }

  const blockedCount = usage?.blockedJoins?.length ?? 0;

  return (
    <>
      <button
        className="button soft compact"
        type="button"
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <span>{label}</span>
        {blockedCount > 0 && (
          <span
            aria-label={`${blockedCount} waiting`}
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
