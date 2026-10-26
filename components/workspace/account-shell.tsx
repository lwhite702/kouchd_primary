"use client";

import { HostBillingButton } from "@/components/billing/host-billing-button";

import { UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BookOpen,
  Home,
  KeyRound,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { HostOnboardingWizard } from "@/components/onboarding/host-onboarding-wizard";
import { JoinHouseholdCard } from "@/components/referral/join-household";
import { HelpTip } from "@/components/onboarding/help-tip";
import { NotificationBellMenu } from "@/components/notifications/dashboard-notifications";
import type { NotificationItem } from "@/components/notifications/dashboard-notifications";
import { MobileHeaderMenu } from "@/components/navigation/header-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";
import { FeatureGate } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";
import { StayMembershipSummary } from "@/components/workspace/types";

export function AccountHeader({
  notifications,
  onSettings,
  onJoinCode,
  onTakeTour,
  onStays,
}: {
  notifications?: NotificationItem[];
  onSettings?: () => void;
  onJoinCode?: () => void;
  onTakeTour?: () => void;
  onStays?: () => void;
}) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" style={{ textDecoration: "none" }}>
        <KouchdWordmark size="md" className="topbar-wordmark" />
      </Link>
      <div className="topbar-actions">
        <HostBillingButton />
        {/* Desktop-only direct utility buttons with clear labels */}
        <div className="topbar-desktop-only">
          {onTakeTour && (
            <FeatureGate flag={FEATURE_FLAGS.GUIDED_TOUR}>
              <Tooltip
                content="Interactive walkthrough of features"
                position="bottom"
              >
                <button
                  aria-label="Take the guided tour"
                  className="button soft compact tour-entry"
                  onClick={onTakeTour}
                  title="Take the guided tour"
                  type="button"
                >
                  <Sparkles size={15} />
                  <span>Tour</span>
                </button>
              </Tooltip>
            </FeatureGate>
          )}
          {onStays && (
            <Tooltip
              content="Switch or view other household stays"
              position="bottom"
            >
              <button
                className="button soft compact stays-entry"
                type="button"
                onClick={onStays}
                title="Switch or view stays"
              >
                <Users size={15} />
                <span>All stays</span>
              </button>
            </Tooltip>
          )}
          <Tooltip
            content="Browse setup guides, ledger instructions & rules"
            position="bottom"
          >
            <a
              className="button ghost compact docs-entry"
              href={HELP_LINKS.home}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.8rem",
                padding: "4px 10px",
                color: "var(--muted)",
                textDecoration: "none",
              }}
              title="Guides & Documentation"
            >
              <BookOpen size={15} /> Docs
            </a>
          </Tooltip>
          {onJoinCode && (
            <Tooltip
              content="Enter a host referral code to join"
              position="bottom"
            >
              <button
                aria-label="Join with code"
                className="button soft compact join-code-entry"
                type="button"
                onClick={onJoinCode}
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                title="Join household with referral code"
              >
                <KeyRound size={15} />
                <span>Join with code</span>
              </button>
            </Tooltip>
          )}
          {onSettings && (
            <Tooltip
              content="Notification delivery preferences"
              position="bottom"
            >
              <button
                className="icon-button compact settings-entry"
                type="button"
                onClick={onSettings}
                aria-label="Notification settings"
                title="Notification delivery preferences"
              >
                <Settings size={19} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Prominent notification bell */}
        <NotificationBellMenu
          notifications={notifications ?? []}
          onOpenSettings={onSettings}
        />

        {/* Mobile menu with clear icon, and descriptive subtitles */}
        <MobileHeaderMenu
          onTakeTour={onTakeTour}
          onStays={onStays}
          onJoinCode={onJoinCode}
          onSettings={onSettings}
          docsHref="https://help.kouchd.com"
        />

        <UserButton />
      </div>
    </header>
  );
}

export function GetStartedHub({
  onHostStayCreated,
}: {
  onHostStayCreated: (stayId: Id<"stays">) => void;
}) {
  const [tab, setTab] = useState<"host" | "join">("host");

  return (
    <div className="app-shell production-shell">
      <AccountHeader />
      <main style={{ padding: "1.5rem 1rem 4rem" }}>
        <div className="get-started-artwork" aria-hidden="true">
          <Image
            src={tab === "host" ? "/artwork/host-welcome.png" : "/artwork/invitation.png"}
            alt=""
            width={640}
            height={480}
            sizes="(max-width: 480px) 58vw, 220px"
          />
        </div>
        <div
          style={{
            maxWidth: 440,
            margin: "0 auto 1.5rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          <button
            className={`button ${tab === "host" ? "primary" : "soft"}`}
            type="button"
            onClick={() => setTab("host")}
            style={{ justifyContent: "center" }}
          >
            <Home size={18} /> Host a Stay
          </button>
          <button
            className={`button ${tab === "join" ? "primary" : "soft"}`}
            type="button"
            onClick={() => setTab("join")}
            style={{ justifyContent: "center" }}
          >
            <KeyRound size={18} /> Join with Code
          </button>
        </div>

        <div style={{ maxWidth: 440, margin: "0 auto 1rem" }}>
          <HelpTip
            title={tab === "host" ? "Starting a stay" : "Joining a household"}
            href={
              tab === "host"
                ? HELP_LINKS.hostsGettingStarted
                : HELP_LINKS.joiningAStay
            }
          >
            {tab === "host"
              ? "Set the dates, contribution plan, house rules, and any optional rewards before you invite guests."
              : "Enter the referral code shared by your host. After joining, review and accept the household agreement to finish setup."}
          </HelpTip>
        </div>

        <a
          className="onboarding-help-card"
          href={
            tab === "host"
              ? HELP_LINKS.hostsGettingStarted
              : HELP_LINKS.joiningAStay
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="onboarding-help-icon">
            <BookOpen size={19} />
          </span>
          <span>
            <strong>
              {tab === "host" ? "Host setup guide" : "Guest joining guide"}
            </strong>
            <small>
              {tab === "host"
                ? "Plan dates, terms, house rules, and invites."
                : "See what you’ll review before joining a stay."}
            </small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </a>

        {tab === "host" ? (
          <HostOnboardingWizard onComplete={onHostStayCreated} />
        ) : (
          <JoinHouseholdCard
            onJoined={() => {
              /* stay query updates automatically */
            }}
          />
        )}
      </main>
    </div>
  );
}

export function StayHub({
  stays,
  onSelectStay,
  onHostStayCreated,
}: {
  stays: StayMembershipSummary[];
  onSelectStay: (stayId: Id<"stays">) => void;
  onHostStayCreated: (stayId: Id<"stays">) => void;
}) {
  const [creating, setCreating] = useState(false);
  const currentStays = stays.filter(({ stay }) => stay.status !== "ended");
  const pastStays = stays.filter(({ stay }) => stay.status === "ended");
  const goToCreatedStay = (stayId: Id<"stays">) => {
    setCreating(false);
    onHostStayCreated(stayId);
  };

  return (
    <div className="app-shell production-shell">
      <AccountHeader />
      <main className="stay-hub">
        {creating ? (
          <div className="stay-hub-setup">
            <div className="page-heading">
              <div>
                <p className="eyebrow">A fresh start</p>
                <h1>Host a new stay</h1>
                <p className="subhead">
                  Set the dates and agreement, then invite your guests.
                </p>
              </div>
              <button
                className="button ghost"
                type="button"
                onClick={() => setCreating(false)}
              >
                Back to stays
              </button>
            </div>
            <HostOnboardingWizard
              onCancel={() => setCreating(false)}
              onComplete={goToCreatedStay}
            />
          </div>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">Your Kouchd stays</p>
                <h1>Choose a stay to open.</h1>
                <p className="subhead">
                  Keep each household’s agreements and history together. Your
                  host plan determines how many stays can be active.
                </p>
              </div>
              <button
                className="button primary"
                type="button"
                onClick={() => setCreating(true)}
              >
                <Plus size={18} /> Host a new stay
              </button>
            </div>
            <section className="stay-hub-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Current and upcoming</p>
                  <h2>Active stays</h2>
                </div>
              </div>
              {currentStays.length ? (
                <div className="stay-hub-grid">
                  {currentStays.map(({ stay, membership }) => (
                    <button
                      className="stay-hub-card"
                      type="button"
                      key={stay._id}
                      onClick={() => onSelectStay(stay._id)}
                    >
                      <span className={`status-pill ${stay.status}`}>
                        {stay.status === "pending"
                          ? "Setup in progress"
                          : "Active"}
                      </span>
                      <strong>
                        {stay.name ||
                          stay.houseInfo?.cityStateZip ||
                          `Household ${stay.referralCode ?? ""}`}
                      </strong>
                      <span>
                        {membership.role === "host"
                          ? "You’re the host"
                          : "You’re a guest"}
                      </span>
                      <span className="stay-hub-open">
                        Open stay <ArrowRight size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No active stays right now. Start a new stay whenever you’re
                  ready.
                </p>
              )}
            </section>
            <section className="stay-hub-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Saved for reference</p>
                  <h2>Past stays</h2>
                </div>
              </div>
              {pastStays.length ? (
                <div className="stay-hub-grid">
                  {pastStays.map(({ stay, membership }) => (
                    <button
                      className="stay-hub-card past"
                      type="button"
                      key={stay._id}
                      onClick={() => onSelectStay(stay._id)}
                    >
                      <span className="status-pill ended">Ended</span>
                      <strong>
                        {stay.name ||
                          stay.houseInfo?.cityStateZip ||
                          `Household ${stay.referralCode ?? ""}`}
                      </strong>
                      <span>
                        {membership.role === "host"
                          ? "You hosted this stay"
                          : "You were a guest"}{" "}
                        · History is read-only
                      </span>
                      <span className="stay-hub-open">
                        View history <ArrowRight size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  Ended stays will stay here so you can refer back to their
                  history.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
