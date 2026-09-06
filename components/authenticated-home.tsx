"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Armchair, Bell, Check, ClipboardList, Copy, Home, Landmark, Megaphone, Plus, ReceiptText, Settings, Users } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { addCalendarDays, calendarDateInTimezone } from "@/lib/domain/dates";
import { calculateStayChargeCents, confirmedCreditCents } from "@/lib/domain/pricing";
import { createInviteToken, hashInviteToken } from "@/lib/invite";

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
type Panel = "contribution" | "chore" | "adhoc" | "announcement" | "settings" | "invite" | null;

function formatMoney(cents: number) { return money.format(cents / 100); }
function formatDate(value: string) { return date.format(new Date(`${value}T00:00:00Z`)); }
function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }

export function AuthenticatedHome() {
  return <>
    <Show when="signed-out"><main className="auth-landing"><div className="auth-art"><Armchair size={42} /></div><p className="eyebrow">Make room for clarity</p><h1>A shared stay without the awkward spreadsheet.</h1><p>Sign in to create a private stay, invite your household, and keep one clear record.</p><div className="auth-actions"><SignUpButton mode="modal"><button className="button primary" type="button">Sign up for Kouchd <ArrowRight size={18} /></button></SignUpButton><SignInButton mode="modal"><button className="button soft" type="button">Sign in</button></SignInButton></div></main></Show>
    <Show when="signed-in"><SyncedWorkspace /></Show>
  </>;
}

function SyncedWorkspace() {
  const syncCurrent = useMutation(api.users.syncCurrent);
  const started = useRef(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void syncCurrent({}).then(() => setSynced(true)).catch(() => setSyncError("We could not prepare your private workspace."));
  }, [syncCurrent]);
  const stays = useQuery(api.stays.listMine, synced ? {} : "skip") as Array<{ stay: Doc<"stays">; membership: Doc<"memberships"> }> | undefined;
  if (syncError) return <main className="route-state"><h1>Sign-in needs a reset.</h1><p className="muted">{syncError}</p></main>;
  if (!synced || stays === undefined) return <div className="route-state">Setting out the clean sheets...</div>;
  if (stays.length === 0) return <CreateStay />;
  return <LiveStay stayId={stays[0].stay._id} />;
}

function AccountHeader({ onSettings }: { onSettings?: () => void }) {
  return <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">K</span><span>Kouchd</span></Link><div className="topbar-actions">{onSettings && <button className="icon-button compact" type="button" onClick={onSettings} aria-label="Notification settings"><Settings size={19} /></button>}<UserButton /></div></header>;
}

function CreateStay() {
  const createStay = useMutation(api.stays.create);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = calendarDateInTimezone(new Date(), timezone);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addCalendarDays(today, 14));
  const [cadence, setCadence] = useState<"daily" | "weekly">("weekly");
  const [rate, setRate] = useState("200");
  const [earlyEnabled, setEarlyEnabled] = useState(false);
  const [lateEnabled, setLateEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const estimate = useMemo(() => {
    try { return calculateStayChargeCents({ startDate, endDate, cadence, rateCents: Math.round(Number(rate || 0) * 100) }); }
    catch { return 0; }
  }, [cadence, endDate, rate, startDate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      await createStay({ timezone, nextCheckInDate: value(form, "checkInDate") || undefined, terms: {
        startDate, endDate, cadence, rateCents: Math.round(Number(rate) * 100),
        earlyDiscountEnabled: earlyEnabled,
        earlyDiscountPercentage: earlyEnabled ? Number(value(form, "earlyDiscount")) : 0,
        earlyDiscountDays: earlyEnabled ? Number(value(form, "earlyDays")) : 0,
        lateFeeEnabled: lateEnabled,
        lateFeeCents: lateEnabled ? Math.round(Number(value(form, "lateFee")) * 100) : 0,
        graceDays: lateEnabled ? Number(value(form, "graceDays")) : 0,
        houseNotes: value(form, "notes"),
      } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the stay"); setSaving(false); }
  }

  return <div className="app-shell"><AccountHeader /><main><section className="setup-card"><p className="eyebrow">Your first shared stay</p><h1>Put the practical stuff on the table.</h1><p className="subhead">Past start dates are welcome. Kouchd will build the historical ledger from day one.</p><form onSubmit={submit}><div className="form-grid">
    <label><span>Start date</span><input name="startDate" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
    <label><span>Planned end</span><input name="endDate" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
    <label><span>Schedule</span><select name="cadence" value={cadence} onChange={(event) => setCadence(event.target.value as "daily" | "weekly")}><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>
    <label><span>Amount</span><div className="money-input"><span>$</span><input name="rate" type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} required /></div></label>
    <div className="estimate-card full"><span>Estimated stay total</span><strong>{formatMoney(estimate)}</strong><small>Before optional discounts, late fees, or one-off charges.</small></div>
    <label className="switch-row full"><input type="checkbox" checked={earlyEnabled} onChange={(event) => setEarlyEnabled(event.target.checked)} /><span><strong>Offer an early-payment discount</strong><small>Off by default</small></span></label>
    {earlyEnabled && <><label><span>Discount</span><div className="suffix-input"><input name="earlyDiscount" type="number" min="0" max="100" defaultValue="5" /><span>%</span></div></label><label><span>Paid this many days early</span><input name="earlyDays" type="number" min="0" defaultValue="2" /></label></>}
    <label className="switch-row full"><input type="checkbox" checked={lateEnabled} onChange={(event) => setLateEnabled(event.target.checked)} /><span><strong>Add weekly rollover late fees</strong><small>Off by default</small></span></label>
    {lateEnabled && <><label><span>Weekly late fee</span><div className="money-input"><span>$</span><input name="lateFee" type="number" min="0" step="0.01" defaultValue="15" /></div></label><label><span>Grace period</span><div className="suffix-input"><input name="graceDays" type="number" min="0" defaultValue="2" /><span>days</span></div></label></>}
    <label><span>Next check-in</span><input name="checkInDate" type="date" defaultValue={addCalendarDays(today, 7)} /></label>
    <label className="full"><span>House notes and boundaries</span><textarea name="notes" rows={4} defaultValue="Quiet after 10:30 PM. Text before visitors. Sunday check-in takes ten minutes." /></label>
  </div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button primary" type="submit" disabled={saving}>{saving ? "Starting stay..." : "Create private stay"}</button></div></form></section></main></div>;
}

function LiveStay({ stayId }: { stayId: Id<"stays"> }) {
  const bundle = useQuery(api.stays.getBundle, { stayId }) as StayBundle | undefined;
  const viewer = useQuery(api.users.viewer, {}) as { id: Id<"users">; name: string; email?: string; phone?: string; notifyEmail: boolean; notifySms: boolean } | null | undefined;
  const chores = useQuery(api.chores.list, { stayId }) as Doc<"chores">[] | undefined;
  const activities = useQuery(api.activity.list, { stayId }) as Doc<"activity">[] | undefined;
  const announcements = useQuery(api.announcements.list, { stayId }) as Doc<"announcements">[] | undefined;
  const [screen, setScreen] = useState<Screen>("home");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<Id<"users"> | undefined>();
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");
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
  const acceptTerms = useMutation(api.terms.acceptCurrent);
  const createInvite = useMutation(api.invites.create);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const endStay = useMutation(api.stays.end);

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
  if (!bundle || !viewer || !chores || !activities || !announcements || !contributions || !obligations) return <div className="route-state">Pulling the shared record together...</div>;

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2600); }
  async function makeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const token = createInviteToken(); const url = `${window.location.origin}/invite/${token}`;
    await createInvite({ stayId, tokenHash: await hashInviteToken(token), invitedEmail: value(form, "email") || undefined, inviteUrl: url, expiresAt: Date.now() + 7 * 86_400_000 });
    setInviteUrl(url); notify("Private invite created.");
  }
  async function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!financialGuestId) return; const form = new FormData(event.currentTarget);
    await createContribution({ stayId, guestUserId: financialGuestId, type: value(form, "type") as "payment" | "groceries" | "supplies" | "house_work" | "other", amountCents: Math.round(Number(value(form, "amount")) * 100), date: value(form, "date"), note: value(form, "note"), countsTowardBalance: form.get("counts") === "on" });
    setPanel(null); notify("Contribution added for confirmation.");
  }
  async function addCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!financialGuestId) return; const form = new FormData(event.currentTarget);
    await createAdhocCharge({ stayId, guestUserId: financialGuestId, title: value(form, "title"), amountCents: Math.round(Number(value(form, "amount")) * 100), effectiveDate: value(form, "effectiveDate"), dueDate: value(form, "dueDate") });
    setPanel(null); notify("One-off charge added and recorded.");
  }
  async function addChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const assigneeUserId = value(form, "assigneeUserId") as Id<"users"> | "";
    await createChore({ stayId, title: value(form, "title"), note: value(form, "note"), assignee: assigneeUserId ? "guest" : "shared", assigneeUserId: assigneeUserId || undefined, dueDate: value(form, "dueDate") });
    setPanel(null); notify("Chore added.");
  }
  async function addAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await createAnnouncement({ stayId, title: value(form, "title"), body: value(form, "body"), pinnedUntil: value(form, "pinnedUntil") || undefined });
    setPanel(null); notify("Announcement shared with the household.");
  }
  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await updatePreferences({ phone: value(form, "phone") || undefined, notifyEmail: form.get("notifyEmail") === "on", notifySms: form.get("notifySms") === "on" });
    setPanel(null); notify("Reminder preferences saved.");
  }

  const ledgerLabel = isHost ? `${selectedGuest?.name ?? "Guest"}'s private ledger` : "Your private ledger";
  return <div className="app-shell production-shell"><AccountHeader onSettings={() => setPanel("settings")} /><main>
    {screen === "home" && <><div className="page-heading dashboard-heading"><div><p className="eyebrow">Shared and current</p><h1>Here&apos;s the household at a glance.</h1></div><button className="button soft desktop-action" type="button" onClick={() => setPanel("contribution")} disabled={!financialGuestId}><Plus size={18} /> Add contribution</button></div><article className="stay-card"><div><p className="overline">Current stay</p><h2>{members.map((item) => item.person.name).join(" + ")}</h2><p className="muted">{terms ? `${formatDate(terms.startDate)} to ${formatDate(terms.endDate)}` : "Terms pending"}</p></div><span className="status-pill">{bundle.stay.status}</span><div className="progress-block"><div className="progress-copy"><span>Terms version {terms?.version ?? 1}</span><strong>{members.length} members</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, 40 + members.length * 15)}%` }} /></div></div></article>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="metric-grid"><article className="metric-card balance-card"><p className="overline">{ledgerLabel}</p><p className="metric">{formatMoney(balance)}</p><p className="muted">{formatMoney(credits)} confirmed toward {formatMoney(charge)}</p><button className="text-button" type="button" onClick={() => setScreen("contributions")}>View breakdown</button></article><article className="metric-card"><p className="overline">Chores</p><p className="metric">{openChores.length} <small>open</small></p><p className="muted">{openChores[0]?.title ?? "Nothing hanging over anyone."}</p><button className="text-button" type="button" onClick={() => setScreen("chores")}>See chore board</button></article><article className="metric-card"><p className="overline">Next check-in</p><p className="metric date-metric">{bundle.stay.nextCheckInDate ? formatDate(bundle.stay.nextCheckInDate) : "Not set"}</p><p className="muted">Email and SMS follow your reminder settings.</p></article></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">House notes</p><h2>Announcements</h2></div>{isHost && <button className="mini-button" type="button" onClick={() => setPanel("announcement")}><Megaphone size={16} /> Add</button>}</div><div className="activity-list">{announcements.map((item) => <article className="list-row" key={item._id}><span className="list-icon"><Megaphone size={19} /></span><div className="list-copy"><strong>{item.title}</strong><span>{item.body}</span></div></article>)}{announcements.length === 0 && <p className="muted">No announcements yet.</p>}</div></section><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Shared record</p><h2>Recent activity</h2></div></div><div className="activity-list">{recent.map((item) => <article className="list-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.action.replaceAll("_", " ")}</strong><span>{item.detail}</span></div><div className="list-value"><small>{new Date(item.createdAt).toLocaleDateString()}</small></div></article>)}</div></section></>}
    {screen === "contributions" && <><div className="page-heading"><div><p className="eyebrow">Private by guest</p><h1>{ledgerLabel}</h1><p className="subhead">Guests can never query another guest&apos;s rates, charges, balance, or payments.</p></div><div className="heading-actions"><button className="button primary" type="button" onClick={() => setPanel("contribution")} disabled={!financialGuestId}><Plus size={18} /> Add contribution</button>{isHost && <button className="button soft" type="button" onClick={() => setPanel("adhoc")} disabled={!financialGuestId}><ReceiptText size={18} /> Add charge</button>}</div></div>{isHost && guestMembers.length > 0 && <GuestTabs guests={guestMembers} selected={financialGuestId} onSelect={setSelectedGuestId} />}<div className="summary-strip"><div className="summary-item"><span>Total charges</span><strong>{formatMoney(charge)}</strong></div><div className="summary-item"><span>Confirmed credit</span><strong>{formatMoney(credits)}</strong></div><div className="summary-item"><span>Balance</span><strong>{formatMoney(balance)}</strong></div></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">FIFO allocation</p><h2>Oldest charges are paid first</h2></div></div><div className="ledger-list">{obligations.map((item, index) => <article className="list-row contribution-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.title ?? `Period ${index + 1}`} · due {formatDate(item.dueDate)}</strong><span>{formatMoney(item.baseAmountCents)} base{item.earlyDiscountCents ? ` · ${formatMoney(-item.earlyDiscountCents)} early discount` : ""}{item.lateFeeCents ? ` · ${formatMoney(item.lateFeeCents)} across ${item.lateFeeOccurrences} late-fee cycle${item.lateFeeOccurrences === 1 ? "" : "s"}` : ""}{item.lateFeeWaived ? " · fee waived" : ""}</span></div><div className="list-value">{formatMoney(item.balanceCents)}<small>{item.status}</small></div>{isHost && <div className="row-actions">{item.lateFeeCents > 0 && !item.lateFeeWaived && <button className="mini-button" type="button" onClick={() => void waiveLateFee({ obligationId: item._id }).then(() => notify("Late fee waived and audited."))}>Waive fee</button>}{item.type === "adhoc" && <button className="mini-button danger" type="button" onClick={() => void voidAdhocCharge({ obligationId: item._id }).then(() => notify("Charge voided; history retained."))}>Void</button>}</div>}</article>)}{obligations.length === 0 && <p className="muted">Choose a guest, then activate terms or add a one-off charge.</p>}</div></section><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Transactions</p><h2>Contribution entries</h2></div></div><div className="ledger-list">{activeContributions.map((item) => <article className="list-row contribution-row" key={item._id}><span className="list-icon payment"><Landmark size={19} /></span><div className="list-copy"><strong>{item.type.replaceAll("_", " ")}</strong><span>{item.note || "No note"} · {item.status}</span></div><div className="list-value">{formatMoney(item.amountCents)}<small>{formatDate(item.date)}</small></div>{item.status === "pending" && item.createdBy !== bundle.membership.userId && <div className="row-actions"><button className="mini-button" type="button" onClick={() => void confirmContribution({ contributionId: item._id })}>Confirm</button></div>}</article>)}</div></section></>}
    {screen === "chores" && <><div className="page-heading"><div><p className="eyebrow">Shared across the house</p><h1>Chore board</h1><p className="subhead">Household coordination stays shared while financial records stay private.</p></div><button className="button primary" type="button" onClick={() => setPanel("chore")}><Plus size={18} /> Add chore</button></div><div className="chore-list">{chores.filter((item) => !item.voidedAt).map((item) => <article className={`list-row chore-row ${item.completedAt ? "done" : ""}`} key={item._id}><button className={`chore-check ${item.completedAt ? "checked" : ""}`} type="button" onClick={() => void toggleChore({ choreId: item._id })} aria-label={`${item.completedAt ? "Reopen" : "Complete"} ${item.title}`}>{item.completedAt && <Check size={18} />}</button><div className="list-copy"><strong>{item.title}</strong><span>{item.note || `Due ${formatDate(item.dueDate)}`}</span><span className="badge">{item.assigneeUserId ? members.find((member) => member.person.id === item.assigneeUserId)?.person.name ?? "Guest" : item.assignee}</span></div></article>)}</div></>}
    {screen === "stay" && <><div className="page-heading"><div><p className="eyebrow">The agreement</p><h1>Stay details</h1><p className="subhead">Everyone sees shared expectations; guest finances remain scoped on the server.</p></div>{!hasAccepted && <button className="button primary" type="button" onClick={() => void acceptTerms({ stayId }).then(() => notify("Terms accepted."))}>Accept current terms</button>}</div><div className="agreement-callout"><div><Users size={22} /><div><strong>Terms version {terms?.version ?? 1}</strong><span>{bundle.stay.status === "active" ? "Accepted and active" : "Waiting for current acceptances"}</span></div></div><span className="accepted-pill">{bundle.stay.status}</span></div>{terms && <div className="details-grid"><article className="details-card"><p className="overline">Dates</p><p>{formatDate(terms.startDate)} to {formatDate(terms.endDate)}</p></article><article className="details-card"><p className="overline">Contribution plan</p><p>{formatMoney(terms.rateCents)} per {terms.cadence === "weekly" ? "week" : "day"}</p></article><article className="details-card"><p className="overline">Early rule</p><p>{terms.earlyDiscountEnabled ?? terms.earlyDiscountPercentage > 0 ? `${terms.earlyDiscountPercentage}% off when complete ${terms.earlyDiscountDays} days early` : "Off"}</p></article><article className="details-card"><p className="overline">Late rule</p><p>{terms.lateFeeEnabled ?? terms.lateFeeCents > 0 ? `${formatMoney(terms.lateFeeCents)} weekly after ${terms.graceDays} grace days` : "Off"}</p></article></div>}<article className="boundary-card"><p className="overline">Shared expectations</p><h2>Clear beats assumed.</h2><p className="notes-copy">{terms?.houseNotes || "No notes added."}</p></article>{isHost && <section className="invite-card"><div><p className="eyebrow">Grow the household</p><h2>Private, single-use guest links.</h2><p className="muted">Each link expires after seven days. Kouchd supports up to 20 active members.</p></div><button className="button primary" type="button" onClick={() => { setInviteUrl(""); setPanel("invite"); }}>Invite another guest</button></section>}{isHost && bundle.stay.status !== "ended" && <button className="button danger-outline" type="button" onClick={() => void endStay({ stayId }).then(() => notify("Stay ended. The record is retained."))}>End this stay</button>}</>}
  </main><nav className="bottom-nav" aria-label="Primary navigation">{([{ id: "home", label: "Home", icon: Home }, { id: "contributions", label: "Ledger", icon: Landmark }, { id: "chores", label: "Chores", icon: ClipboardList }, { id: "stay", label: "Stay", icon: Users }] as const).map((item) => <button className={`nav-item ${screen === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setScreen(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>
  {panel && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">Kouchd</p><h2>{panelTitle(panel)}</h2></div><button className="icon-button compact" type="button" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
    {panel === "contribution" && <form onSubmit={addContribution}><div className="form-grid"><label><span>Type</span><select name="type"><option value="payment">Payment</option><option value="groceries">Groceries</option><option value="supplies">Supplies</option><option value="house_work">House work</option><option value="other">Other</option></select></label><label><span>Value</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Transaction date</span><input name="date" type="date" defaultValue={asOfDate ?? undefined} required /></label><label className="full"><span>Note</span><input name="note" placeholder="Backdated payments are supported" /></label><label className="check full"><input name="counts" type="checkbox" defaultChecked /><span>Count toward this guest&apos;s balance</span></label></div><ModalActions close={() => setPanel(null)} action="Add contribution" /></form>}
    {panel === "adhoc" && <form onSubmit={addCharge}><div className="form-grid"><label className="full"><span>Charge title</span><input name="title" required placeholder="August electric split" /></label><label><span>Amount</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Effective date</span><input name="effectiveDate" type="date" defaultValue={asOfDate ?? undefined} required /></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ?? undefined} required /></label></div><ModalActions close={() => setPanel(null)} action="Add charge" /></form>}
    {panel === "chore" && <form onSubmit={addChore}><div className="form-grid"><label className="full"><span>Chore</span><input name="title" required /></label><label><span>Assigned to</span><select name="assigneeUserId"><option value="">Everyone</option>{members.map((member) => <option value={member.person.id} key={member.person.id}>{member.person.name}</option>)}</select></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ? addCalendarDays(asOfDate, 2) : undefined} required /></label><label className="full"><span>Details</span><input name="note" /></label></div><ModalActions close={() => setPanel(null)} action="Add chore" /></form>}
    {panel === "announcement" && <form onSubmit={addAnnouncement}><div className="form-grid"><label className="full"><span>Title</span><input name="title" required /></label><label className="full"><span>Announcement</span><textarea name="body" rows={4} required /></label><label><span>Pin until</span><input name="pinnedUntil" type="date" /></label></div><ModalActions close={() => setPanel(null)} action="Share announcement" /></form>}
    {panel === "settings" && <form onSubmit={savePreferences}><div className="settings-summary"><Bell size={22} /><div><strong>Reminder delivery</strong><span>Knock routes enabled channels from one preference set.</span></div></div><div className="form-grid settings-fields"><label className="full"><span>Mobile number for SMS</span><input name="phone" type="tel" defaultValue={viewer.phone} placeholder="+15551234567" /></label><label className="check full"><input name="notifyEmail" type="checkbox" defaultChecked={viewer.notifyEmail} /><span>Email reminders</span></label><label className="check full"><input name="notifySms" type="checkbox" defaultChecked={viewer.notifySms} /><span>SMS reminders</span></label></div><ModalActions close={() => setPanel(null)} action="Save preferences" /></form>}
    {panel === "invite" && <>{inviteUrl ? <div className="invite-output"><input readOnly value={inviteUrl} aria-label="Guest invitation link" /><button className="button soft" type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)}><Copy size={17} /> Copy</button></div> : <form onSubmit={makeInvite}><div className="form-grid"><label className="full"><span>Guest email (optional)</span><input name="email" type="email" placeholder="guest@example.com" /></label></div><p className="muted modal-note">If email delivery is configured in Knock, Kouchd sends the invite. Either way, you can copy the private link.</p><ModalActions close={() => setPanel(null)} action="Create invite" /></form>}</>}
  </section></div>}<div className={`toast ${notice ? "show" : ""}`} role="status" aria-live="polite">{notice}</div></div>;
}

function GuestTabs({ guests, selected, onSelect }: { guests: Member[]; selected?: Id<"users">; onSelect: (id: Id<"users">) => void }) {
  return <div className="guest-tabs" aria-label="Choose a guest ledger">{guests.map((guest) => <button className={selected === guest.person.id ? "active" : ""} type="button" key={guest.person.id} onClick={() => onSelect(guest.person.id)}>{guest.person.name}</button>)}</div>;
}

function ModalActions({ close, action }: { close: () => void; action: string }) {
  return <div className="dialog-actions"><button className="button ghost" type="button" onClick={close}>Cancel</button><button className="button primary" type="submit">{action}</button></div>;
}

function panelTitle(panel: Exclude<Panel, null>) {
  return ({ contribution: "New contribution", chore: "Add a chore", adhoc: "Add one-off charge", announcement: "New announcement", settings: "Reminder settings", invite: "Invite a guest" })[panel];
}
