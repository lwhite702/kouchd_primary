"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Bell, BookOpen, Check, ClipboardList, Copy, Home, KeyRound, Landmark, Megaphone, Plus, ReceiptText, Settings, Sparkles, Users } from "lucide-react";
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
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { HelpTip } from "@/components/onboarding/help-tip";
import { GuidedTour, guideSteps } from "@/components/onboarding/guided-tour";
import type { GuideRole } from "@/components/onboarding/guided-tour";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Member = { membership: Doc<"memberships">; person: { id: Id<"users">; name: string; imageUrl?: string } };
type StayBundle = { stay: Doc<"stays">; terms: Doc<"terms"> | null; membership: Doc<"memberships">; members: Member[] };
type LedgerItem = {
  _id: Id<"obligations">;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  baseAmountCents: number;
  type: "cadence" | "adhoc";
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
type Panel = "contribution" | "chore" | "adhoc" | "announcement" | "settings" | "invite" | "houseInfo" | null;
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
  const syncCurrent = useMutation(api.users.syncCurrent);
  const started = useRef(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    void syncCurrent({})
      .then(() => setSynced(true))
      .catch((err) => {
        console.error("Workspace sync error:", err);
        setSyncError("We could not prepare your private workspace.");
      });
  }, [isAuthenticated, syncCurrent]);

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
            started.current = false;
            setSyncError("");
            void syncCurrent({})
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
        <GetStartedHub />
      </KnockGuidesProvider>
    );
  }
  return (
    <KnockGuidesProvider
      userProperties={{
        stayId: stays[0].stay._id,
        role: stays[0].membership.role,
        stayStatus: stays[0].stay.status,
      }}
    >
      <LiveStay stayId={stays[0].stay._id} />
    </KnockGuidesProvider>
  );
}

function AccountHeader({ onSettings, onJoinCode, onTakeTour }: { onSettings?: () => void; onJoinCode?: () => void; onTakeTour?: () => void }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/" style={{ textDecoration: "none" }}>
        <KouchdWordmark size="md" />
      </Link>
      <div className="topbar-actions">
        <a
          className="button ghost compact"
          href="https://help.kouchd.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", padding: "4px 10px", color: "var(--muted)", textDecoration: "none" }}
          title="Guides & Documentation"
        >
          <BookOpen size={15} /> Docs
        </a>
        {onJoinCode && (
          <button className="button soft compact" type="button" onClick={onJoinCode} style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
            <KeyRound size={15} /> Join with code
          </button>
        )}
        {onTakeTour && <button aria-label="Take the guided tour" className="button soft compact tour-entry" onClick={onTakeTour} title="Take the guided tour" type="button"><Sparkles size={15} /><span>Tour</span></button>}
        {onSettings && (
          <button className="icon-button compact" type="button" onClick={onSettings} aria-label="Notification settings">
            <Settings size={19} />
          </button>
        )}
        <UserButton />
      </div>
    </header>
  );
}

function GetStartedHub() {
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

        {tab === "host" ? (
          <><p className="onboarding-eyebrow muted">Create a stay, set expectations, and invite guests. <HelpTip title="Host a stay">You will choose the terms and house rules first. Guests review and accept them after joining.</HelpTip></p><HostOnboardingWizard /></>
        ) : (
          <><p className="onboarding-eyebrow muted">Join a household with a code from your host. <HelpTip title="Join a household">After you join, review the agreement and house rules before using the shared space.</HelpTip></p><JoinHouseholdCard onJoined={() => { /* stay query updates automatically */ }} /></>
        )}
      </main>
    </div>
  );
}

function LiveStay({ stayId }: { stayId: Id<"stays"> }) {
  const bundle = useQuery(api.stays.getBundle, { stayId }) as StayBundle | undefined;
  const viewer = useQuery(api.users.viewer, {}) as Viewer | null | undefined;
  const chores = useQuery(api.chores.list, { stayId }) as Doc<"chores">[] | undefined;
  const activities = useQuery(api.activity.list, { stayId }) as Doc<"activity">[] | undefined;
  const announcements = useQuery(api.announcements.list, { stayId }) as Doc<"announcements">[] | undefined;
  const [screen, setScreen] = useState<Screen>("home");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<Id<"users"> | undefined>();
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [guestOnboardingOpen, setGuestOnboardingOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourSuppressedForRole, setTourSuppressedForRole] = useState<GuideRole | null>(null);
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
  const updateHouseInfo = useMutation(api.stays.updateHouseInfo);
  const endStay = useMutation(api.stays.end);
  const updateGuideProgress = useMutation(api.users.updateGuideProgress);

  const activeContributions = (contributions ?? []).filter((entry) => entry.status !== "voided");
  const currentContributions = activeContributions.filter((entry) => !asOfDate || entry.date <= asOfDate);
  const credits = confirmedCreditCents(currentContributions.map((entry) => ({ amountCents: entry.amountCents, countsTowardBalance: entry.countsTowardBalance, status: entry.status })));
  const charge = (obligations ?? []).reduce((total, item) => total + item.effectiveChargeCents, 0);
  const balance = charge - credits;
  const openChores = (chores ?? []).filter((item) => !item.completedAt && !item.voidedAt);
  const recent = useMemo(() => (activities ?? []).slice(0, 5), [activities]);
  const selectedGuest = guestMembers.find((item) => item.person.id === financialGuestId)?.person;
  const terms = bundle?.terms;
  const hasAccepted = bundle?.membership.acceptedTermsId === bundle?.stay.currentTermsId;
  const guideRole = bundle?.membership.role as GuideRole | undefined;
  const storedGuideProgress = guideRole ? viewer?.guideProgress?.[guideRole] : undefined;
  const canShowTour = Boolean(viewer && guideRole && (guideRole === "host" || hasAccepted));
  const isTourVisible = Boolean(canShowTour && guideRole && (tourOpen || (tourSuppressedForRole !== guideRole && (!storedGuideProgress || storedGuideProgress.status === "in_progress"))));
  const visibleTourStep = tourOpen ? tourStep : storedGuideProgress?.status === "in_progress" && guideRole ? Math.min(storedGuideProgress.step, guideSteps[guideRole].length - 1) : 0;
  const visibleScreen = isTourVisible && guideRole ? guideSteps[guideRole][visibleTourStep].screen : screen;
  useEffect(() => {
    if (!viewer || !guideRole || (guideRole === "guest" && !hasAccepted) || storedGuideProgress) return;
    void updateGuideProgress({ role: guideRole, step: 0, status: "in_progress" });
  }, [guideRole, hasAccepted, storedGuideProgress, updateGuideProgress, viewer]);
  const persistTourProgress = useCallback((role: GuideRole, step: number, status: GuideProgressState["status"]) => {
    void updateGuideProgress({ role, step, status }).catch((error) => console.error("Tour progress could not be saved:", error));
  }, [updateGuideProgress]);
  const openTour = useCallback(() => {
    if (!guideRole || !viewer || (guideRole === "guest" && !hasAccepted)) return;
    const startAt = storedGuideProgress?.status === "in_progress" ? Math.min(storedGuideProgress.step, guideSteps[guideRole].length - 1) : 0;
    setTourSuppressedForRole(null);
    setTourStep(startAt);
    setScreen(guideSteps[guideRole][startAt].screen);
    setTourOpen(true);
    persistTourProgress(guideRole, startAt, "in_progress");
  }, [guideRole, hasAccepted, persistTourProgress, storedGuideProgress, viewer]);
  const pauseTour = useCallback(() => {
    if (guideRole) {
      persistTourProgress(guideRole, visibleTourStep, "in_progress");
      setTourSuppressedForRole(guideRole);
    }
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);
  const skipTour = useCallback(() => {
    if (guideRole) {
      persistTourProgress(guideRole, visibleTourStep, "skipped");
      setTourSuppressedForRole(guideRole);
    }
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);
  const moveTour = useCallback((direction: -1 | 1) => {
    if (!guideRole) return;
    const next = visibleTourStep + direction;
    if (next < 0) return;
    if (next >= guideSteps[guideRole].length) {
      persistTourProgress(guideRole, guideSteps[guideRole].length - 1, "completed");
      setTourSuppressedForRole(guideRole);
      setTourOpen(false);
      return;
    }
    setTourOpen(true);
    setTourStep(next);
    setScreen(guideSteps[guideRole][next].screen);
    persistTourProgress(guideRole, next, "in_progress");
  }, [guideRole, persistTourProgress, visibleTourStep]);
  if (!bundle || !viewer || !chores || !activities || !announcements || !contributions || !obligations) return <DashboardSkeleton message="Pulling the shared record together..." />;

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2600); }
  async function makeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const token = createInviteToken(); const url = `${window.location.origin}/invite/${token}`;
    setIsSubmittingModal(true);
    try {
      await createInvite({ stayId, tokenHash: await hashInviteToken(token), invitedEmail: value(form, "email") || undefined, inviteUrl: url, expiresAt: Date.now() + 7 * 86_400_000 });
      setInviteUrl(url); notify("Private invite created.");
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
      const phone = value(form, "phone") || undefined;
      const notifySms = form.get("notifySms") === "on";
      await updatePreferences({
        phone,
        notifyEmail: form.get("notifyEmail") === "on",
        notifySms,
        smsConsentSource: "settings",
        smsConsentConfirmed: notifySms && (!viewer?.notifySms || phone !== viewer?.phone),
      });
      setPanel(null); notify("Reminder preferences saved.");
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

  const ledgerLabel = isHost ? `${selectedGuest?.name ?? "Guest"}'s private ledger` : "Your private ledger";
  return <div className="app-shell production-shell"><AccountHeader onSettings={() => setPanel("settings")} onJoinCode={() => setJoinModalOpen(true)} onTakeTour={canShowTour ? openTour : undefined} /><main>
    <KouchdGuideBanner guideKey="household-notice-banner" />
    <KouchdGuideModal guideKey="welcome-modal" />
    {!hasAccepted && !isHost && (
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
    {visibleScreen === "home" && <div key="home" className="screen-transition"><div className="page-heading dashboard-heading"><div><p className="eyebrow onboarding-eyebrow">Shared and current <HelpTip title="Home">See your current stay, next check-in, household details, announcements, and recent activity in one place.</HelpTip></p><h1>Here&apos;s the household at a glance.</h1></div><button className="button soft desktop-action" type="button" onClick={() => setPanel("contribution")} disabled={!financialGuestId}><Plus size={18} /> Add contribution</button></div><article className="stay-card"><div><p className="overline">Current stay</p><h2>{members.map((item) => item.person.name).join(" + ")}</h2><p className="muted">{terms ? `${formatDate(terms.startDate)} to ${formatDate(terms.endDate)}` : "Terms pending"}</p></div><span className="status-pill">{bundle.stay.status}</span><div className="progress-block"><div className="progress-copy"><span>Terms version {terms?.version ?? 1}</span><strong>{members.length} members</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, 40 + members.length * 15)}%` }} /></div></div></article>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="metric-grid"><article className="metric-card balance-card"><p className="overline">{ledgerLabel}</p><p className="metric">{formatMoney(balance)}</p><p className="muted">{formatMoney(credits)} confirmed toward {formatMoney(charge)}</p><button className="text-button" type="button" onClick={() => setScreen("contributions")}>View breakdown</button></article><article className="metric-card"><p className="overline">Chores</p><p className="metric">{openChores.length} <small>open</small></p><p className="muted">{openChores[0]?.title ?? "Nothing hanging over anyone."}</p><button className="text-button" type="button" onClick={() => setScreen("chores")}>See chore board</button></article><article className="metric-card"><p className="overline">Next check-in</p><p className="metric date-metric">{bundle.stay.nextCheckInDate ? formatDate(bundle.stay.nextCheckInDate) : "Not set"}</p><p className="muted">Email and SMS follow your reminder settings.</p></article></div><HouseholdLogisticsCard houseInfo={bundle.stay.houseInfo} isHost={isHost} onEdit={() => setPanel("houseInfo")} onNotify={notify} /><section className="section-block"><div className="section-heading"><div><p className="eyebrow">House notes</p><h2>Announcements</h2></div>{isHost && <button className="mini-button" type="button" onClick={() => setPanel("announcement")}><Megaphone size={16} /> Add</button>}</div><div className="activity-list">{announcements.map((item) => <article className="list-row" key={item._id}><span className="list-icon"><Megaphone size={19} /></span><div className="list-copy"><strong>{item.title}</strong><span>{item.body}</span></div></article>)}{announcements.length === 0 && <p className="muted">No announcements yet.</p>}</div></section><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Shared record</p><h2>Recent activity</h2></div></div><div className="activity-list">{recent.map((item) => <article className="list-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.action.replaceAll("_", " ")}</strong><span>{item.detail}</span></div><div className="list-value"><small>{new Date(item.createdAt).toLocaleDateString()}</small></div></article>)}</div></section></div>}
    {visibleScreen === "contributions" && <div key="contributions" className="screen-transition"><div className="page-heading"><div><p className="eyebrow onboarding-eyebrow">Private by guest <HelpTip title="Contribution ledger">Review charges and contributions here. Hosts can switch between guests; guests only see their own private ledger.</HelpTip></p><h1>{ledgerLabel}</h1><p className="subhead">Your money tab is completely private between you and your host.</p></div><div className="heading-actions"><button className="button primary" type="button" onClick={() => setPanel("contribution")} disabled={!financialGuestId}><Plus size={18} /> Add contribution</button>{isHost && <button className="button soft" type="button" onClick={() => setPanel("adhoc")} disabled={!financialGuestId}><ReceiptText size={18} /> Add charge</button>}</div></div>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="coming-soon-card" style={{ margin: "0.5rem 0 1.25rem 0", padding: "1.1rem 1.25rem" }}><div className="coming-soon-header"><div className="coming-soon-icon"><Landmark size={20} /></div><div><div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><strong>In-App Payments & Direct Bank Payouts</strong><span className="coming-soon-badge">Coming Soon</span></div><p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--muted, #616e64)" }}>Direct card checkout, Apple Pay, and automated host bank deposits are on our active roadmap. For now, log contributions below to maintain your transparent, verified ledger.</p></div></div></div><div className="summary-strip"><div className="summary-item"><span>Total charges</span><strong>{formatMoney(charge)}</strong></div><div className="summary-item"><span>Confirmed credit</span><strong>{formatMoney(credits)}</strong></div><div className="summary-item"><span>Balance</span><strong>{formatMoney(balance)}</strong></div></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Payment order</p><h2>Oldest shares are credited first</h2></div></div><div className="ledger-list">{obligations.map((item, index) => <article className="list-row contribution-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.title ?? `Period ${index + 1}`} · due {formatDate(item.dueDate)}</strong><span>{formatMoney(item.baseAmountCents)} base{item.earlyDiscountCents ? ` · ${formatMoney(-item.earlyDiscountCents)} early discount` : ""}{item.lateFeeCents ? ` · ${formatMoney(item.lateFeeCents)} across ${item.lateFeeOccurrences} late-fee cycle${item.lateFeeOccurrences === 1 ? "" : "s"}` : ""}{item.lateFeeWaived ? " · fee waived" : ""}</span></div><div className="list-value">{formatMoney(item.balanceCents)}<small>{item.status}</small></div>{isHost && <div className="row-actions">{item.lateFeeCents > 0 && !item.lateFeeWaived && <button className="mini-button" type="button" onClick={() => void waiveLateFee({ obligationId: item._id }).then(() => notify("Late fee waived and updated."))}>Waive fee</button>}{item.type === "adhoc" && <button className="mini-button danger" type="button" onClick={() => void voidAdhocCharge({ obligationId: item._id }).then(() => notify("Charge cancelled."))}>Cancel charge</button>}</div>}</article>)}{obligations.length === 0 && <p className="muted">Choose a guest, then activate terms or add a one-off charge.</p>}</div></section><RewardsHub stayId={stayId} isHost={isHost} selectedGuestId={financialGuestId} currentBalanceCents={balance} onNotify={notify} /><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Transactions</p><h2>Contribution entries</h2></div></div><div className="ledger-list">{activeContributions.map((item) => <article className="list-row contribution-row" key={item._id}><span className="list-icon payment"><Landmark size={19} /></span><div className="list-copy"><strong>{item.type.replaceAll("_", " ")}</strong><span>{item.note || "No note"} · {item.status}</span></div><div className="list-value">{formatMoney(item.amountCents)}<small>{formatDate(item.date)}</small></div>{item.status === "pending" && item.createdBy !== bundle.membership.userId && <div className="row-actions"><button className="mini-button" type="button" onClick={() => void confirmContribution({ contributionId: item._id })}>Confirm</button></div>}</article>)}</div></section></div>}
    {visibleScreen === "chores" && <div key="chores" className="screen-transition"><div className="page-heading"><div><p className="eyebrow onboarding-eyebrow">Shared across the house <HelpTip title="Shared chores">Everyone in the stay can see tasks, assignments, and completion. Use the chore form to add a task and set a due date.</HelpTip></p><h1>Chore board</h1><p className="subhead">Household coordination stays shared while financial records stay private.</p></div><button className="button primary" type="button" onClick={() => setPanel("chore")}><Plus size={18} /> Add chore</button></div><div className="chore-list">{chores.filter((item) => !item.voidedAt).map((item) => <article className={`list-row chore-row ${item.completedAt ? "done" : ""}`} key={item._id}><button className={`chore-check ${item.completedAt ? "checked" : ""}`} type="button" onClick={() => void toggleChore({ choreId: item._id })} aria-label={`${item.completedAt ? "Reopen" : "Complete"} ${item.title}`}>{item.completedAt && <Check size={18} />}</button><div className="list-copy"><strong>{item.title}</strong><span>{item.note || `Due ${formatDate(item.dueDate)}`}</span><span className="badge">{item.assigneeUserId ? members.find((member) => member.person.id === item.assigneeUserId)?.person.name ?? "Guest" : item.assignee}</span></div></article>)}</div></div>}
    {visibleScreen === "stay" && <div key="stay" className="screen-transition"><div className="page-heading"><div><p className="eyebrow onboarding-eyebrow">The agreement <HelpTip title="Stay details">Find the current terms, stay dates, house rules, and household access information here.</HelpTip></p><h1>Stay details</h1><p className="subhead">Everyone sees shared house guidelines, while guest money details stay private.</p></div>{!hasAccepted && <button className="button primary" type="button" onClick={() => setGuestOnboardingOpen(true)}>Review & accept agreement</button>}</div><div className="agreement-callout"><div><Users size={22} /><div><strong>Terms version {terms?.version ?? 1}</strong><span>{bundle.stay.status === "active" ? "Accepted and active" : "Waiting for current acceptances"}</span></div></div><span className="accepted-pill">{bundle.stay.status}</span></div>{terms && <div className="details-grid"><article className="details-card" style={{ gridColumn: "1 / -1", background: "#f8fbf9", border: "1px dashed var(--green, #184f3a)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}><div><p className="overline" style={{ margin: 0 }}>Household Referral Code</p><strong style={{ fontSize: "1.3rem", letterSpacing: "1.5px", color: "var(--green, #184f3a)" }}>{bundle.stay.referralCode ?? "KCH-SHARED"}</strong><p className="muted" style={{ margin: "3px 0 0", fontSize: "0.8rem" }}>Members can join this stay directly by entering this code on Kouchd.</p></div><button className="button soft compact" type="button" onClick={() => { void navigator.clipboard.writeText(bundle.stay.referralCode ?? ""); notify("Referral code copied!"); }}><Copy size={15} /> Copy code</button></div></article><article className="details-card"><p className="overline">Dates</p><p>{formatDate(terms.startDate)} to {formatDate(terms.endDate)}</p></article><article className="details-card"><p className="overline">Contribution plan</p><p>{formatMoney(terms.rateCents)} per {terms.cadence === "weekly" ? "week" : "day"}</p></article><article className="details-card"><p className="overline">Early rule</p><p>{terms.earlyDiscountEnabled ?? terms.earlyDiscountPercentage > 0 ? `${terms.earlyDiscountPercentage}% off when complete ${terms.earlyDiscountDays} days early` : "Off"}</p></article><article className="details-card"><p className="overline">Late rule</p><p>{terms.lateFeeEnabled ?? terms.lateFeeCents > 0 ? `${formatMoney(terms.lateFeeCents)} weekly after ${terms.graceDays} grace days` : "Off"}</p></article></div>}<HouseholdLogisticsCard houseInfo={bundle.stay.houseInfo} isHost={isHost} onEdit={() => setPanel("houseInfo")} onNotify={notify} />        {terms?.houseRules && terms.houseRules.length > 0 ? (
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
        {terms?.houseRules && terms.houseRules.length > 0 && terms.houseNotes && !terms.houseRules.every((r: { title: string }) => terms.houseNotes.includes(r.title)) && (
          <article className="boundary-card">
            <p className="overline">Additional notes</p>
            <h2>Clear beats assumed.</h2>
            <p className="notes-copy">{terms.houseNotes}</p>
          </article>
        )}{isHost && <section className="invite-card"><div><p className="eyebrow">Grow the household</p><h2>Invite members.</h2><p className="muted">Share your household referral code or generate a private one-week invite link.</p></div><button className="button primary" type="button" onClick={() => { setInviteUrl(""); setPanel("invite"); }}>Invite guest</button></section>}{isHost && bundle.stay.status !== "ended" && <button className="button danger-outline" type="button" onClick={() => void endStay({ stayId }).then(() => notify("Stay ended. The record is retained."))}>End this stay</button>}</div>}
  </main><nav className="bottom-nav" aria-label="Primary navigation">{([{ id: "home", label: "Home", icon: Home }, { id: "contributions", label: "Ledger", icon: Landmark }, { id: "chores", label: "Chores", icon: ClipboardList }, { id: "stay", label: "Stay", icon: Users }] as const).map((item) => <button className={`nav-item ${visibleScreen === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setScreen(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>
  {panel && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">Kouchd</p><h2>{panelTitle(panel)}</h2>{panel === "contribution" && <HelpTip title="Log a contribution">Record money or shared expenses after they happen. Entries remain pending until the other person confirms them.</HelpTip>}{panel === "invite" && <HelpTip title="Invite a guest">Share the household code or create a private link. New guests review and accept the current terms after joining.</HelpTip>}{panel === "settings" && <HelpTip title="Reminder settings">Choose which reminders reach you. SMS is optional and requires your explicit consent.</HelpTip>}</div><button className="icon-button compact" type="button" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
    {panel === "contribution" && <form onSubmit={addContribution}><div className="form-grid"><label><span>Type</span><select name="type"><option value="payment">Payment</option><option value="groceries">Groceries</option><option value="supplies">Supplies</option><option value="house_work">House work</option><option value="other">Other</option></select></label><label><span>Value</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Transaction date</span><input name="date" type="date" defaultValue={asOfDate ?? undefined} required /></label><label className="full"><span>Note</span><input name="note" placeholder="Backdated payments are supported" /></label><label className="check full"><input name="counts" type="checkbox" defaultChecked /><span>Count toward this guest&apos;s balance</span></label></div><ModalActions close={() => setPanel(null)} action="Add contribution" submitting={isSubmittingModal} /></form>}
    {panel === "adhoc" && <form onSubmit={addCharge}><div className="form-grid"><label className="full"><span>Charge title</span><input name="title" required placeholder="August electric split" /></label><label><span>Amount</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Effective date</span><input name="effectiveDate" type="date" defaultValue={asOfDate ?? undefined} required /></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ?? undefined} required /></label></div><ModalActions close={() => setPanel(null)} action="Add charge" submitting={isSubmittingModal} /></form>}
    {panel === "chore" && <form onSubmit={addChore}><div className="form-grid"><label className="full"><span>Chore</span><input name="title" required /></label><label><span>Assigned to</span><select name="assigneeUserId"><option value="">Everyone</option>{members.map((member) => <option value={member.person.id} key={member.person.id}>{member.person.name}</option>)}</select></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ? addCalendarDays(asOfDate, 2) : undefined} required /></label><label className="full"><span>Details</span><input name="note" /></label></div><ModalActions close={() => setPanel(null)} action="Add chore" submitting={isSubmittingModal} /></form>}
    {panel === "announcement" && <form onSubmit={addAnnouncement}><div className="form-grid"><label className="full"><span>Title</span><input name="title" required /></label><label className="full"><span>Announcement</span><textarea name="body" rows={4} required /></label><label><span>Pin until</span><input name="pinnedUntil" type="date" /></label></div><ModalActions close={() => setPanel(null)} action="Share announcement" submitting={isSubmittingModal} /></form>}
    {panel === "settings" && <form onSubmit={savePreferences}><div className="settings-summary"><Bell size={22} /><div><strong>Reminder delivery</strong><span>Knock routes enabled channels from one preference set.</span></div></div><div className="form-grid settings-fields"><label className="full"><span>Mobile number for SMS</span><input name="phone" type="tel" defaultValue={viewer.phone} placeholder="+15551234567" /></label><label className="check full"><input name="notifyEmail" type="checkbox" defaultChecked={viewer.notifyEmail} /><span>Email reminders</span></label><label className="check full"><input name="notifySms" type="checkbox" defaultChecked={viewer.notifySms} /><span>SMS reminders (Wrelik Brands LLC &middot; Kouchd)</span></label></div><div style={{ margin: "0.85rem 0", padding: "0.85rem", background: "#faf8f5", borderRadius: "10px", border: "1px solid var(--line)", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}><p style={{ margin: "0 0 0.35rem" }}>By enabling SMS reminders, you agree to receive transactional text messages from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>). <strong>Message and data rates may apply.</strong> Message frequency varies. Text STOP to cancel, HELP for help.</p><p style={{ margin: "0 0 0.35rem" }}>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</p><p style={{ margin: 0 }}><Link href="/terms" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>Terms &amp; Conditions</Link> &middot; <Link href="/privacy" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</Link> &middot; <Link href="/sms-opt-in" target="_blank" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "underline" }}>SMS Terms Details</Link></p></div><ModalActions close={() => setPanel(null)} action="Save preferences" submitting={isSubmittingModal} /></form>}
    {panel === "houseInfo" && <HouseInfoForm initialInfo={bundle.stay.houseInfo} onSubmit={saveHouseInfo} onCancel={() => setPanel(null)} />}
    {panel === "invite" && <><div style={{ border: "1px dashed var(--line)", borderRadius: "12px", padding: "1rem", background: "#faf8f5", marginBottom: "1rem" }}><span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Household Referral Code</span><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}><strong style={{ fontSize: "1.2rem", letterSpacing: "1px", color: "var(--green)" }}>{bundle.stay.referralCode ?? "KCH-SHARED"}</strong><button className="button soft compact" type="button" onClick={() => { void navigator.clipboard.writeText(bundle.stay.referralCode ?? ""); notify("Referral code copied!"); }}><Copy size={15} /> Copy Code</button></div></div>{inviteUrl ? <div className="invite-output"><input readOnly value={inviteUrl} aria-label="Guest invitation link" /><button className="button soft" type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)}><Copy size={17} /> Copy</button></div> : <form onSubmit={makeInvite}><div className="form-grid"><label className="full"><span>Guest email (optional)</span><input name="email" type="email" placeholder="guest@example.com" /></label></div><p className="muted modal-note">Or share the Referral Code above. Kouchd supports up to 20 active members.</p><ModalActions close={() => setPanel(null)} action="Create invite" submitting={isSubmittingModal} /></form>}</>}
  </section></div>}
  {isTourVisible && guideRole && <GuidedTour role={guideRole} step={visibleTourStep} onBack={() => moveTour(-1)} onNext={() => moveTour(1)} onSkip={skipTour} onClose={pauseTour} />}
  {guestOnboardingOpen && (
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
  <div className={`toast ${notice ? "show" : ""}`} role="status" aria-live="polite">{notice}</div></div>;
}

function GuestTabs({ guests, selected, onSelect }: { guests: Member[]; selected?: Id<"users">; onSelect: (id: Id<"users">) => void }) {
  return <div className="guest-tabs" aria-label="Choose a guest ledger">{guests.map((guest) => <button className={selected === guest.person.id ? "active" : ""} type="button" key={guest.person.id} onClick={() => onSelect(guest.person.id)}>{guest.person.name}</button>)}</div>;
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
    settings: "Reminder settings",
    invite: "Invite a guest",
    houseInfo: "Household Guide & Essentials",
  })[panel];
}
