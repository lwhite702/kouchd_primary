"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Armchair, Check, ClipboardList, Copy, Home, Landmark, Plus, ReceiptText, Users } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { addCalendarDays, calendarDateInTimezone } from "@/lib/domain/dates";
import { confirmedCreditCents } from "@/lib/domain/pricing";
import { createInviteToken, hashInviteToken } from "@/lib/invite";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function formatMoney(cents: number) { return money.format(cents / 100); }
function formatDate(value: string) { return date.format(new Date(`${value}T00:00:00Z`)); }
function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }

export function AuthenticatedHome() {
  return (
    <>
      <SignedOut>
        <main className="auth-landing">
          <div className="auth-art"><Armchair size={42} /></div>
          <p className="eyebrow">Make room for clarity</p>
          <h1>A shared stay without the awkward spreadsheet.</h1>
          <p>Sign in to create a private stay, invite one guest, and keep the same record together.</p>
          <SignInButton mode="modal"><button className="button primary" type="button">Sign in to Kouchd <ArrowRight size={18} /></button></SignInButton>
        </main>
      </SignedOut>
      <SignedIn><SyncedWorkspace /></SignedIn>
    </>
  );
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

  const stays = useQuery(api.stays.listMine, synced ? {} : "skip");
  if (syncError) return <main className="route-state"><h1>Sign-in needs a reset.</h1><p className="muted">{syncError}</p></main>;
  if (!synced || stays === undefined) return <div className="route-state">Setting out the clean sheets...</div>;
  if (stays.length === 0) return <CreateStay />;
  return <LiveStay stayId={stays[0].stay._id} />;
}

function AccountHeader() {
  return <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">K</span><span>Kouchd</span></Link><UserButton /></header>;
}

function CreateStay() {
  const createStay = useMutation(api.stays.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = calendarDateInTimezone(new Date(), timezone);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      await createStay({
        timezone,
        nextCheckInDate: value(form, "checkInDate") || undefined,
        terms: {
          startDate: value(form, "startDate"), endDate: value(form, "endDate"),
          cadence: value(form, "cadence") as "daily" | "weekly",
          rateCents: Math.round(Number(value(form, "rate")) * 100),
          earlyDiscountPercentage: Number(value(form, "earlyDiscount")),
          earlyDiscountDays: Number(value(form, "earlyDays")),
          lateFeeCents: Math.round(Number(value(form, "lateFee")) * 100),
          graceDays: Number(value(form, "graceDays")),
          houseNotes: value(form, "notes"),
        },
      });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the stay"); setSaving(false); }
  }

  return <div className="app-shell"><AccountHeader /><main><section className="setup-card"><p className="eyebrow">Your first shared stay</p><h1>Put the practical stuff on the table.</h1><p className="subhead">Start with dates, the contribution rhythm, and a few boundaries. Your guest accepts the exact same version.</p><form onSubmit={submit}><div className="form-grid"><label><span>Start date</span><input name="startDate" type="date" defaultValue={today} required /></label><label><span>Planned end</span><input name="endDate" type="date" defaultValue={addCalendarDays(today, 14)} required /></label><label><span>Schedule</span><select name="cadence"><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label><label><span>Amount</span><div className="money-input"><span>$</span><input name="rate" type="number" min="0" step="0.01" defaultValue="200" required /></div></label><label><span>Early discount</span><div className="suffix-input"><input name="earlyDiscount" type="number" min="0" max="100" defaultValue="5" /><span>%</span></div></label><label><span>Paid this many days early</span><input name="earlyDays" type="number" min="0" defaultValue="2" /></label><label><span>Late fee</span><div className="money-input"><span>$</span><input name="lateFee" type="number" min="0" step="0.01" defaultValue="15" /></div></label><label><span>Grace period</span><div className="suffix-input"><input name="graceDays" type="number" min="0" defaultValue="2" /><span>days</span></div></label><label><span>Next check-in</span><input name="checkInDate" type="date" defaultValue={addCalendarDays(today, 7)} /></label><label className="full"><span>House notes and boundaries</span><textarea name="notes" rows={4} defaultValue="Quiet after 10:30 PM. Text before visitors. Sunday check-in takes ten minutes." /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button primary" type="submit" disabled={saving}>{saving ? "Starting stay..." : "Create private stay"}</button></div></form></section></main></div>;
}

type Screen = "home" | "contributions" | "chores" | "stay";

function LiveStay({ stayId }: { stayId: Id<"stays"> }) {
  const bundle = useQuery(api.stays.getBundle, { stayId });
  const asOfDate = bundle ? calendarDateInTimezone(new Date(), bundle.stay.timezone) : null;
  const contributions = useQuery(api.contributions.list, { stayId });
  const chores = useQuery(api.chores.list, { stayId });
  const activities = useQuery(api.activity.list, { stayId });
  const obligations = useQuery(api.obligations.list, asOfDate ? { stayId, asOfDate } : "skip");
  const createContribution = useMutation(api.contributions.create);
  const confirmContribution = useMutation(api.contributions.confirm);
  const createChore = useMutation(api.chores.create);
  const toggleChore = useMutation(api.chores.toggle);
  const acceptTerms = useMutation(api.terms.acceptCurrent);
  const createInvite = useMutation(api.invites.create);
  const endStay = useMutation(api.stays.end);
  const waiveLateFee = useMutation(api.obligations.waiveLateFee);
  const [screen, setScreen] = useState<Screen>("home");
  const [panel, setPanel] = useState<"contribution" | "chore" | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [notice, setNotice] = useState("");

  const terms = bundle?.terms;
  const activeContributions = contributions?.filter((entry) => entry.status !== "voided") ?? [];
  const currentContributions = activeContributions.filter((entry) => !asOfDate || entry.date <= asOfDate);
  const credits = confirmedCreditCents(currentContributions.map((entry) => ({ amountCents: entry.amountCents, countsTowardBalance: entry.countsTowardBalance, status: entry.status })));
  const charge = obligations?.reduce((total, item) => total + item.effectiveChargeCents, 0) ?? 0;
  const balance = charge - credits;
  const members = bundle?.members ?? [];
  const host = members.find((item) => item.membership.role === "host")?.person.name ?? "Host";
  const guest = members.find((item) => item.membership.role === "guest")?.person.name ?? "Guest invited";
  const isHost = bundle?.membership.role === "host";
  const hasAccepted = bundle?.membership.acceptedTermsId === bundle?.stay.currentTermsId;
  const openChores = chores?.filter((item) => !item.completedAt && !item.voidedAt) ?? [];

  const recent = useMemo(() => activities?.slice(0, 5) ?? [], [activities]);
  if (!bundle || !contributions || !chores || !activities || !obligations) return <div className="route-state">Pulling the shared record together...</div>;

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2400); }

  async function makeInvite() {
    const token = createInviteToken();
    await createInvite({ stayId, tokenHash: await hashInviteToken(token), expiresAt: Date.now() + 7 * 86_400_000 });
    setInviteUrl(`${window.location.origin}/invite/${token}`);
  }

  async function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await createContribution({ stayId, type: value(form, "type") as "payment" | "groceries" | "supplies" | "house_work" | "other", amountCents: Math.round(Number(value(form, "amount")) * 100), date: value(form, "date"), note: value(form, "note"), countsTowardBalance: form.get("counts") === "on" });
    setPanel(null); notify("Contribution added for the other person to confirm.");
  }

  async function addChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await createChore({ stayId, title: value(form, "title"), note: value(form, "note"), assignee: value(form, "assignee") as "host" | "guest" | "shared", dueDate: value(form, "dueDate") });
    setPanel(null); notify("Chore added.");
  }

  return <div className="app-shell production-shell"><AccountHeader /><main>
    {screen === "home" && <><div className="page-heading dashboard-heading"><div><p className="eyebrow">Shared and current</p><h1>Here&apos;s the stay at a glance.</h1></div><button className="button soft desktop-action" type="button" onClick={() => setPanel("contribution")}><Plus size={18} /> Add contribution</button></div><article className="stay-card"><div><p className="overline">Current stay</p><h2>{host} + {guest}</h2><p className="muted">{terms ? `${formatDate(terms.startDate)} to ${formatDate(terms.endDate)}` : "Terms pending"}</p></div><span className="status-pill">{bundle.stay.status}</span><div className="progress-block"><div className="progress-copy"><span>Terms version {terms?.version ?? 1}</span><strong>{members.length}/2 members</strong></div><div className="progress-track"><span style={{ width: members.length === 2 ? "100%" : "50%" }} /></div></div></article><div className="metric-grid"><article className="metric-card balance-card"><p className="overline">Current balance</p><p className="metric">{formatMoney(balance)}</p><p className="muted">{formatMoney(credits)} confirmed toward {formatMoney(charge)}</p><button className="text-button" type="button" onClick={() => setScreen("contributions")}>View breakdown</button></article><article className="metric-card"><p className="overline">Chores</p><p className="metric">{openChores.length} <small>open</small></p><p className="muted">{openChores[0]?.title ?? "Nothing hanging over anyone."}</p><button className="text-button" type="button" onClick={() => setScreen("chores")}>See chore board</button></article><article className="metric-card"><p className="overline">Next check-in</p><p className="metric date-metric">{bundle.stay.nextCheckInDate ? formatDate(bundle.stay.nextCheckInDate) : "Not set"}</p><p className="muted">A quick reset, not a house meeting marathon.</p></article></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Shared record</p><h2>Recent activity</h2></div></div><div className="activity-list">{recent.map((item) => <article className="list-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>{item.action}</strong><span>{item.detail}</span></div><div className="list-value"><small>{new Date(item.createdAt).toLocaleDateString()}</small></div></article>)}</div></section></>}

    {screen === "contributions" && <><div className="page-heading"><div><p className="eyebrow">Money and more</p><h1>Contributions</h1><p className="subhead">Only confirmed entries affect the shared balance.</p></div><button className="button primary" type="button" onClick={() => setPanel("contribution")}><Plus size={18} /> Add contribution</button></div><div className="summary-strip"><div className="summary-item"><span>Stay total</span><strong>{formatMoney(charge)}</strong></div><div className="summary-item"><span>Confirmed credit</span><strong>{formatMoney(credits)}</strong></div><div className="summary-item"><span>Balance</span><strong>{formatMoney(balance)}</strong></div></div><section className="section-block"><div className="section-heading"><div><p className="eyebrow">What is due</p><h2>Obligations</h2></div></div><div className="ledger-list">{obligations.map((item, index) => <article className="list-row contribution-row" key={item._id}><span className="list-icon"><ReceiptText size={19} /></span><div className="list-copy"><strong>Period {index + 1} · due {formatDate(item.dueDate)}</strong><span>{formatMoney(item.baseAmountCents)} base{item.earlyDiscountCents ? ` · ${formatMoney(-item.earlyDiscountCents)} early discount` : ""}{item.lateFeeCents ? ` · ${formatMoney(item.lateFeeCents)} late fee` : ""}{item.lateFeeWaived ? " · fee waived" : ""}</span></div><div className="list-value">{formatMoney(item.balanceCents)}<small>{item.status}</small></div>{isHost && item.lateFeeCents > 0 && !item.lateFeeWaived && <div className="row-actions"><button className="mini-button" type="button" onClick={() => void waiveLateFee({ obligationId: item._id }).then(() => notify("Late fee waived and recorded."))}>Waive fee</button></div>}</article>)}{obligations.length === 0 && <p className="muted">Obligations appear after both people accept the current terms.</p>}</div></section><section className="section-block"><div className="section-heading"><div><p className="eyebrow">Shared ledger</p><h2>Contribution entries</h2></div></div><div className="ledger-list">{activeContributions.map((item) => <article className="list-row contribution-row" key={item._id}><span className="list-icon payment"><Landmark size={19} /></span><div className="list-copy"><strong>{item.type.replaceAll("_", " ")}</strong><span>{item.note || "No note"} · {item.status}</span></div><div className="list-value">{formatMoney(item.amountCents)}<small>{formatDate(item.date)}</small></div>{item.status === "pending" && item.createdBy !== bundle.membership.userId && <div className="row-actions"><button className="mini-button" type="button" onClick={() => void confirmContribution({ contributionId: item._id })}>Confirm</button></div>}</article>)}</div></section></>}

    {screen === "chores" && <><div className="page-heading"><div><p className="eyebrow">No mystery dishes</p><h1>Chore board</h1><p className="subhead">Everyday household work stays visible and separate from money.</p></div><button className="button primary" type="button" onClick={() => setPanel("chore")}><Plus size={18} /> Add chore</button></div><div className="chore-list">{chores.filter((item) => !item.voidedAt).map((item) => <article className={`list-row chore-row ${item.completedAt ? "done" : ""}`} key={item._id}><button className={`chore-check ${item.completedAt ? "checked" : ""}`} type="button" onClick={() => void toggleChore({ choreId: item._id })} aria-label={`${item.completedAt ? "Reopen" : "Complete"} ${item.title}`}>{item.completedAt && <Check size={18} />}</button><div className="list-copy"><strong>{item.title}</strong><span>{item.note || `Due ${formatDate(item.dueDate)}`}</span><span className="badge">{item.assignee}</span></div></article>)}</div></>}

    {screen === "stay" && <><div className="page-heading"><div><p className="eyebrow">The agreement</p><h1>Stay details</h1><p className="subhead">Both people point back to the same version.</p></div>{!hasAccepted && <button className="button primary" type="button" onClick={() => void acceptTerms({ stayId }).then(() => notify("Terms accepted."))}>Accept current terms</button>}</div><div className="agreement-callout"><div><Users size={22} /><div><strong>Terms version {terms?.version ?? 1}</strong><span>{bundle.stay.status === "active" ? "Accepted by both members" : "Waiting for both members"}</span></div></div><span className="accepted-pill">{bundle.stay.status}</span></div>{terms && <div className="details-grid"><article className="details-card"><p className="overline">Dates</p><p>{formatDate(terms.startDate)} to {formatDate(terms.endDate)}</p></article><article className="details-card"><p className="overline">Contribution plan</p><p>{formatMoney(terms.rateCents)} per {terms.cadence === "weekly" ? "week" : "day"}</p></article><article className="details-card"><p className="overline">Early rule</p><p>{terms.earlyDiscountPercentage}% off when complete {terms.earlyDiscountDays} days early</p></article><article className="details-card"><p className="overline">Late rule</p><p>{formatMoney(terms.lateFeeCents)} once after {terms.graceDays} grace days</p></article></div>}<article className="boundary-card"><p className="overline">Shared expectations</p><h2>Clear beats assumed.</h2><p className="notes-copy">{terms?.houseNotes || "No notes added."}</p></article>{isHost && members.length < 2 && <section className="invite-card"><div><p className="eyebrow">Bring in your guest</p><h2>One private, single-use link.</h2><p className="muted">It expires after seven days and can only join this stay once.</p></div>{inviteUrl ? <div className="invite-output"><input readOnly value={inviteUrl} aria-label="Guest invitation link" /><button className="button soft" type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)}><Copy size={17} /> Copy</button></div> : <button className="button primary" type="button" onClick={() => void makeInvite()}>Create guest link</button>}</section>}{isHost && bundle.stay.status !== "ended" && <button className="button danger-outline" type="button" onClick={() => void endStay({ stayId }).then(() => notify("Stay ended. The record is retained."))}>End this stay</button>}</>}
  </main><nav className="bottom-nav" aria-label="Primary navigation">{([{ id: "home", label: "Home", icon: Home }, { id: "contributions", label: "Contribute", icon: Landmark }, { id: "chores", label: "Chores", icon: ClipboardList }, { id: "stay", label: "Stay", icon: Users }] as const).map((item) => <button className={`nav-item ${screen === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setScreen(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>

  {panel && <div className="modal-backdrop"><section className="modal-card" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">{panel === "contribution" ? "Add to the record" : "Pitch in"}</p><h2>{panel === "contribution" ? "New contribution" : "Add a chore"}</h2></div></div>{panel === "contribution" ? <form onSubmit={addContribution}><div className="form-grid"><label><span>Type</span><select name="type"><option value="payment">Payment</option><option value="groceries">Groceries</option><option value="supplies">Supplies</option><option value="house_work">House work</option><option value="other">Other</option></select></label><label><span>Value</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Date</span><input name="date" type="date" defaultValue={asOfDate ?? undefined} required /></label><label className="full"><span>Note</span><input name="note" /></label><label className="check full"><input name="counts" type="checkbox" defaultChecked /><span>Count toward the shared balance</span></label></div><div className="dialog-actions"><button className="button ghost" type="button" onClick={() => setPanel(null)}>Cancel</button><button className="button primary" type="submit">Add contribution</button></div></form> : <form onSubmit={addChore}><div className="form-grid"><label className="full"><span>Chore</span><input name="title" required /></label><label><span>Assigned to</span><select name="assignee"><option value="guest">Guest</option><option value="host">Host</option><option value="shared">Shared</option></select></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue={asOfDate ? addCalendarDays(asOfDate, 2) : undefined} required /></label><label className="full"><span>Details</span><input name="note" /></label></div><div className="dialog-actions"><button className="button ghost" type="button" onClick={() => setPanel(null)}>Cancel</button><button className="button primary" type="submit">Add chore</button></div></form>}</section></div>}
  <div className={`toast ${notice ? "show" : ""}`} role="status" aria-live="polite">{notice}</div></div>;
}
