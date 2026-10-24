"use client";
import { UserButton } from "@clerk/nextjs";

import {
  BookOpen,
  ClipboardList,
  Home,
  KeyRound,
  Landmark,
  Settings,
  ShoppingBasket,
  Sparkles,
  Users,
} from "lucide-react";

import Link from "next/link";

import type { Id } from "@/convex/_generated/dataModel";

import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { GuestOnboardingFlow } from "@/components/onboarding/guest-onboarding-flow";
import { JoinHouseholdCard } from "@/components/referral/join-household";

import {
  KouchdGuideBanner,
  KouchdGuideModal,
} from "@/components/knock/kouchd-guides";

import { ShoppingList } from "@/components/household/shopping-list";
import { CheckInBoard } from "@/components/household/check-in-board";

import { DashboardSkeleton } from "@/components/skeleton-loader";
import { DestructiveConfirmationDialog } from "@/components/confirmation/destructive-confirmation-dialog";

import { GuidedTour } from "@/components/onboarding/guided-tour";

import { NotificationBellMenu } from "@/components/notifications/dashboard-notifications";

import { MobileHeaderMenu } from "@/components/navigation/header-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";
import { FeatureGate } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";

import dynamic from "next/dynamic";
import { useLiveStay } from "./use-live-stay";
const WorkspacePanels = dynamic(
  () => import("./workspace-panels").then((m) => m.WorkspacePanels),
  { loading: () => <DashboardSkeleton message="Opening this section…" /> },
);
const StayScreen = dynamic(
  () => import("./stay-screen").then((m) => m.StayScreen),
  { loading: () => <DashboardSkeleton message="Opening this section…" /> },
);
const ChoresScreen = dynamic(
  () => import("./chores-screen").then((m) => m.ChoresScreen),
  { loading: () => <DashboardSkeleton message="Opening this section…" /> },
);
const ContributionsScreen = dynamic(
  () => import("./contributions-screen").then((m) => m.ContributionsScreen),
  { loading: () => <DashboardSkeleton message="Opening this section…" /> },
);
const HomeScreen = dynamic(
  () => import("./home-screen").then((m) => m.HomeScreen),
  { loading: () => <DashboardSkeleton message="Opening this section…" /> },
);
export function LiveStay({
  stayId,
  onBackToHub,
}: {
  stayId: Id<"stays">;
  onBackToHub: () => void;
}) {
  const state = useLiveStay(stayId, onBackToHub);
  const {
    stayTitle,
    stayDatesSummary,
    visibleScreen,
    setScreen,
    setPanel,
    viewer,
    isHost,
    canShowTour,
    openTour,
    setJoinModalOpen,
    notifications,
    isEnded,
    balance,
    hasAccepted,
    setGuestOnboardingOpen,
    guestMembers,
    asOfDate,
    bundle,
    notify,
    setDestructiveAction,
    panel,
    guestOnboardingOpen,
    joinModalOpen,
    isTourVisible,
    guideRole,
    visibleTourStep,
    moveTour,
    skipTour,
    pauseTour,
    destructiveAction,
    confirmDestructiveAction,
    notice,
  } = state;
  if (!state.ready)
    return <DashboardSkeleton message="Pulling the shared record together…" />;
  return (
    <div className="v21-workspace-root">
      {/* Desktop Navigation Sidebar (Figma V2.1) */}
      <aside className="v21-sidebar" aria-label="Stay sidebar navigation">
        <Link
          className="v21-sidebar-brand"
          href="/"
          style={{ textDecoration: "none" }}
        >
          <KouchdWordmark size="md" theme="cream" />
        </Link>

        {/* Stay Switcher Button */}
        <button
          type="button"
          className="v21-stay-switcher"
          onClick={onBackToHub}
          title="Switch household or view all stays"
        >
          <div className="v21-stay-switcher-copy">
            <span className="v21-stay-switcher-name">{stayTitle}</span>
            <span className="v21-stay-switcher-meta">{stayDatesSummary}</span>
          </div>
          <img
            src="/dashboard-v21/chevron-down.svg"
            alt=""
            className="v21-stay-switcher-chevron"
            aria-hidden="true"
          />
        </button>

        <span className="v21-sidebar-section-title">Stay Workspace</span>

        {/* Sidebar Nav Items */}
        <nav className="v21-sidebar-nav" aria-label="Primary navigation">
          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "home" ? "active" : ""}`}
            onClick={() => setScreen("home")}
          >
            <span className="v21-sidebar-nav-icon">
              <span
                className="v21-sidebar-nav-icon-image v21-sidebar-nav-icon-overview"
                aria-hidden="true"
              />
            </span>
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "stay" ? "active" : ""}`}
            onClick={() => setScreen("stay")}
          >
            <span className="v21-sidebar-nav-icon">
              <span
                className="v21-sidebar-nav-icon-image v21-sidebar-nav-icon-guests"
                aria-hidden="true"
              />
            </span>
            <span>Guests</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "contributions" ? "active" : ""}`}
            onClick={() => setScreen("contributions")}
          >
            <span className="v21-sidebar-nav-icon">
              <span
                className="v21-sidebar-nav-icon-image v21-sidebar-nav-icon-contributions"
                aria-hidden="true"
              />
            </span>
            <span>Ledger</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "chores" ? "active" : ""}`}
            onClick={() => setScreen("chores")}
          >
            <span className="v21-sidebar-nav-icon">
              <span
                className="v21-sidebar-nav-icon-image v21-sidebar-nav-icon-chores"
                aria-hidden="true"
              />
            </span>
            <span>Chores</span>
          </button>

          <FeatureGate flag={FEATURE_FLAGS.SHOPPING_LIST}>
            <button
              type="button"
              className={`v21-sidebar-nav-item ${visibleScreen === "shopping" ? "active" : ""}`}
              onClick={() => setScreen("shopping")}
            >
              <span className="v21-sidebar-nav-icon">
                <ShoppingBasket size={18} />
              </span>
              <span>Shopping list</span>
            </button>
          </FeatureGate>

          <FeatureGate flag={FEATURE_FLAGS.CHECK_IN_BOARD}>
            <button
              type="button"
              className={`v21-sidebar-nav-item ${visibleScreen === "checkins" ? "active" : ""}`}
              onClick={() => setScreen("checkins")}
            >
              <span className="v21-sidebar-nav-icon">
                <Users size={18} />
              </span>
              <span>House check-ins</span>
            </button>
          </FeatureGate>

          <button
            type="button"
            className="v21-sidebar-nav-item"
            onClick={() => setPanel("houseInfo")}
          >
            <span className="v21-sidebar-nav-icon">
              <span
                className="v21-sidebar-nav-icon-image v21-sidebar-nav-icon-guide"
                aria-hidden="true"
              />
            </span>
            <span>House guide</span>
          </button>
        </nav>

        <div className="v21-sidebar-spacer" />

        {/* Sidebar Footer User Info */}
        <div className="v21-sidebar-footer">
          <div className="v21-sidebar-account">
            <span className="v21-sidebar-user-name">
              {viewer?.name && viewer.name !== "Kouchd member"
                ? viewer.name
                : isHost
                  ? "Host"
                  : "Household member"}
            </span>
            <span className="v21-sidebar-user-role">
              {isHost ? "Host account" : "Guest account"}
            </span>
          </div>
          <UserButton />
        </div>
      </aside>

      {/* Main Area */}
      <div className="v21-main-area">
        <header className="v21-top-bar">
          <div className="v21-top-bar-mobile-brand">
            <Link className="brand" href="/" style={{ textDecoration: "none" }}>
              <KouchdWordmark size="md" className="topbar-wordmark" />
            </Link>
          </div>

          <div className="v21-top-bar-context">
            <span>{stayTitle}</span>
            <span aria-hidden="true">·</span>
            <strong>
              {visibleScreen === "home"
                ? "Home"
                : visibleScreen === "contributions"
                  ? "Ledger"
                  : visibleScreen === "chores"
                    ? "Chores"
                    : visibleScreen === "shopping"
                      ? "Shopping"
                      : visibleScreen === "checkins"
                        ? "Check-ins"
                        : "Stay details"}
            </strong>
          </div>

          <div className="v21-top-bar-actions">
            <div className="topbar-desktop-only">
              {canShowTour && openTour && (
                <Tooltip
                  content="Interactive walkthrough of features"
                  position="bottom"
                >
                  <button
                    aria-label="Take the guided tour"
                    className="button soft compact tour-entry"
                    onClick={openTour}
                    title="Take the guided tour"
                    type="button"
                  >
                    <Sparkles size={15} />
                    <span>Tour</span>
                  </button>
                </Tooltip>
              )}

              <Tooltip
                content="Switch or view other household stays"
                position="bottom"
              >
                <button
                  className="button soft compact stays-entry"
                  type="button"
                  onClick={onBackToHub}
                  title="Switch or view stays"
                >
                  <Users size={15} />
                  <span>All stays</span>
                </button>
              </Tooltip>

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

              <Tooltip
                content="Enter a host referral code to join"
                position="bottom"
              >
                <button
                  aria-label="Join with code"
                  className="button soft compact join-code-entry"
                  type="button"
                  onClick={() => setJoinModalOpen(true)}
                  style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                  title="Join household with referral code"
                >
                  <KeyRound size={15} />
                  <span>Join with code</span>
                </button>
              </Tooltip>

              <Tooltip
                content="Notification delivery preferences"
                position="bottom"
              >
                <button
                  className="icon-button compact settings-entry"
                  type="button"
                  onClick={() => setPanel("settings")}
                  aria-label="Notification settings"
                  title="Notification delivery preferences"
                >
                  <Settings size={19} />
                </button>
              </Tooltip>
            </div>

            <NotificationBellMenu
              notifications={notifications ?? []}
              onOpenSettings={() => setPanel("settings")}
            />

            <MobileHeaderMenu
              onTakeTour={canShowTour ? openTour : undefined}
              onStays={onBackToHub}
              onJoinCode={() => setJoinModalOpen(true)}
              onSettings={() => setPanel("settings")}
              docsHref="https://help.kouchd.com"
            />

            <div className="desktop-hide">
              <UserButton />
            </div>
          </div>
        </header>

        <main className="v21-content-container">
          {isEnded && (
            <div className="agreement-callout ended-stay-notice">
              <div>
                <Users size={21} />
                <div>
                  <strong>This stay has ended.</strong>
                  <span>
                    You’re viewing its history. Records are read-only.
                  </span>
                </div>
              </div>
              <span className="accepted-pill">Past stay</span>
            </div>
          )}
          <KouchdGuideBanner guideKey="household-notice-banner" />
          {balance > 0 && <KouchdGuideBanner guideKey="payment-grace-banner" />}
          <KouchdGuideModal guideKey="welcome-modal" />
          {!isEnded && !hasAccepted && !isHost && (
            <div
              className="agreement-callout"
              style={{
                background: "#eef6f0",
                borderColor: "#b8d2c1",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <Sparkles size={22} color="var(--green, #184f3a)" />
                <div>
                  <strong>Review Household Agreement & House Rules</strong>
                  <span>
                    The host has established living expectations and terms. Take
                    a moment to review and accept them.
                  </span>
                </div>
              </div>
              <button
                className="button primary"
                type="button"
                onClick={() => setGuestOnboardingOpen(true)}
              >
                Review Agreement
              </button>
            </div>
          )}
          {visibleScreen === "home" && (
            <HomeScreen state={state} onBackToHub={onBackToHub} />
          )}
          {visibleScreen === "contributions" &&
            (state.ledgerReady ? (
              <ContributionsScreen state={state} />
            ) : (
              <DashboardSkeleton message="Opening the ledger…" />
            ))}
          {visibleScreen === "chores" && <ChoresScreen state={state} />}
          {visibleScreen === "shopping" && (
            <FeatureGate
              flag={FEATURE_FLAGS.SHOPPING_LIST}
              fallback={
                <div className="empty-state">
                  <p>Shopping list is currently disabled.</p>
                </div>
              }
            >
              <ShoppingList
                stayId={stayId}
                viewerId={bundle.membership.userId}
                isHost={Boolean(isHost)}
                isEnded={isEnded}
              />
            </FeatureGate>
          )}
          {visibleScreen === "checkins" && (
            <FeatureGate
              flag={FEATURE_FLAGS.CHECK_IN_BOARD}
              fallback={
                <div className="empty-state">
                  <p>Check-in board is currently disabled.</p>
                </div>
              }
            >
              <CheckInBoard
                stayId={stayId}
                viewerId={bundle.membership.userId}
                isHost={Boolean(isHost)}
                isEnded={isEnded}
                today={asOfDate ?? ""}
                guests={guestMembers.map((guest) => ({
                  id: guest.person.id,
                  name:
                    guest.person.name && guest.person.name !== "Kouchd member"
                      ? guest.person.name
                      : "Guest",
                }))}
              />
            </FeatureGate>
          )}
          {visibleScreen === "stay" && <StayScreen state={state} />}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {(
          [
            { id: "home", label: "Home", icon: Home },
            { id: "contributions", label: "Ledger", icon: Landmark },
            { id: "chores", label: "Chores", icon: ClipboardList },
            { id: "stay", label: "Stay", icon: Users },
          ] as const
        ).map((item) => (
          <button
            className={`nav-item ${visibleScreen === item.id ? "active" : ""}`}
            type="button"
            key={item.id}
            onClick={() => setScreen(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {panel && (!isEnded || panel === "settings") && (
        <WorkspacePanels state={state} />
      )}
      {guestOnboardingOpen && !isEnded && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGuestOnboardingOpen(false);
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 740, padding: "1.5rem" }}
          >
            <GuestOnboardingFlow
              stayId={stayId}
              onComplete={() => {
                setGuestOnboardingOpen(false);
                notify("Household agreement accepted!");
              }}
              onCancel={() => setGuestOnboardingOpen(false)}
            />
          </section>
        </div>
      )}
      {joinModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setJoinModalOpen(false);
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: 580, padding: "1.5rem" }}
          >
            <JoinHouseholdCard
              onJoined={() => {
                setJoinModalOpen(false);
                notify("Successfully joined household!");
              }}
              onCancel={() => setJoinModalOpen(false)}
            />
          </section>
        </div>
      )}
      {isTourVisible && guideRole && (
        <GuidedTour
          role={guideRole}
          step={visibleTourStep}
          onBack={() => moveTour(-1)}
          onNext={() => moveTour(1)}
          onSkip={skipTour}
          onClose={pauseTour}
        />
      )}
      {destructiveAction && (
        <DestructiveConfirmationDialog
          title={
            destructiveAction.type === "end"
              ? "End this stay?"
              : `Cancel “${destructiveAction.title}”?`
          }
          description={
            destructiveAction.type === "end"
              ? "Guests will no longer be able to add to this stay. Its agreements and history will remain available under Past stays, and you can start another stay."
              : `This removes “${destructiveAction.title}” from the guest’s balance. The charge history will be retained.`
          }
          confirmLabel={
            destructiveAction.type === "end" ? "End stay" : "Cancel charge"
          }
          onConfirm={confirmDestructiveAction}
          onCancel={() => setDestructiveAction(null)}
        />
      )}
      <div
        className={`toast ${notice ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    </div>
  );
}
