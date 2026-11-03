import { Check } from "lucide-react";

import {
  PLAN_CAPABILITIES,
  PLAN_LIMITS,
  PLUS_DISPLAY_PRICES,
  type SubscriptionPlan,
} from "@/lib/domain/subscriptionPlans";

import "@/components/ui/main-action.css";
import "./plus-plans.css";

function stayLine(limit: number | null, prefix: string) {
  if (limit === null) return null;
  return `${prefix}${limit} active ${limit === 1 ? "stay" : "stays"}`;
}

function guestLine(limit: number | null, prefix: string) {
  if (limit === null) return null;
  return `${prefix}${limit} ${limit === 1 ? "guest" : "guests"} across your stays`;
}

/**
 * Plan card rows come only from the plan facts in lib/domain/subscriptionPlans.
 * Plus lists only what the backend enforces today: the stay and guest limits
 * (convex/lib/planCapacity.ts). Capabilities that are declared but not yet
 * gated in Convex are left off so a card never promises something Free lacks.
 */
export function planFeatureLines(plan: Extract<SubscriptionPlan, "starter" | "hostPlus">): string[] {
  const limits = PLAN_LIMITS[plan];
  const prefix = plan === "starter" ? "" : "Up to ";
  const lines = [stayLine(limits.maxActiveStays, prefix), guestLine(limits.maxActiveGuests, prefix)];
  const core = PLAN_CAPABILITIES[plan];
  if (plan === "starter" && core.agreementsAndHistory && core.coreLedger && core.basicChores) {
    lines.push("Agreements, the Ledger, and a shared chore board");
  }
  if (plan === "hostPlus") lines.push("Everything in Free");
  return lines.filter((line): line is string => line !== null);
}

export function PlusPlanCards({ onStartPlus, startLabel = "Start with Plus" }: { onStartPlus: () => void; startLabel?: string }) {
  return (
    <div className="plus-plans">
      <div className="plus-plans-grid">
        <section className="plus-plan-card is-free" aria-labelledby="plus-plan-free-title">
          <p className="plus-plan-eyebrow">For one stay</p>
          <h3 id="plus-plan-free-title">Free</h3>
          <p className="plus-plan-price">$0</p>
          <ul className="plus-plan-features">
            {planFeatureLines("starter").map((line) => (
              <li key={line}><Check size={16} aria-hidden="true" /> {line}</li>
            ))}
          </ul>
        </section>

        <section className="plus-plan-card is-plus" aria-labelledby="plus-plan-plus-title">
          <span className="plus-plan-tag">Plus</span>
          <p className="plus-plan-eyebrow">For hosts with more going on</p>
          <h3 id="plus-plan-plus-title">Kouchd Plus</h3>
          <p className="plus-plan-price">
            {PLUS_DISPLAY_PRICES.monthly}<span>/month</span>
            <small>or {PLUS_DISPLAY_PRICES.yearly}/year</small>
          </p>
          <ul className="plus-plan-features">
            {planFeatureLines("hostPlus").map((line) => (
              <li key={line}><Check size={16} aria-hidden="true" /> {line}</li>
            ))}
          </ul>
          <button type="button" className="kouchd-main-action is-full-width" onClick={onStartPlus}>
            {startLabel}
          </button>
        </section>
      </div>

      <p className="plus-plans-guest-note">Invited to a stay? Guests always join free.</p>
      <p className="plus-plans-fine-print">
        Plus is a subscription for host tools. Kouchd never collects, holds, or transfers money between hosts and guests.
      </p>
    </div>
  );
}
