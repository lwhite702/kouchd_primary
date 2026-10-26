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
  const enabled = useFeatureFlag(FEATURE_FLAGS.BILLING_PORTAL);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!summary?.canManageSubscription || !enabled) return null;
  return (
    <>
      <button
        className="button soft compact"
        type="button"
        onClick={() => setOpen(true)}
      >
        Host plan
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
