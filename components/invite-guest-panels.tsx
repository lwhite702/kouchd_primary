import { Clock3, Lock, Users, Wallet } from "lucide-react";

import "@/components/ui/main-action.css";
import "./invite-accept.css";

/** Fallback strings convex/invites.ts returns when a name is missing. */
const FALLBACK_HOST_NAME = "A Kouchd host";
const FALLBACK_STAY_NAME = "Shared stay";

function realName(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== fallback ? trimmed : null;
}

/** Uses the host and stay names only when the invite carries real ones. */
export function inviteTitle(hostName?: string, stayName?: string) {
  const host = realName(hostName, FALLBACK_HOST_NAME);
  const stay = realName(stayName, FALLBACK_STAY_NAME);
  if (host && stay) return `${host} made room for you at ${stay}.`;
  if (host) return `${host} made room for you.`;
  return "Someone made room for you.";
}

export function InviteHero({
  hostName,
  stayName,
  referralCode,
  expiresAt,
}: {
  hostName?: string;
  stayName?: string;
  referralCode?: string;
  expiresAt?: number;
}) {
  return (
    <section className="invite-hero-card" aria-label="Stay invitation details">
      <p className="invite-eyebrow">For invited guests</p>
      <h1>{inviteTitle(hostName, stayName)}</h1>
      <p className="invite-hero-body">
        Joining is always free. Once you&apos;re in, you&apos;ll see announcements and the chore board, plus your own agreement and contribution record.
      </p>
      <p className="invite-reassurance">No payment details needed.</p>
      <div className="invite-registration-details">
        <div className="invite-registration-detail">
          <Users size={18} aria-hidden="true" />
          <div>
            <span className="overline">Household join code</span>
            <input aria-label="Household join code" readOnly value={referralCode ?? "Unavailable for this invite"} />
          </div>
        </div>
        {expiresAt !== undefined && (
          <p className="invite-expiry"><Clock3 size={15} aria-hidden="true" /> Invite expires {new Date(expiresAt).toUTCString()}</p>
        )}
      </div>
    </section>
  );
}

/**
 * Who sees what in a stay. Each row matches current Convex access rules:
 * announcements, house info and chores are listed for every stay member
 * (convex/announcements.ts, convex/stays.ts, convex/chores.ts), while terms
 * and contributions are scoped to one guest and the host (convex/stays.ts
 * getBundle, convex/lib/auth.ts resolveFinancialGuest). House rules live in
 * each guest's terms (convex/terms.ts updateGuest stores a per-guest copy
 * of house notes and rules), so they are not listed as shared with everyone.
 */
export const INVITE_PRIVACY_ROWS = [
  {
    key: "shared",
    label: "Shared with everyone in the stay",
    text: "Announcements, house info, and the chore board.",
  },
  {
    key: "private",
    label: "Only you and your host",
    text: "Your agreement terms and your contribution record. Other guests in the stay can't see them.",
  },
  {
    key: "money",
    label: "Never through Kouchd",
    text: "Money. You pay your host directly, the way you agreed. Kouchd only keeps the record.",
  },
] as const;

const ROW_ICONS = { shared: Users, private: Lock, money: Wallet } as const;

export function InvitePrivacyPanel() {
  return (
    <section className="invite-privacy-panel" aria-labelledby="invite-privacy-title">
      <h2 id="invite-privacy-title">What you&apos;ll share</h2>
      <ul>
        {INVITE_PRIVACY_ROWS.map((row) => {
          const Icon = ROW_ICONS[row.key];
          return (
            <li key={row.key}>
              <span className="invite-privacy-icon" aria-hidden="true"><Icon size={18} /></span>
              <p><strong>{row.label}:</strong> {row.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
