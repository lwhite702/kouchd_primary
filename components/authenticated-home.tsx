"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, Bell, BookOpen, Check, ClipboardList, Copy, Home, KeyRound, Landmark, Megaphone, Plus, ReceiptText, Settings, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { addCalendarDays, calendarDateInTimezone } from "@/lib/domain/dates";
import { confirmedCreditCents } from "@/lib/domain/pricing";
import { createInviteToken, hashInviteToken } from "@/lib/invite";

import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { LandingPage } from "@/components/landing-page";
import { HostOnboardingWizard } from "@/components/onboarding/host-onboarding-wizard";
import { GuestOnboardingFlow } from "@/components/onboarding/guest-onboarding-flow";
import { JoinHouseholdCard } from "@/components/referral/join-household";
import { RewardsHub } from "@/components/rewards/rewards-hub";
import { KnockGuidesProvider } from "@/components/knock/knock-guides-provider";
import { KouchdGuideBanner, KouchdGuideModal } from "@/components/knock/kouchd-guides";
import { HouseholdLogisticsCard, HouseInfoForm } from "@/components/household/household-logistics";
import { PaymentOptionsCard, PaymentOptionsForm } from "@/components/household/payment-options";
import { PaymentScheduleCard } from "@/components/household/payment-schedule-card";
import { OccupancyCaptureCard } from "@/components/household/occupancy-capture-card";
import { GuestAgreementForm, GuestTerms } from "@/components/household/guest-agreement-form";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { DestructiveConfirmationDialog } from "@/components/confirmation/destructive-confirmation-dialog";
import { HelpTip } from "@/components/onboarding/help-tip";
import { GuidedTour, guideSteps } from "@/components/onboarding/guided-tour";
import type { GuideRole } from "@/components/onboarding/guided-tour";
import { DashboardNotificationFeed, NotificationBellMenu } from "@/components/notifications/dashboard-notifications";
import type { NotificationItem } from "@/components/notifications/dashboard-notifications";
import { MobileHeaderMenu } from "@/components/navigation/header-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";
import "@/components/dashboard-v21.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Member = { membership: Doc<"memberships">; person: { id: Id<"users">; name: string; imageUrl?: string }; terms?: Doc<"terms"> | null };
type StayBundle = { stay: Doc<"stays">; terms: Doc<"terms"> | null; membership: Doc<"memberships">; members: Member[] };
type LedgerItem = {
  _id: Id<"obligations">;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  baseAmountCents: number;
  type: "cadence" | "adhoc" | "occupancy";
  title?: string;
  earlyDiscountCents: number;
  lateFeeCents: number;
  lateFeeOccurrences: number;
  effectiveChargeCents: number;
  creditedCents: number;
  balanceCents: number;
  status: "upcoming" | "due" | "late" | "paid";
  lateFeeWaived: boolean;
};
type Screen = "home" | "contributions" | "chores" | "stay";
type Panel = "contribution" | "chore" | "adhoc" | "announcement" | "settings" | "invite" | "houseInfo" | "paymentOptions" | "guestTerms" | null;
type GuideProgressState = { step: number; status: "in_progress" | "completed" | "skipped" };
type GuideProgress = Partial<Record<GuideRole, GuideProgressState>>;
type Viewer = { id: Id<"users">; name: string; email?: string; phone?: string; notifyEmail: boolean; notifySms: boolean; guideProgress?: GuideProgress };

function formatMoney(cents: number) { return money.format(cents / 100); }
function formatDate(value: string) { return date.format(new Date(`${value}T00:00:00Z`)); }
function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }

export function AuthenticatedHome() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage hasClerk={true} />
      </Show>
      <Show when="signed-in">
        <SyncedWorkspace />
      </Show>
    </>
  );
}

function SyncedWorkspace() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();
  const syncCurrent = useMutation(api.users.syncCurrent);
  const syncedProfileRef = useRef<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [selectedStayId, setSelectedStayId] = useState<Id<"stays"> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !clerkLoaded || !clerkUser) return;
    const resolvedName = clerkUser?.fullName
      || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim()
      || clerkUser?.username
      || undefined;
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const profileKey = JSON.stringify([clerkUser.id, resolvedName ?? "", email ?? "", clerkUser.imageUrl ?? ""]);

    if (syncedProfileRef.current === profileKey) return;
    syncedProfileRef.current = profileKey;

    void syncCurrent({
      clerkName: resolvedName,
      email,
      imageUrl: clerkUser?.imageUrl,
    })
      .then(() => setSynced(true))
      .catch((err) => {
        console.error("Workspace sync error:", err);
        setSyncError("We could not prepare your private workspace.");
      });
  }, [isAuthenticated, clerkLoaded, clerkUser, syncCurrent]);

  const stays = useQuery(api.stays.listMine, synced ? {} : "skip") as Array<{ stay: Doc<"stays">; membership: Doc<"memberships"> }> | undefined;

  if (syncError) {
    return (
      <main className="route-state">
        <h1>Sign-in needs a reset.</h1>
        <p className="muted">{syncError}</p>
        <button
          className="button primary"
          type="button"
          style={{ marginTop: "1rem" }}
          onClick={() => {
            syncedProfileRef.current = null;
            setSyncError("");
            const resolvedName = clerkUser?.fullName
              || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim()
              || clerkUser?.username
              || undefined;
            void syncCurrent({
              clerkName: resolvedName,
              email: clerkUser?.primaryEmailAddress?.emailAddress,
              imageUrl: clerkUser?.imageUrl,
            })
              .then(() => setSynced(true))
              .catch((err) => {
                console.error("Workspace sync retry error:", err);
                setSyncError("We could not prepare your private workspace.");
              });
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  if (authLoading || !isAuthenticated || !synced || stays === undefined) {
    return <DashboardSkeleton message="Setting out the clean sheets..." />;
  }
  if (stays.length === 0) {
    return (
      <KnockGuidesProvider>
        <GetStartedHub onHostStayCreated={setSelectedStayId} />
      </KnockGuidesProvider>
    );
  }
  const selectedStay = selectedStayId ? stays.find((item) => item.stay._id === selectedStayId) : undefined;
  if (!selectedStay) return <StayHub stays={stays} onSelectStay={setSelectedStayId} onHostStayCreated={setSelectedStayId} />;
  return (
    <KnockGuidesProvider
      userId={selectedStay.membership.userId}
      userProperties={{
        stayId: selectedStay.stay._id,
        role: selectedStay.membership.role,
        stayStatus: selectedStay.stay.status,
      }}
    >
      <LiveStay stayId={selectedStay.stay._id} onBackToHub={() => setSelectedStayId(null)} />
    </KnockGuidesProvider>
  );
}

function AccountHeader({
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
        {/* Desktop-only direct utility buttons with clear labels */}
        <div className="topbar-desktop-only">
          {onTakeTour && (
            <Tooltip content="Interactive walkthrough of features" position="bottom">
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
          )}
          {onStays && (
            <Tooltip content="Switch or view other household stays" position="bottom">
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
          <Tooltip content="Browse setup guides, ledger instructions & rules" position="bottom">
            <a
              className="button ghost compact docs-entry"
              href={HELP_LINKS.home}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", padding: "4px 10px", color: "var(--muted)", textDecoration: "none" }}
              title="Guides & Documentation"
            >
              <BookOpen size={15} /> Docs
            </a>
          </Tooltip>
          {onJoinCode && (
            <Tooltip content="Enter a host referral code to join" position="bottom">
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
            <Tooltip content="Notification delivery preferences" position="bottom">
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
        <NotificationBellMenu notifications={notifications ?? []} onOpenSettings={onSettings} />

        {/* Mobile menu with clear icon, title, and descriptive subtitles */}
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

function GetStartedHub({ onHostStayCreated }: { onHostStayCreated: (stayId: Id<"stays">) => void }) {
  const [tab, setTab] = useState<"host" | "join">("host");

  return (
    <div className="app-shell production-shell">
      <AccountHeader />
      <main style={{ padding: "1.5rem 1rem 4rem" }}>
        <div style={{ maxWidth: 440, margin: "0 auto 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
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
            href={tab === "host" ? HELP_LINKS.hostsGettingStarted : HELP_LINKS.joiningAStay}
          >
            {tab === "host"
              ? "Set the dates, contribution plan, house rules, and any optional rewards before you invite guests."
              : "Enter the referral code shared by your host. After joining, review and accept the household agreement to finish setup."}
          </HelpTip>
        </div>

        <a className="onboarding-help-card" href={tab === "host" ? HELP_LINKS.hostsGettingStarted : HELP_LINKS.joiningAStay} target="_blank" rel="noopener noreferrer">
          <span className="onboarding-help-icon"><BookOpen size={19} /></span>
          <span><strong>{tab === "host" ? "Host setup guide" : "Guest joining guide"}</strong><small>{tab === "host" ? "Plan dates, terms, house rules, and invites." : "See what you’ll review before joining a stay."}</small></span>
          <ArrowRight size={17} aria-hidden="true" />
        </a>

        {tab === "host" ? (
          <HostOnboardingWizard onComplete={onHostStayCreated} />
        ) : (
          <JoinHouseholdCard onJoined={() => { /* stay query updates automatically */ }} />
        )}
      </main>
    </div>
  );
}

type StayMembershipSummary = { stay: Doc<"stays">; membership: Doc<"memberships"> };

function StayHub({ stays, onSelectStay, onHostStayCreated }: { stays: StayMembershipSummary[]; onSelectStay: (stayId: Id<"stays">) => void; onHostStayCreated: (stayId: Id<"stays">) => void }) {
  const [creating, setCreating] = useState(false);
  const currentStays = stays.filter(({ stay }) => stay.status !== "ended");
  const pastStays = stays.filter(({ stay }) => stay.status === "ended");
  const goToCreatedStay = (stayId: Id<"stays">) => {
    setCreating(false);
    onHostStayCreated(stayId);
  };

  return <div className="app-shell production-shell">
    <AccountHeader />
    <main className="stay-hub">
      {creating ? <div className="stay-hub-setup"><div className="page-heading"><div><p className="eyebrow">A fresh start</p><h1>Host a new stay</h1><p className="subhead">Set the dates and agreement, then invite your guests.</p></div><button className="button ghost" type="button" onClick={() => setCreating(false)}>Back to stays</button></div><HostOnboardingWizard onCancel={() => setCreating(false)} onComplete={goToCreatedStay} /></div> : <>
        <div className="page-heading"><div><p className="eyebrow">Your Kouchd stays</p><h1>Choose a stay to open.</h1><p className="subhead">Keep each household’s agreements and history together. You can host more than one stay at a time.</p></div><button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={18} /> Host a new stay</button></div>
        <section className="stay-hub-section"><div className="section-heading"><div><p className="eyebrow">Current and upcoming</p><h2>Active stays</h2></div></div>{currentStays.length ? <div className="stay-hub-grid">{currentStays.map(({ stay, membership }) => <button className="stay-hub-card" type="button" key={stay._id} onClick={() => onSelectStay(stay._id)}><span className={`status-pill ${stay.status}`}>{stay.status === "pending" ? "Setup in progress" : "Active"}</span><strong>{stay.name || stay.houseInfo?.cityStateZip || `Household ${stay.referralCode ?? ""}`}</strong><span>{membership.role === "host" ? "You’re the host" : "You’re a guest"}</span><span className="stay-hub-open">Open stay <ArrowRight size={16} /></span></button>)}</div> : <p className="muted">No active stays right now. Start a new stay whenever you’re ready.</p>}</section>
        <section className="stay-hub-section"><div className="section-heading"><div><p className="eyebrow">Saved for reference</p><h2>Past stays</h2></div></div>{pastStays.length ? <div className="stay-hub-grid">{pastStays.map(({ stay, membership }) => <button className="stay-hub-card past" type="button" key={stay._id} onClick={() => onSelectStay(stay._id)}><span className="status-pill ended">Ended</span><strong>{stay.name || stay.houseInfo?.cityStateZip || `Household ${stay.referralCode ?? ""}`}</strong><span>{membership.role === "host" ? "You hosted this stay" : "You were a guest"} · History is read-only</span><span className="stay-hub-open">View history <ArrowRight size={16} /></span></button>)}</div> : <p className="muted">Ended stays will stay here so you can refer back to their history.</p>}</section>
      </>}
    </main>
  </div>;
}

function LiveStay({ stayId, onBackToHub }: { stayId: Id<"stays">; onBackToHub: () => void }) {
  const { user: clerkUser } = useUser();
  const bundle = useQuery(api.stays.getBundle, { stayId }) as StayBundle | undefined;
  const viewer = useQuery(api.users.viewer, {}) as Viewer | null | undefined;
  const chores = useQuery(api.chores.list, { stayId }) as Doc<"chores">[] | undefined;
  const activities = useQuery(api.activity.list, { stayId }) as Doc<"activity">[] | undefined;
  const announcements = useQuery(api.announcements.list, { stayId }) as Doc<"announcements">[] | undefined;
  const [screen, setScreen] = useState<Screen>("home");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<Id<"users"> | undefined>();
  const [editingGuestId, setEditingGuestId] = useState<Id<"users"> | undefined>();
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMode, setInviteMode] = useState<"text" | "email" | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");
  const [guestOnboardingOpen, setGuestOnboardingOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourSuppressedForRole, setTourSuppressedForRole] = useState<GuideRole | null>(null);
  const [destructiveAction, setDestructiveAction] = useState<{ type: "end" } | { type: "cancelCharge"; obligationId: Id<"obligations">; title: string } | null>(null);

  useEffect(() => {
    const handleLocationHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "contributions" || hash === "chores" || hash === "stay" || hash === "home") {
        setScreen(hash);
      } else if (hash === "rewards") {
        setScreen("contributions");
      } else if (hash === "invite" || hash === "houseInfo" || hash === "contribution") {
        setPanel(hash as Panel);
      } else if (hash === "house-info") {
        setPanel("houseInfo");
      }
    };
    handleLocationHash();
    window.addEventListener("hashchange", handleLocationHash);
    return () => window.removeEventListener("hashchange", handleLocationHash);
  }, []);
  const members = bundle?.members ?? [];
  const guestMembers = members.filter((item) => item.membership.role === "guest" && item.membership.status === "active");
  const isHost = bundle?.membership.role === "host";
  const financialGuestId = isHost ? (selectedGuestId ?? guestMembers[0]?.person.id) : bundle?.membership.userId;
  const asOfDate = bundle ? calendarDateInTimezone(new Date(), bundle.stay.timezone) : null;
  const contributions = useQuery(api.contributions.list, { stayId, guestUserId: financialGuestId }) as Doc<"contributions">[] | undefined;
  const obligations = useQuery(api.obligations.list, asOfDate ? { stayId, asOfDate, guestUserId: financialGuestId } : "skip") as LedgerItem[] | undefined;
  const createContribution = useMutation(api.contributions.create);
  const confirmContribution = useMutation(api.contributions.confirm);
  const createChore = useMutation(api.chores.create);
  const toggleChore = useMutation(api.chores.toggle);
  const createAnnouncement = useMutation(api.announcements.create);
  const createAdhocCharge = useMutation(api.obligations.createAdhocCharge);
  const voidAdhocCharge = useMutation(api.obligations.voidAdhocCharge);
  const waiveLateFee = useMutation(api.obligations.waiveLateFee);
  const createInvite = useMutation(api.invites.create);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const syncCurrent = useMutation(api.users.syncCurrent);
  const updateGuideProgress = useMutation(api.users.updateGuideProgress);
  const updateHouseInfo = useMutation(api.stays.updateHouseInfo);
  const updatePaymentOptions = useMutation(api.stays.updatePaymentOptions);
  const updateGuestTerms = useMutation(api.terms.updateGuest);
  const endStay = useMutation(api.stays.end);

  const activeContributions = (contributions ?? []).filter((entry) => entry.status !== "voided");
  const currentContributions = activeContributions.filter((entry) => !asOfDate || entry.date <= asOfDate);
  const credits = confirmedCreditCents(currentContributions.map((entry) => ({ amountCents: entry.amountCents, countsTowardBalance: entry.countsTowardBalance, status: entry.status })));
  const charge = (obligations ?? []).reduce((total, item) => total + item.effectiveChargeCents, 0);
  const balance = charge - credits;
  const openChores = (chores ?? []).filter((item) => !item.completedAt && !item.voidedAt);
  const recent = useMemo(() => (activities ?? []).slice(0, 5), [activities]);
  const selectedGuestMember = guestMembers.find((item) => item.person.id === financialGuestId);
  const selectedGuest = selectedGuestMember?.person;
  const terms = bundle?.terms;
  const selectedGuestTerms = selectedGuestMember?.terms ?? terms;
  const hasAccepted = bundle?.membership.acceptedTermsId === terms?._id;
  const displayedAgreementTerms = isHost ? selectedGuestTerms : terms;
  const displayedAgreementAccepted = isHost && selectedGuestMember
    ? selectedGuestMember.membership.acceptedTermsId === selectedGuestTerms?._id
    : hasAccepted;
  const guideRole = bundle?.membership.role;

  const storedGuideProgress = guideRole ? viewer?.guideProgress?.[guideRole] : undefined;
  const canShowTour = Boolean(viewer && guideRole && bundle?.stay.status !== "ended" && (guideRole === "host" || hasAccepted));
  const isTourVisible = Boolean(canShowTour && guideRole && (tourOpen || (tourSuppressedForRole !== guideRole && (!storedGuideProgress || storedGuideProgress.status === "in_progress"))));
  const visibleTourStep = tourOpen ? tourStep : storedGuideProgress?.status === "in_progress" && guideRole
    ? Math.min(storedGuideProgress.step, guideSteps[guideRole].length - 1)
    : 0;
  const visibleScreen = isTourVisible && guideRole ? guideSteps[guideRole][visibleTourStep].screen : screen;

  useEffect(() => {
    if (!viewer || !guideRole || (guideRole === "guest" && !hasAccepted) || storedGuideProgress) return;
    void updateGuideProgress({ role: guideRole, step: 0, status: "in_progress" });
  }, [guideRole, hasAccepted, storedGuideProgress, updateGuideProgress, viewer]);

  const persistTourProgress = useCallback((role: GuideRole, step: number, status: GuideProgressState["status"]) => {
    void updateGuideProgress({ role, step, status }).catch((reason) => {
      console.error("Could not save tour progress:", reason);
    });
  }, [updateGuideProgress]);

  const openTour = useCallback(() => {
    if (!guideRole || !viewer) return;
    const progress = viewer.guideProgress?.[guideRole];
    const startAt = progress?.status === "in_progress" ? Math.min(progress.step, guideSteps[guideRole].length - 1) : 0;
    setTourSuppressedForRole(null);
    setTourStep(startAt);
    setScreen(guideSteps[guideRole][startAt].screen);
    setTourOpen(true);
    persistTourProgress(guideRole, startAt, "in_progress");
  }, [guideRole, persistTourProgress, viewer]);

  const pauseTour = useCallback(() => {
    if (guideRole) persistTourProgress(guideRole, visibleTourStep, "in_progress");
    setTourSuppressedForRole(guideRole ?? null);
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);

  const skipTour = useCallback(() => {
    if (guideRole) persistTourProgress(guideRole, visibleTourStep, "skipped");
    setTourSuppressedForRole(guideRole ?? null);
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);

  const moveTour = useCallback((direction: -1 | 1) => {
    if (!guideRole) return;
    const currentStep = visibleTourStep;
    const nextStep = currentStep + direction;
    if (nextStep < 0) return;
    if (nextStep >= guideSteps[guideRole].length) {
      persistTourProgress(guideRole, currentStep, "completed");
      setTourSuppressedForRole(guideRole);
      setTourOpen(false);
      return;
    }
    setTourOpen(true);
    setTourStep(nextStep);
    setScreen(guideSteps[guideRole][nextStep].screen);
    persistTourProgress(guideRole, nextStep, "in_progress");
  }, [guideRole, persistTourProgress, visibleTourStep]);

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2600); }

  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Pending contributions (Host confirms)
    if (isHost && contributions) {
      const pendingForHost = contributions.filter(
        (c) => c.status === "pending" && c.createdBy !== bundle?.membership.userId
      );
      for (const item of pendingForHost) {
        const guestMember = guestMembers.find((g) => g.person.id === item.guestUserId);
        const guestName = guestMember?.person.name && guestMember.person.name !== "Kouchd member" ? guestMember.person.name : "A guest";
        list.push({
          id: `pending_contrib_${item._id}`,
          type: "payment",
          urgency: "notice",
          title: "Contribution needs confirmation",
          description: `${guestName} recorded a ${formatMoney(item.amountCents)} ${item.type.replaceAll("_", " ")} contribution (${item.note || "No note"}).`,
          confirmLabel: "Confirm",
          confirmAction: () => {
            void confirmContribution({ contributionId: item._id }).then(() => notify("Contribution confirmed."));
          },
          actionLabel: "View Ledger",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 2. Pending contributions recorded by guest (Guest view)
    if (!isHost && contributions) {
      const myPending = contributions.filter(
        (c) => c.status === "pending" && c.createdBy === bundle?.membership.userId
      );
      for (const item of myPending) {
        list.push({
          id: `guest_pending_${item._id}`,
          type: "payment",
          urgency: "info",
          title: "Contribution awaiting confirmation",
          description: `Your ${formatMoney(item.amountCents)} ${item.type.replaceAll("_", " ")} entry is logged and awaiting host review.`,
          actionLabel: "View Ledger",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 3. Agreement needing review (Guest view)
    if (!isHost && !hasAccepted) {
      list.push({
        id: `agreement_pending_${terms?._id ?? "terms"}`,
        type: "agreement",
        urgency: "urgent",
        title: "Household agreement requires review",
        description: "The host has set household rules and stay guidelines. Review and accept the agreement.",
        actionLabel: "Review Agreement",
        onAction: () => setGuestOnboardingOpen(true),
      });
    }

    // 4. Overdue or due today obligations
    if (obligations) {
      const overdueOrDue = obligations.filter((o) => (o.status === "late" || o.status === "due") && o.balanceCents > 0);
      for (const item of overdueOrDue) {
        list.push({
          id: `obligation_${item._id}`,
          type: "payment",
          urgency: item.status === "late" ? "urgent" : "notice",
          title: item.status === "late" ? `Overdue payment (${formatMoney(item.balanceCents)})` : `Payment due today (${formatMoney(item.balanceCents)})`,
          description: `${item.title ?? "Scheduled contribution"} due ${formatDate(item.dueDate)}. ${item.lateFeeCents > 0 && !item.lateFeeWaived ? `Late fee applied.` : ""}`,
          actionLabel: "View Breakdown",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 5. Chores due today or overdue
    if (chores && asOfDate) {
      const urgentChores = chores.filter((c) => !c.completedAt && !c.voidedAt && c.dueDate <= asOfDate);
      if (urgentChores.length > 0) {
        list.push({
          id: `chores_due_${asOfDate}`,
          type: "chore",
          urgency: "notice",
          title: `${urgentChores.length} chore${urgentChores.length === 1 ? "" : "s"} due today`,
          description: urgentChores.map((c) => c.title).slice(0, 2).join(", ") + (urgentChores.length > 2 ? ` and ${urgentChores.length - 2} more.` : "."),
          actionLabel: "Open Chore Board",
          onAction: () => setScreen("chores"),
        });
      }
    }

    // 6. Recent announcements
    if (announcements && announcements.length > 0) {
      const latest = announcements[0];
      list.push({
        id: `announcement_${latest._id}`,
        type: "announcement",
        urgency: "info",
        title: `Announcement: ${latest.title}`,
        description: latest.body,
        actionLabel: "View Notes",
        onAction: () => setScreen("home"),
      });
    }

    return list;
  }, [
    isHost,
    contributions,
    bundle?.membership.userId,
    guestMembers,
    confirmContribution,
    hasAccepted,
    terms?._id,
    obligations,
    chores,
    asOfDate,
    announcements,
  ]);

  if (!bundle || !viewer || !chores || !activities || !announcements || !contributions || !obligations) return <DashboardSkeleton message="Pulling the shared record together..." />;
  const isEnded = bundle.stay.status === "ended";
  async function makeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const delivery = String((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "text"); const email = value(form, "email");
    if (delivery === "email" && !email) { setInviteError("Enter the guest’s email address to send an email invitation."); return; }
    const token = createInviteToken(); const url = `${window.location.origin}/invite/${token}`;
    setInviteError("");
    setIsSubmittingModal(true);
    try {
      await createInvite({ stayId, tokenHash: await hashInviteToken(token), invitedEmail: delivery === "email" ? email : undefined, inviteUrl: url, expiresAt: Date.now() + 7 * 86_400_000 });
      setInviteMode(delivery === "email" ? "email" : "text");
      setInviteUrl(url); notify(delivery === "email" ? "Email invitation sent." : "Invite link ready to copy.");
    } catch (reason) {
      setInviteError(reason instanceof Error ? reason.message : "Could not create the invitation.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!financialGuestId) return; const form = new FormData(event.currentTarget);
    setIsSubmittingModal(true);
    try {
      await createContribution({ stayId, guestUserId: financialGuestId, type: value(form, "type") as "payment" | "groceries" | "supplies" | "house_work" | "other", amountCents: Math.round(Number(value(form, "amount")) * 100), date: value(form, "date"), note: value(form, "note"), countsTowardBalance: form.get("counts") === "on" });
      setPanel(null); notify("Contribution added for confirmation.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function addCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!financialGuestId) return; const form = new FormData(event.currentTarget);
    setIsSubmittingModal(true);
    try {
      await createAdhocCharge({ stayId, guestUserId: financialGuestId, title: value(form, "title"), amountCents: Math.round(Number(value(form, "amount")) * 100), effectiveDate: value(form, "effectiveDate"), dueDate: value(form, "dueDate") });
      setPanel(null); notify("One-off charge added and recorded.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function addChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const assigneeUserId = value(form, "assigneeUserId") as Id<"users"> | "";
    setIsSubmittingModal(true);
    try {
      await createChore({ stayId, title: value(form, "title"), note: value(form, "note"), assignee: assigneeUserId ? "guest" : "shared", assigneeUserId: assigneeUserId || undefined, dueDate: value(form, "dueDate") });
      setPanel(null); notify("Chore added.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function addAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setIsSubmittingModal(true);
    try {
      await createAnnouncement({ stayId, title: value(form, "title"), body: value(form, "body"), pinnedUntil: value(form, "pinnedUntil") || undefined });
      setPanel(null); notify("Announcement shared with the household.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setIsSubmittingModal(true);
    try {
      const displayName = value(form, "name");
      if (!displayName) throw new Error("Enter your name before saving.");
      if (!clerkUser) throw new Error("Your Clerk profile is still loading. Try again in a moment.");
      const [firstName, ...lastNameParts] = displayName.split(/\s+/);
      const updatedClerkUser = await clerkUser.update({ firstName, lastName: lastNameParts.join(" ") });
      await syncCurrent({
        clerkName: updatedClerkUser.fullName || displayName,
        email: updatedClerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: updatedClerkUser.imageUrl,
      });
      await updatePreferences({
        phone: value(form, "phone") || undefined,
        notifyEmail: form.get("notifyEmail") === "on",
        notifySms: form.get("notifySms") === "on"
      });
      setPanel(null); notify("Profile and reminder preferences saved.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save your profile and reminder preferences.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function saveHouseInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateHouseInfo({
      stayId,
      houseInfo: {
        wifiNetwork: value(form, "wifiNetwork") || undefined,
        wifiPassword: value(form, "wifiPassword") || undefined,
        streetAddress: value(form, "streetAddress") || undefined,
        unit: value(form, "unit") || undefined,
        cityStateZip: value(form, "cityStateZip") || undefined,
        doorCode: value(form, "doorCode") || undefined,
        parkingNotes: value(form, "parkingNotes") || undefined,
        trashDay: value(form, "trashDay") || undefined,
        emergencyContact: value(form, "emergencyContact") || undefined,
        otherNotes: value(form, "otherNotes") || undefined,
      },
    });
    setPanel(null);
    notify("Household guide & access info updated.");
  }
  async function savePaymentOptions(options: NonNullable<Doc<"stays">["paymentOptions"]>) {
    setIsSubmittingModal(true);
    try {
      await updatePaymentOptions({ stayId, paymentOptions: options });
      setPanel(null); notify("External payment options saved.");
    } finally {
      setIsSubmittingModal(false);
    }
  }
  async function saveGuestAgreement(updatedTerms: GuestTerms) {
    if (!editingGuestId) return;
    setIsSubmittingModal(true);
    try {
      await updateGuestTerms({ stayId, guestUserId: editingGuestId, terms: updatedTerms });
      const guestName = guestMembers.find((guest) => guest.person.id === editingGuestId)?.person.name ?? "Guest";
      setPanel(null);
      notify(`${guestName}'s agreement updated. They need to review and accept it.`);
    } finally {
      setIsSubmittingModal(false);
    }
  }

  async function confirmDestructiveAction() {
    if (destructiveAction?.type === "end") {
      await endStay({ stayId });
      notify("Stay ended. The record is retained in Past stays.");
      onBackToHub();
    } else if (destructiveAction?.type === "cancelCharge") {
      await voidAdhocCharge({ obligationId: destructiveAction.obligationId });
      notify("Charge cancelled. Its history is retained.");
    }
  }

  const guestDisplayName = selectedGuest?.name && selectedGuest.name !== "Kouchd member" ? selectedGuest.name : "Guest";
  const ledgerLabel = isHost ? `${guestDisplayName}'s private ledger` : "Your private ledger";
  const stayTitle = bundle.stay.name || bundle.stay.houseInfo?.cityStateZip || "Lake House Weekend";
  const stayDatesSummary = terms ? `${formatDate(terms.startDate)} to ${formatDate(terms.endDate)}` : "Dates pending";

  return (
    <div className="v21-workspace-root">
      {/* Desktop Navigation Sidebar (Figma V2.1) */}
      <aside className="v21-sidebar" aria-label="Stay sidebar navigation">
        <Link className="v21-sidebar-brand" href="/" style={{ textDecoration: "none" }}>
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
          <img src="/dashboard-v21/chevron-down.svg" alt="" className="v21-stay-switcher-chevron" aria-hidden="true" />
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
              <img src="/dashboard-v21/nav-overview.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
            </span>
            <span>Overview</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "stay" ? "active" : ""}`}
            onClick={() => setScreen("stay")}
          >
            <span className="v21-sidebar-nav-icon">
              <img src="/dashboard-v21/nav-guests.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
            </span>
            <span>Guests</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "contributions" ? "active" : ""}`}
            onClick={() => setScreen("contributions")}
          >
            <span className="v21-sidebar-nav-icon">
              <img src="/dashboard-v21/nav-contributions.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
            </span>
            <span>Contributions</span>
          </button>

          <button
            type="button"
            className={`v21-sidebar-nav-item ${visibleScreen === "chores" ? "active" : ""}`}
            onClick={() => setScreen("chores")}
          >
            <span className="v21-sidebar-nav-icon">
              <img src="/dashboard-v21/nav-chores.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
            </span>
            <span>Chores</span>
          </button>

          <button
            type="button"
            className="v21-sidebar-nav-item"
            onClick={() => setPanel("houseInfo")}
          >
            <span className="v21-sidebar-nav-icon">
              <img src="/dashboard-v21/nav-guide.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
            </span>
            <span>House guide</span>
          </button>
        </nav>

        <div className="v21-sidebar-spacer" />

        {/* Sidebar Footer User Info */}
        <div className="v21-sidebar-footer">
          <div className="v21-sidebar-account">
            <span className="v21-sidebar-user-name">
              {viewer?.name && viewer.name !== "Kouchd member" ? viewer.name : (isHost ? "Host" : "Household member")}
            </span>
            <span className="v21-sidebar-user-role">{isHost ? "Host account" : "Guest account"}</span>
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

          <div className="v21-top-bar-actions">
            {canShowTour && openTour && (
              <Tooltip content="Interactive walkthrough of features" position="bottom">
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

            <Tooltip content="Switch or view other household stays" position="bottom">
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

            <Tooltip content="Browse setup guides, ledger instructions & rules" position="bottom">
              <a
                className="button ghost compact docs-entry"
                href={HELP_LINKS.home}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.8rem", padding: "4px 10px", color: "var(--muted)", textDecoration: "none" }}
                title="Guides & Documentation"
              >
                <BookOpen size={15} /> Docs
              </a>
            </Tooltip>

            <Tooltip content="Enter a host referral code to join" position="bottom">
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

            <Tooltip content="Notification delivery preferences" position="bottom">
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

            <NotificationBellMenu notifications={notifications ?? []} onOpenSettings={() => setPanel("settings")} />

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
                  <span>You’re viewing its history. Records are read-only.</span>
                </div>
              </div>
              <span className="accepted-pill">Past stay</span>
            </div>
          )}
          <KouchdGuideBanner guideKey="household-notice-banner" />
          {balance > 0 && <KouchdGuideBanner guideKey="payment-grace-banner" />}
          <KouchdGuideModal guideKey="welcome-modal" />
    {!isEnded && !hasAccepted && !isHost && (
      <div className="agreement-callout" style={{ background: "#eef6f0", borderColor: "#b8d2c1", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Sparkles size={22} color="var(--green, #184f3a)" />
          <div>
            <strong>Review Household Agreement & House Rules</strong>
            <span>The host has established living expectations and terms. Take a moment to review and accept them.</span>
          </div>
        </div>
        <button className="button primary" type="button" onClick={() => setGuestOnboardingOpen(true)}>
          Review Agreement
        </button>
      </div>
    )}
    {visibleScreen === "home" && (
      <div key="home" className="screen-transition">
        <DashboardNotificationFeed notifications={notifications} onOpenSettings={() => setPanel("settings")} />

        {/* 1. Host Heading & Top Invite CTA */}
        <section className="v21-host-heading">
          <div className="v21-host-heading-copy">
            <span className="v21-role-pill">{isHost ? "Host" : "Guest"}</span>
            <h1 className="v21-stay-title">{stayTitle}</h1>
            <p className="v21-stay-subhead">
              {stayDatesSummary} · {guestMembers.length} {guestMembers.length === 1 ? "guest" : "guests"} · {isHost ? "You manage this stay" : "You’re staying here"}
            </p>
          </div>
          {isHost && !isEnded && (
            <button
              type="button"
              className="v21-invite-pill-btn"
              onClick={() => {
                setInviteUrl("");
                setInviteMode(null);
                setInviteError("");
                setPanel("invite");
              }}
            >
              <Plus size={16} />
              <span>Invite people</span>
            </button>
          )}
        </section>

        {/* 2. Shared Home Panel with Organic Curves & Room Illustration */}
        <section className="v21-shared-home-panel">
          <div className="v21-panel-curves" aria-hidden="true">
            <img src="/dashboard-v21/curve-sky.svg" alt="" className="v21-panel-curve-sky" />
            <img src="/dashboard-v21/curve-lime.svg" alt="" className="v21-panel-curve-lime" />
          </div>
          <div className="v21-panel-copy">
            <span className="v21-panel-overline">Shared Home</span>
            <h2 className="v21-panel-headline">The practical things, held in one place.</h2>
            <p className="v21-panel-subcopy">
              Plans, responsibilities and contributions stay clear without making the house feel transactional.
            </p>
          </div>
          <div className="v21-panel-illustration" aria-hidden="true">
            <img src="/dashboard-v21/room-illustration-dashboard.svg" alt="Cozy room illustration" />
          </div>
        </section>

        {/* 3. Three Figma V2.1 Summary Tiles */}
        <section className="v21-summary-grid">
          {/* Tile 1: Guests (Sky) */}
          <button
            type="button"
            className="v21-summary-tile tile-guests"
            onClick={() => setScreen("stay")}
            title="View household members and agreements"
          >
            <span className="v21-tile-label">Guests</span>
            <span className="v21-tile-metric">{guestMembers.length}</span>
            <span className="v21-tile-note">
              {guestMembers.filter((m) => m.membership.acceptedTermsId).length} confirmed · {guestMembers.filter((m) => !m.membership.acceptedTermsId).length} pending
            </span>
          </button>

          {/* Tile 2: Contributions (Surface) */}
          <button
            type="button"
            className="v21-summary-tile tile-contributions"
            onClick={() => setScreen("contributions")}
            title="Open private ledger"
          >
            <span className="v21-tile-label">Contributions</span>
            <span className="v21-tile-metric">{formatMoney(credits)}</span>
            <span className="v21-tile-note">
              {(obligations?.filter((o) => o.status !== "paid").length ?? 0)} records due
            </span>
          </button>

          {/* Tile 3: Chores (Sage) */}
          <button
            type="button"
            className="v21-summary-tile tile-chores"
            onClick={() => setScreen("chores")}
            title="View shared chores board"
          >
            <span className="v21-tile-label">Chores</span>
            <span className="v21-tile-metric">{openChores.length}</span>
            <span className="v21-tile-note">
              {openChores.filter((c) => !c.assigneeUserId).length > 0
                ? `${openChores.filter((c) => !c.assigneeUserId).length} need an owner`
                : "All chores assigned"}
            </span>
          </button>
        </section>

        {/* 4. Needs Attention Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="v21-section-heading">
            <h2>Needs attention</h2>
            <button
              type="button"
              className="v21-pill-action"
              onClick={() => setScreen("stay")}
            >
              See all
            </button>
          </div>
          <div className="v21-attention-grid">
            <article className="v21-attention-card attention-sky">
              <h3 className="v21-attention-title">Pending guest agreement</h3>
              <p className="v21-attention-desc">
                {guestMembers.some((m) => !m.membership.acceptedTermsId)
                  ? `${guestMembers.find((m) => !m.membership.acceptedTermsId)?.person.name || "A guest"} has not reviewed the agreement.`
                  : "All current members have accepted house terms."}
              </p>
              <button
                type="button"
                className="v21-attention-btn"
                onClick={() => setScreen("stay")}
              >
                Review
              </button>
            </article>

            <article className="v21-attention-card attention-lime">
              <h3 className="v21-attention-title">Upcoming contribution</h3>
              <p className="v21-attention-desc">
                {obligations && obligations.some((o) => o.status === "due" || o.status === "late")
                  ? `${formatMoney(obligations.find((o) => o.status === "due" || o.status === "late")?.balanceCents ?? 0)} due for scheduled contribution.`
                  : "No overdue contributions right now."}
              </p>
              <button
                type="button"
                className="v21-attention-btn"
                onClick={() => (isHost ? setPanel("contribution") : setScreen("contributions"))}
              >
                {isHost ? "Record entry" : "View ledger"}
              </button>
            </article>

            <article className="v21-attention-card">
              <h3 className="v21-attention-title">House check-in</h3>
              <p className="v21-attention-desc">
                {bundle.stay.nextCheckInDate
                  ? `Next arrival scheduled for ${formatDate(bundle.stay.nextCheckInDate)}.`
                  : "WiFi and access guide are ready for guests."}
              </p>
              <button
                type="button"
                className="v21-attention-btn"
                onClick={() => setPanel("houseInfo")}
              >
                Open check-in
              </button>
            </article>
          </div>
        </section>

        {/* Guest selector for hosts with multiple guests */}
        {isHost && guestMembers.length > 0 && (
          <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />
        )}

        {/* 5. Household Logistics & Access */}
        <HouseholdLogisticsCard
          houseInfo={bundle.stay.houseInfo}
          isHost={Boolean(isHost && !isEnded)}
          onEdit={() => setPanel("houseInfo")}
          onNotify={notify}
        />

        {/* 6. Announcements Section */}
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">House notes</p>
              <h2>Announcements</h2>
            </div>
            {isHost && !isEnded && (
              <button className="mini-button" type="button" onClick={() => setPanel("announcement")}>
                <Megaphone size={16} /> Add
              </button>
            )}
          </div>
          <div className="activity-list">
            {announcements.map((item) => (
              <article className="list-row" key={item._id}>
                <span className="list-icon">
                  <Megaphone size={19} />
                </span>
                <div className="list-copy">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </div>
              </article>
            ))}
            {announcements.length === 0 && <p className="muted">No announcements yet.</p>}
          </div>
        </section>

        {/* 7. Recent Activity (Figma V2.1 styling) */}
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="v21-section-heading">
            <h2>Recent activity</h2>
            <button
              type="button"
              className="v21-pill-action"
              onClick={() => setScreen("contributions")}
            >
              Full ledger
            </button>
          </div>
          <div className="v21-activity-list">
            {recent.map((item) => {
              const actorMember = members.find((m) => m.person.id === item.actorUserId);
              const actorName = actorMember?.person.name && actorMember.person.name !== "Kouchd member"
                ? actorMember.person.name
                : (item.actorUserId === bundle.membership.userId ? "You" : "Member");
              const initials = actorName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "K";
              const isRecorded = item.action.includes("contribution") || item.action.includes("payment");
              const isConfirmed = item.action.includes("confirm") || item.action.includes("terms");

              return (
                <article className="v21-activity-row" key={item._id}>
                  <div className="v21-activity-avatar">
                    {actorMember?.person.imageUrl ? (
                      <img src={actorMember.person.imageUrl} alt={actorName} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="v21-activity-copy">
                    <p className="v21-activity-title">
                      {actorName} · {item.action.replaceAll("_", " ")}
                    </p>
                    <p className="v21-activity-meta">
                      {item.detail} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`v21-activity-status ${
                      isConfirmed ? "status-confirmed" : isRecorded ? "status-recorded" : "status-pending"
                    }`}
                  >
                    {isConfirmed ? "Confirmed" : isRecorded ? "Recorded" : "Logged"}
                  </span>
                </article>
              );
            })}
            {recent.length === 0 && (
              <p className="muted">No recent activity recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    )}
    {visibleScreen === "contributions" && <div key="contributions" className="screen-transition"><div className="page-heading"><div><p className="eyebrow">Private by guest</p><h1>{ledgerLabel}</h1><p className="subhead">Your money tab is completely private between you and your host.</p><HelpTip title="Contribution ledger" href={isHost ? HELP_LINKS.ledgerManagement : HELP_LINKS.loggingContributions}>Review charges and contributions here. Hosts can switch between guests; guests only see their own private ledger.</HelpTip></div><div className="heading-actions">{!isEnded && <><Tooltip content="Record a payment made or contribution credit"><button className="button primary" type="button" onClick={() => setPanel("contribution")} disabled={!financialGuestId}><Plus size={18} /> Add contribution</button></Tooltip>{isHost && <Tooltip content="Add a one-off charge or utility share"><button className="button soft" type="button" onClick={() => setPanel("adhoc")} disabled={!financialGuestId}><ReceiptText size={18} /> Add charge</button></Tooltip>}</>}</div></div>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="external-payment-note"><strong>Payments happen outside Kouchd.</strong> Use the host options in Stay details, then log completed contributions here. Kouchd does not collect or process payments. <button className="text-button" type="button" onClick={() => setScreen("stay")}>View payment options</button></div><div className="summary-strip"><div className="summary-item"><span>Total charges</span><strong>{formatMoney(charge)}</strong></div><div className="summary-item"><span>Confirmed credit</span><strong>{formatMoney(credits)}</strong></div><div className="summary-item"><span>Balance</span><strong>{formatMoney(balance)}</strong></div></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Payment order</p><h2>Oldest shares are credited first</h2></div></div><div className="ledger-list">{obligations.map((item, index) => <article className="list-row contribution-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.title ?? `Period ${index + 1}`} · due {formatDate(item.dueDate)}</strong><span>{formatMoney(item.baseAmountCents)} base{item.earlyDiscountCents ? ` · ${formatMoney(-item.earlyDiscountCents)} early discount` : ""}{item.lateFeeCents ? ` · ${formatMoney(item.lateFeeCents)} across ${item.lateFeeOccurrences} late-fee cycle${item.lateFeeOccurrences === 1 ? "" : "s"}` : ""}{item.lateFeeWaived ? " · fee waived" : ""}</span><span className="obligation-progress-copy">{formatMoney(item.creditedCents)} confirmed of {formatMoney(item.effectiveChargeCents)} due</span><span className="obligation-progress-track" role="progressbar" aria-label={`${item.title ?? `Period ${index + 1}`} payment progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.effectiveChargeCents > 0 ? Math.min(100, Math.round((item.creditedCents / item.effectiveChargeCents) * 100)) : 0}><span style={{ width: `${item.effectiveChargeCents > 0 ? Math.min(100, Math.max(0, (item.creditedCents / item.effectiveChargeCents) * 100)) : 0}%` }} /></span></div><div className="list-value">{formatMoney(item.balanceCents)}<small>{item.status}</small></div>{isHost && <div className="row-actions">{!isEnded && item.lateFeeCents > 0 && !item.lateFeeWaived && <button className="mini-button" type="button" onClick={() => void waiveLateFee({ obligationId: item._id }).then(() => notify("Late fee waived and updated."))}>Waive fee</button>}{!isEnded && item.type === "adhoc" && <button className="mini-button danger" type="button" onClick={() => setDestructiveAction({ type: "cancelCharge", obligationId: item._id, title: item.title ?? "One-off charge" })}>Cancel charge</button>}</div>}</article>)}{obligations.length === 0 && <p className="muted">Choose a guest, then activate terms or add a one-off charge.</p>}</div></section><RewardsHub stayId={stayId} isHost={Boolean(isHost && !isEnded)} readOnly={isEnded} selectedGuestId={financialGuestId} currentBalanceCents={balance} onNotify={notify} /><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Transactions</p><h2>Contribution entries</h2></div></div><div className="ledger-list">{activeContributions.map((item) => <article className="list-row contribution-row" key={item._id}><span className="list-icon payment"><Landmark size={19} /></span><div className="list-copy"><strong>{item.type.replaceAll("_", " ")}</strong><span>{item.note || "No note"} · {item.status}</span></div><div className="list-value">{formatMoney(item.amountCents)}<small>{formatDate(item.date)}</small></div>{!isEnded && item.status === "pending" && item.createdBy !== bundle.membership.userId && <div className="row-actions"><button className="mini-button" type="button" onClick={() => void confirmContribution({ contributionId: item._id })}>Confirm</button></div>}</article>)}</div></section></div>}
    {visibleScreen === "chores" && <div key="chores" className="screen-transition"><div className="page-heading"><div><p className="eyebrow">Shared across the house</p><h1>Chore board</h1><p className="subhead">Household coordination stays shared while financial records stay private.</p><HelpTip title="Shared chores" href={HELP_LINKS.houseRulesAndChores}>Everyone in the stay can see tasks, assignments, and completion. Use the chore form to add a task and set a due date.</HelpTip></div>{!isEnded && <button className="button primary" type="button" onClick={() => setPanel("chore")}><Plus size={18} /> Add chore</button>}</div><div className="chore-list">{chores.filter((item) => !item.voidedAt).map((item) => <article className={`list-row chore-row ${item.completedAt ? "done" : ""}`} key={item._id}>{!isEnded ? <Tooltip content={item.completedAt ? "Mark chore as open" : "Mark chore as completed"}><button className={`chore-check ${item.completedAt ? "checked" : ""}`} type="button" onClick={() => void toggleChore({ choreId: item._id })} aria-label={`${item.completedAt ? "Reopen" : "Complete"} ${item.title}`}>{item.completedAt && <Check size={18} />}</button></Tooltip> : <span className={`chore-check ${item.completedAt ? "checked" : ""}`} aria-hidden="true">{item.completedAt && <Check size={18} />}</span>}<div className="list-copy"><strong>{item.title}</strong><span>{item.note || `Due ${formatDate(item.dueDate)}`}</span><span className="badge">{item.assigneeUserId ? (members.find((member) => member.person.id === item.assigneeUserId)?.person.name && members.find((member) => member.person.id === item.assigneeUserId)!.person.name !== "Kouchd member" ? members.find((member) => member.person.id === item.assigneeUserId)!.person.name : "Guest") : item.assignee}</span></div></article>)}</div></div>}
    {visibleScreen === "stay" && <div key="stay" className="screen-transition"><div className="page-heading"><div><p className="eyebrow">The agreement</p><h1>Stay details</h1><p className="subhead">Everyone sees shared house guidelines, while guest money details stay private.</p><HelpTip title="Stay details" href={HELP_LINKS.stayAgreements}>Find the current terms, house rules, and household access information here.</HelpTip></div>{!isEnded && !isHost && !hasAccepted && <button className="button primary" type="button" onClick={() => setGuestOnboardingOpen(true)}>Review & accept agreement</button>}</div>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="agreement-callout"><div><Users size={22} /><div><strong>Terms version {displayedAgreementTerms?.version ?? 1}</strong><span>{isHost ? selectedGuestMember ? (displayedAgreementAccepted ? `${guestDisplayName} accepted this agreement` : `${guestDisplayName} needs to review this agreement`) : (hasAccepted ? "Your host terms are accepted" : "Host terms are set when the stay is created") : (hasAccepted ? "You accepted this agreement" : "Your agreement needs review")}</span></div></div><span className="accepted-pill">{bundle.stay.status}</span></div>{displayedAgreementTerms && <div className="details-grid"><article className="details-card" style={{ gridColumn: "1 / -1", background: "#f8fbf9", border: "1px dashed var(--green, #184f3a)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}><div><p className="overline" style={{ margin: 0 }}>Household Referral Code</p><strong style={{ fontSize: "1.3rem", letterSpacing: "1.5px", color: "var(--green, #184f3a)" }}>{bundle.stay.referralCode ?? "KCH-SHARED"}</strong><p className="muted" style={{ margin: "3px 0 0", fontSize: "0.8rem" }}>Members can join this stay directly by entering this code on Kouchd.</p></div><Tooltip content="Copy invite code to share with household members"><button className="button soft compact" type="button" onClick={() => { void navigator.clipboard.writeText(bundle.stay.referralCode ?? ""); notify("Referral code copied!"); }}><Copy size={15} /> Copy code</button></Tooltip></div></article><article className="details-card"><p className="overline">Dates</p><p>{formatDate(displayedAgreementTerms.startDate)} to {formatDate(displayedAgreementTerms.endDate)}</p></article><article className="details-card"><p className="overline">Contribution plan</p><p>{formatMoney(displayedAgreementTerms.rateCents)} per {displayedAgreementTerms.cadence === "weekly" ? "week" : "day"}</p></article><article className="details-card"><p className="overline">Billable dates</p><p>{displayedAgreementTerms.billingBasis === "occupied_nights" ? "Only completed overnights recorded by the host" : "Every day within the agreement dates"}</p></article><article className="details-card"><p className="overline">Early rule</p><p>{displayedAgreementTerms.earlyDiscountEnabled ?? displayedAgreementTerms.earlyDiscountPercentage > 0 ? `${displayedAgreementTerms.earlyDiscountPercentage}% off when complete ${displayedAgreementTerms.earlyDiscountDays} days early` : "Off"}</p></article><article className="details-card"><p className="overline">Late rule</p><p>{displayedAgreementTerms.lateFeeEnabled ?? displayedAgreementTerms.lateFeeCents > 0 ? `${formatMoney(displayedAgreementTerms.lateFeeCents)} weekly after ${displayedAgreementTerms.graceDays} grace days` : "Off"}</p></article></div>}<HouseholdLogisticsCard houseInfo={bundle.stay.houseInfo} isHost={Boolean(isHost && !isEnded)} onEdit={() => setPanel("houseInfo")} onNotify={notify} />
    <PaymentOptionsCard paymentOptions={bundle.stay.paymentOptions} isHost={Boolean(isHost && !isEnded)} onEdit={() => setPanel("paymentOptions")} onNotify={notify} />
        {terms && <PaymentScheduleCard key={`${financialGuestId ?? "host"}-${terms.cadence}`} stayId={stayId} isHost={isHost} hasAccepted={hasAccepted} cadence={terms.cadence} paymentDayOfWeek={terms.paymentDayOfWeek} ended={isEnded} onNotify={notify} />}
        {selectedGuestTerms?.billingBasis === "occupied_nights" && financialGuestId && <OccupancyCaptureCard stayId={stayId} guestUserId={financialGuestId} guestName={guestDisplayName} isHost={Boolean(isHost && !isEnded)} canRecord={!isEnded && (isHost ? guestMembers.find((item) => item.person.id === financialGuestId)?.membership.acceptedTermsId === selectedGuestTerms._id : hasAccepted)} onNotify={notify} />}
        {isHost && !isEnded && <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">Individual agreements</p><h2>Guest terms</h2></div></div>
          {guestMembers.length ? <div className="ledger-list">{guestMembers.map((guest) => {
            const guestTerms = guest.terms ?? terms;
            const currentGuestName = guest.person.name && guest.person.name !== "Kouchd member" ? guest.person.name : "Guest";
            return <article className="list-row" key={guest.person.id}>
              <div className="list-copy"><strong>{currentGuestName}</strong><span>{guestTerms ? `${formatMoney(guestTerms.rateCents)} per ${guestTerms.cadence === "weekly" ? "week" : "day"} · ${guest.membership.acceptedTermsId === guestTerms._id ? "accepted" : "needs acceptance"}` : "Agreement not available"}</span></div>
              <button className="mini-button" type="button" disabled={!guestTerms} onClick={() => { setEditingGuestId(guest.person.id); setPanel("guestTerms"); }}>Edit agreement</button>
            </article>;
          })}</div> : <p className="muted">Guest agreements appear here when someone joins.</p>}
        </section>}
        {terms?.houseRules && terms.houseRules.length > 0 ? (
          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Living Guidelines</p>
                <h2>House Rules ({terms.houseRules.length})</h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {terms.houseRules.map((rule: { id: string; title: string; description: string }, i: number) => (
                <article className="list-row" key={rule.id}>
                  <span style={{ fontWeight: 800, color: "var(--green, #184f3a)", width: 24 }}>{i + 1}.</span>
                  <div className="list-copy">
                    <strong>{rule.title}</strong>
                    <span>{rule.description}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <article className="boundary-card">
            <p className="overline">Shared expectations</p>
            <h2>Clear beats assumed.</h2>
            <p className="notes-copy">{terms?.houseNotes || "Standard household expectations apply."}</p>
          </article>
        )}
        {terms?.houseRules && terms.houseRules.length > 0 && terms.houseNotes && !terms.houseRules.every((rule: { title: string }) => terms.houseNotes.includes(rule.title)) && (
          <article className="boundary-card">
            <p className="overline">Additional notes</p>
            <h2>Clear beats assumed.</h2>
            <p className="notes-copy">{terms.houseNotes}</p>
          </article>
        )}
        {isHost && !isEnded && (
          <section className="invite-card">
            <div>
              <p className="eyebrow">Grow the household</p>
              <h2>Invite members.</h2>
              <p className="muted">Share your household referral code, copy a private link to text yourself, or send an invitation email.</p>
            </div>
            <button className="button primary" type="button" onClick={() => { setInviteUrl(""); setInviteMode(null); setInviteError(""); setPanel("invite"); }}>Invite guest</button>
          </section>
        )}
        {isHost && !isEnded && (
          <button className="button danger-outline" type="button" onClick={() => setDestructiveAction({ type: "end" })}>End this stay</button>
        )}
      </div>}
    </main>
  </div>
      <nav className="bottom-nav" aria-label="Primary navigation">{([{ id: "home", label: "Home", icon: Home }, { id: "contributions", label: "Ledger", icon: Landmark }, { id: "chores", label: "Chores", icon: ClipboardList }, { id: "stay", label: "Stay", icon: Users }] as const).map((item) => <button className={`nav-item ${visibleScreen === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setScreen(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>
  {panel && !isEnded && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">Kouchd</p><h2>{panelTitle(panel)}</h2>{panel === "contribution" && <HelpTip title="Logging a contribution" href={isHost ? HELP_LINKS.ledgerManagement : HELP_LINKS.loggingContributions}>This records money or a shared expense for the ledger. Kouchd does not process payments yet.</HelpTip>}{panel === "invite" && <HelpTip title="Private invitations" href={HELP_LINKS.hostsGettingStarted}>A private link expires after one week. You can also share the household referral code from Stay details.</HelpTip>}{panel === "settings" && <HelpTip title="Reminder preferences" href={HELP_LINKS.notificationPreferences}>Choose the channels where you want household reminders. SMS is optional and requires a phone number.</HelpTip>}</div><button className="icon-button compact" type="button" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
    {panel === "contribution" && <form onSubmit={addContribution}><div className="form-grid"><label><span>Type</span><select name="type"><option value="payment">Payment</option><option value="groceries">Groceries</option><option value="supplies">Supplies</option><option value="house_work">House work</option><option value="other">Other</option></select></label><label><span>Value</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Transaction date</span><input name="date" type="date" defaultValue={asOfDate ?? undefined} required /></label><label className="full"><span>Note</span><input name="note" placeholder="Backdated payments are supported" /></label><label className="check full"><input name="counts" type="checkbox" defaultChecked /><span>Count toward this guest&apos;s balance</span></label></div><ModalActions close={() => setPanel(null)} action="Add contribution" submitting={isSubmittingModal} /></form>}
    {panel === "adhoc" && <form onSubmit={addCharge}><div className="form-grid"><label className="full"><span>Charge title</span><input name="title" required placeholder="August electric split" /></label><label><span>Amount</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Effective date</span><input name="effectiveDate" type="date" defaultValue={asOfDate ?? undefined} required /></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ?? undefined} required /></label></div><ModalActions close={() => setPanel(null)} action="Add charge" submitting={isSubmittingModal} /></form>}
    {panel === "chore" && <form onSubmit={addChore}><div className="form-grid"><label className="full"><span>Chore</span><input name="title" required /></label><label><span>Assigned to</span><select name="assigneeUserId"><option value="">Everyone</option>{members.map((member) => <option value={member.person.id} key={member.person.id}>{member.person.name && member.person.name !== "Kouchd member" ? member.person.name : (member.membership.role === "host" ? "Host" : "Guest")}</option>)}</select></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ? addCalendarDays(asOfDate, 2) : undefined} required /></label><label className="full"><span>Details</span><input name="note" /></label></div><ModalActions close={() => setPanel(null)} action="Add chore" submitting={isSubmittingModal} /></form>}
    {panel === "announcement" && <form onSubmit={addAnnouncement}><div className="form-grid"><label className="full"><span>Title</span><input name="title" required /></label><label className="full"><span>Announcement</span><textarea name="body" rows={4} required /></label><label><span>Pin until</span><input name="pinnedUntil" type="date" /></label></div><ModalActions close={() => setPanel(null)} action="Share announcement" submitting={isSubmittingModal} /></form>}
    {panel === "settings" && <form onSubmit={savePreferences}><div className="settings-summary"><Bell size={22} /><div><strong>Profile &amp; reminder delivery</strong><span>Set your display name and notification channels.</span></div></div><div className="form-grid settings-fields"><label className="full"><span>Your display name</span><input name="name" type="text" defaultValue={clerkUser?.fullName || ""} placeholder="e.g. Lee White" maxLength={80} /><small>Your name is saved to your Clerk profile and shared with your household.</small></label><label className="full"><span>Mobile number for SMS</span><input name="phone" type="tel" defaultValue={viewer.phone} placeholder="+15551234567" /></label><label className="check full"><input name="notifyEmail" type="checkbox" defaultChecked={viewer.notifyEmail} /><span>Email reminders</span></label><label className="check full"><input name="notifySms" type="checkbox" defaultChecked={viewer.notifySms} /><span>SMS reminders (Wrelik Brands LLC &middot; Kouchd)</span></label></div><div style={{ margin: "0.85rem 0", padding: "0.85rem", background: "#faf8f5", borderRadius: "10px", border: "1px solid var(--line)", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}><p style={{ margin: "0 0 0.35rem" }}>By enabling SMS reminders, you agree to receive transactional text messages from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>). <strong>Message and data rates may apply.</strong> Message frequency varies. Text STOP to cancel, HELP for help.</p><p style={{ margin: "0 0 0.35rem" }}>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</p><p style={{ margin: 0 }}><Link href="/terms" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>Terms &amp; Conditions</Link> &middot; <Link href="/privacy" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</Link> &middot; <Link href="/sms-opt-in" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>SMS Terms Details</Link></p></div><ModalActions close={() => setPanel(null)} action="Save preferences" submitting={isSubmittingModal} /></form>}
    {panel === "houseInfo" && <HouseInfoForm initialInfo={bundle.stay.houseInfo} onSubmit={saveHouseInfo} onCancel={() => setPanel(null)} />}
    {panel === "paymentOptions" && <PaymentOptionsForm initialOptions={bundle.stay.paymentOptions} onSubmit={savePaymentOptions} onCancel={() => setPanel(null)} />}
    {panel === "guestTerms" && editingGuestId && (() => {
      const guest = guestMembers.find((item) => item.person.id === editingGuestId);
      const guestTerms = guest?.terms ?? terms;
      const currentGuestName = guest?.person.name && guest.person.name !== "Kouchd member" ? guest.person.name : "Guest";
      return guest && guestTerms
        ? <GuestAgreementForm terms={guestTerms} guestName={currentGuestName} onSubmit={saveGuestAgreement} onCancel={() => setPanel(null)} />
        : <p className="muted">This guest agreement is not available.</p>;
    })()}
    {panel === "invite" && <><div style={{ border: "1px dashed var(--line)", borderRadius: "12px", padding: "1rem", background: "#faf8f5", marginBottom: "1rem" }}><span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Household Referral Code</span><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}><strong style={{ fontSize: "1.2rem", letterSpacing: "1px", color: "var(--green)" }}>{bundle.stay.referralCode ?? "KCH-SHARED"}</strong><button className="button soft compact" type="button" onClick={() => { void navigator.clipboard.writeText(bundle.stay.referralCode ?? ""); notify("Referral code copied!"); }}><Copy size={15} /> Copy Code</button></div></div>{inviteUrl ? <div><p className="muted">{inviteMode === "email" ? "The email invitation was sent. You can also copy this private link." : "Copy this private link, paste it into a message on your phone, and send it yourself."} It expires in seven days.</p><div className="invite-output"><input readOnly value={inviteUrl} aria-label="Guest invitation link" /><button className="button soft" type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => notify("Invite link copied. Paste it into your phone message."))}><Copy size={17} /> Copy link</button></div></div> : <form onSubmit={makeInvite}><div className="form-grid"><label className="full"><span>Guest email (for email invite only)</span><input name="email" type="email" placeholder="guest@example.com" /></label></div><p className="muted modal-note">For text, choose “Create link to copy” and send it from your phone’s messaging app. Kouchd will not send a text or access your contacts. This invite link expires in seven days. Households support up to 20 active members including the host.</p>{inviteError && <p className="form-error" role="alert">{inviteError}</p>}<div className="dialog-actions"><button className="button ghost" type="button" onClick={() => setPanel(null)}>Cancel</button><button className="button soft" type="submit" name="delivery" value="text" disabled={isSubmittingModal}>{isSubmittingModal ? "Creating..." : "Create link to copy"}</button><button className="button primary" type="submit" name="delivery" value="email" disabled={isSubmittingModal}>{isSubmittingModal ? "Creating..." : "Send email invite"}</button></div></form>}</>}
  </section></div>}
  {guestOnboardingOpen && !isEnded && (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setGuestOnboardingOpen(false); }}>
      <section className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 740, padding: "1.5rem" }}>
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
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setJoinModalOpen(false); }}>
      <section className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 580, padding: "1.5rem" }}>
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
  {isTourVisible && guideRole && <GuidedTour role={guideRole} step={visibleTourStep} onBack={() => moveTour(-1)} onNext={() => moveTour(1)} onSkip={skipTour} onClose={pauseTour} />}
  {destructiveAction && <DestructiveConfirmationDialog
    title={destructiveAction.type === "end" ? "End this stay?" : `Cancel “${destructiveAction.title}”?`}
    description={destructiveAction.type === "end" ? "Guests will no longer be able to add to this stay. Its agreements and history will remain available under Past stays, and you can start another stay." : `This removes “${destructiveAction.title}” from the guest’s balance. The charge history will be retained.`}
    confirmLabel={destructiveAction.type === "end" ? "End stay" : "Cancel charge"}
    onConfirm={confirmDestructiveAction}
    onCancel={() => setDestructiveAction(null)}
  />}<div className={`toast ${notice ? "show" : ""}`} role="status" aria-live="polite">{notice}</div></div>
  );
}

function GuestTabs({ guests, selected, onSelect }: { guests: Member[]; selected?: Id<"users">; onSelect: (id: Id<"users">) => void }) {
  return <div className="guest-tabs" aria-label="Choose a guest ledger">{guests.map((guest) => <button className={selected === guest.person.id ? "active" : ""} type="button" key={guest.person.id} onClick={() => onSelect(guest.person.id)}>{guest.person.name && guest.person.name !== "Kouchd member" ? guest.person.name : "Guest"}</button>)}</div>;
}

function ModalActions({ close, action, submitting }: { close: () => void; action: string; submitting?: boolean }) {
  return (
    <div className="dialog-actions">
      <button className="button ghost" type="button" onClick={close} disabled={submitting}>Cancel</button>
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : action}
      </button>
    </div>
  );
}

function panelTitle(panel: Exclude<Panel, null>) {
  return ({
    contribution: "New contribution",
    chore: "Add a chore",
    adhoc: "Add one-off charge",
    announcement: "New announcement",
    settings: "Profile & reminder settings",
    invite: "Invite a guest",
    houseInfo: "Household Guide & Essentials",
    paymentOptions: "Payment options",
    guestTerms: "Edit guest agreement",
  })[panel];
}
