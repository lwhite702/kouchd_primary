"use client";

import {
  CalendarDays,
  BookOpen,
  Check,
  CheckCircle2,
  Landmark,
  Plus,
  ReceiptText,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { calculateStayChargeCents, confirmedCreditCents } from "@/lib/domain/pricing";

import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { HomeNavIcon, ContributionsNavIcon, ChoresNavIcon, StayNavIcon } from "@/components/brand/nav-icons";

type Screen = "home" | "contributions" | "chores" | "stay";
type Role = "host" | "guest";
type Modal = "contribution" | "chore" | "agreement" | null;

interface Contribution {
  id: string;
  type: string;
  amountCents: number;
  date: string;
  note: string;
  status: "pending" | "confirmed" | "disputed" | "voided";
  countsTowardBalance: boolean;
}

interface Chore {
  id: string;
  title: string;
  assignee: "Host" | "Guest" | "Shared";
  dueDate: string;
  done: boolean;
}

const today = "2026-09-04";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const initialContributions: Contribution[] = [
  { id: "c1", type: "Payment", amountCents: 20_000, date: "2026-09-01", note: "Week one", status: "confirmed", countsTowardBalance: true },
  { id: "c2", type: "Groceries", amountCents: 4_850, date: "2026-09-03", note: "Kitchen restock", status: "pending", countsTowardBalance: true },
];

const initialChores: Chore[] = [
  { id: "h1", title: "Take bins to the curb", assignee: "Guest", dueDate: "2026-09-06", done: false },
  { id: "h2", title: "Wipe down the kitchen", assignee: "Shared", dueDate: "2026-09-05", done: false },
  { id: "h3", title: "Fresh sheets", assignee: "Host", dueDate: "2026-09-02", done: true },
];

const navItems = [
  { id: "home" as Screen, label: "Home", icon: HomeNavIcon },
  { id: "contributions" as Screen, label: "Contribute", icon: ContributionsNavIcon },
  { id: "chores" as Screen, label: "Chores", icon: ChoresNavIcon },
  { id: "stay" as Screen, label: "Stay", icon: StayNavIcon },
];

function money(cents: number) {
  return currency.format(cents / 100);
}

function formatDate(value: string) {
  return dateLabel.format(new Date(`${value}T00:00:00Z`));
}

function fieldValue(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function KouchdWorkspace({ servicesConfigured }: { servicesConfigured: boolean }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<Role>("host");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [contributions, setContributions] = useState(initialContributions);
  const [chores, setChores] = useState(initialChores);
  const [ended, setEnded] = useState(false);

  const chargeCents = calculateStayChargeCents({
    startDate: "2026-09-01",
    endDate: "2026-09-21",
    cadence: "weekly",
    rateCents: 20_000,
  });
  const creditCents = confirmedCreditCents(contributions);
  const balance = chargeCents - creditCents;
  const openChores = chores.filter((chore) => !chore.done);

  const activity = useMemo(() => {
    const contributionItems = contributions.slice(0, 3).map((item) => ({
      id: item.id,
      icon: ReceiptText,
      title: `${item.type} ${item.status}`,
      detail: `${money(item.amountCents)} · ${item.note}`,
      date: item.date,
    }));
    const choreItems = chores.filter((item) => item.done).slice(0, 2).map((item) => ({
      id: item.id,
      icon: Check,
      title: `${item.title} completed`,
      detail: item.assignee,
      date: item.dueDate,
    }));
    return [...contributionItems, ...choreItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  }, [chores, contributions]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountCents = Math.round(Number(fieldValue(form, "amount")) * 100);
    setContributions((items) => [{
      id: crypto.randomUUID(),
      type: fieldValue(form, "type"),
      amountCents,
      date: fieldValue(form, "date"),
      note: fieldValue(form, "note") || "Shared contribution",
      status: "pending",
      countsTowardBalance: form.get("counts") === "on",
    }, ...items]);
    setModal(null);
    notify("Contribution added for confirmation.");
  }

  function addChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setChores((items) => [{
      id: crypto.randomUUID(),
      title: fieldValue(form, "title"),
      assignee: fieldValue(form, "assignee") as Chore["assignee"],
      dueDate: fieldValue(form, "dueDate"),
      done: false,
    }, ...items]);
    setModal(null);
    notify("Chore added. Diplomacy preserved.");
  }

  function confirmContribution(id: string) {
    setContributions((items) => items.map((item) => item.id === id ? { ...item, status: "confirmed" } : item));
    notify("Contribution confirmed.");
  }

  function toggleChore(id: string) {
    setChores((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  return (
    <div className="app-layout-desktop production-shell">
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar" aria-label="Desktop sidebar navigation">
        <div style={{ padding: "0 4px" }}>
          <KouchdWordmark size="md" />
        </div>

        <button
          type="button"
          className="stay-switcher-button"
          onClick={() => setModal("agreement")}
          aria-label="Switch stay or view agreement"
        >
          <span>Maple House</span>
          <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>▾</span>
        </button>

        <nav className="sidebar-nav" aria-label="Sidebar main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${active ? "active" : ""}`}
                onClick={() => setScreen(item.id)}
              >
                <Icon size={18} color={active ? "var(--kouchd-forest, #184f3a)" : "var(--kouchd-muted, #59675f)"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-household-profile">
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kouchd-muted, #59675f)", letterSpacing: "0.08em", marginBottom: "6px" }}>
            PRIVATE HOUSEHOLD
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
            {role === "host" ? "Lee" : "Marcus"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--kouchd-muted, #59675f)" }}>
            {role === "host" ? "Host" : "Guest"}
          </div>
        </div>
      </aside>

      <div className="desktop-main-area app-shell has-sidebar">
        <header className="topbar">
          <button className="brand brand-button" type="button" onClick={() => setScreen("home")} aria-label="Kouchd dashboard">
            <KouchdWordmark size="sm" />
          </button>
          <div className="top-actions">
            <a
              className="button ghost compact"
              href="https://help.kouchd.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", padding: "4px 10px", color: "var(--kouchd-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              title="Guides & Documentation"
            >
              <BookOpen size={15} /> Docs
            </a>
            {!servicesConfigured && <span className="mode-pill"><Sparkles size={14} /> Preview data</span>}
            <label className="role-switch">
              <span className="sr-only">View as</span>
              <select value={role} onChange={(event) => setRole(event.target.value as Role)} aria-label="View as host or guest">
                <option value="host">Host view</option>
                <option value="guest">Guest view</option>
              </select>
            </label>
            <button className="avatar" type="button" onClick={() => setModal("agreement")} aria-label="Open stay settings">
              {role === "host" ? "L" : "M"}
            </button>
          </div>
        </header>

        <main tabIndex={-1}>
          {screen === "home" && <div key="home" className="screen-transition">
            <div className="page-heading dashboard-heading">
              <div><p className="eyebrow">Good to see you, Lee</p><h1>Here&apos;s the stay at a glance.</h1></div>
            <button className="button soft desktop-action" type="button" onClick={() => setModal("contribution")}><Plus size={18} /> Add contribution</button>
          </div>
          <article className="stay-card">
            <div><p className="overline">Current stay</p><h2>Lee + Marcus</h2><p className="muted">Sep 1 to Sep 21 · America/New_York</p></div>
            <span className="status-pill">{ended ? "Ended" : "Active"}</span>
            <div className="progress-block">
              <div className="progress-copy"><span>{ended ? "Stay closed" : "4 of 21 days"}</span><strong>{ended ? "Record kept" : "17 left"}</strong></div>
              <div className="progress-track"><span style={{ width: ended ? "100%" : "19%" }} /></div>
            </div>
          </article>
          <div className="metric-grid">
            <article className="metric-card balance-card"><p className="overline">Current balance</p><p className="metric">{money(balance)}</p><p className="muted">{money(creditCents)} confirmed toward {money(chargeCents)}</p><button className="text-button" type="button" onClick={() => setScreen("contributions")}>View breakdown</button></article>
            <article className="metric-card"><p className="overline">Chores</p><p className="metric">{openChores.length} <small>open</small></p><p className="muted">Next: {openChores[0]?.title ?? "Nothing hanging over anyone."}</p><button className="text-button" type="button" onClick={() => setScreen("chores")}>See chore board</button></article>
            <article className="metric-card"><p className="overline">Next check-in</p><p className="metric date-metric">Sep 8</p><p className="muted">A quick reset, not a house meeting marathon.</p><button className="text-button" type="button" onClick={() => notify("Check-in stays Sep 8 for this preview.")}>Update check-in</button></article>
          </div>
          <section className="section-block" aria-labelledby="activity-title">
            <div className="section-heading"><div><p className="eyebrow">Shared record</p><h2 id="activity-title">Recent activity</h2></div></div>
            <div className="activity-list">{activity.map((item) => <article className="list-row" key={item.id}><span className="list-icon"><item.icon size={20} /></span><div className="list-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><div className="list-value"><small>{formatDate(item.date)}</small></div></article>)}</div>
          </section>
        </div>}

        {screen === "contributions" && <div key="contributions" className="screen-transition">
          <div className="page-heading"><div><p className="eyebrow">Money and more</p><h1>Contributions</h1><p className="subhead">Track cash, groceries, supplies, and agreed work in one shared record.</p></div><button className="button primary" type="button" onClick={() => setModal("contribution")}><Plus size={18} /> Add contribution</button></div>
          <div className="summary-strip"><div className="summary-item"><span>Stay total</span><strong>{money(chargeCents)}</strong></div><div className="summary-item"><span>Confirmed credit</span><strong>{money(creditCents)}</strong></div><div className="summary-item"><span>Balance</span><strong>{money(balance)}</strong></div></div>
          <div className="ledger-list">{contributions.map((item) => <article className="list-row contribution-row" key={item.id}><span className="list-icon payment"><Landmark size={20} /></span><div className="list-copy"><strong>{item.type}</strong><span>{item.note} · {item.status}</span></div><div className="list-value">{money(item.amountCents)}<small>{formatDate(item.date)}</small></div>{item.status === "pending" && role === "host" && <div className="row-actions"><button className="mini-button" type="button" onClick={() => confirmContribution(item.id)}>Confirm</button></div>}</article>)}</div>
        </div>}

        {screen === "chores" && <div key="chores" className="screen-transition">
          <div className="page-heading"><div><p className="eyebrow">No mystery dishes</p><h1>Chore board</h1><p className="subhead">Make the invisible work visible without turning the house into boot camp.</p></div><button className="button primary" type="button" onClick={() => setModal("chore")}><Plus size={18} /> Add chore</button></div>
          <div className="chore-list">{chores.map((item) => <article className={`list-row chore-row ${item.done ? "done" : ""}`} key={item.id}><button className={`chore-check ${item.done ? "checked" : ""}`} type="button" onClick={() => toggleChore(item.id)} aria-label={`${item.done ? "Reopen" : "Complete"} ${item.title}`}>{item.done && <Check size={18} />}</button><div className="list-copy"><strong>{item.title}</strong><span>Due {formatDate(item.dueDate)}</span><span className="badge">{item.assignee}</span></div><span className="list-value"><small>{item.done ? "Done" : "Open"}</small></span></article>)}</div>
        </div>}

        {screen === "stay" && <div key="stay" className="screen-transition">
          <div className="page-heading"><div><p className="eyebrow">The agreement</p><h1>Stay details</h1><p className="subhead">The practical stuff everyone can point back to.</p></div>{role === "host" && <button className="button soft" type="button" onClick={() => setModal("agreement")}><Settings2 size={18} /> Edit agreement</button>}</div>
          <div className="agreement-callout"><div><Users size={22} /><div><strong>Terms version 1</strong><span>Accepted by Lee and Marcus</span></div></div><span className="accepted-pill"><CheckCircle2 size={16} /> Mutually accepted</span></div>
          <div className="details-grid"><article className="details-card"><p className="overline">People</p><p>Lee hosting Marcus</p></article><article className="details-card"><p className="overline">Dates</p><p>Sep 1 to Sep 21, 2026</p></article><article className="details-card"><p className="overline">Contribution plan</p><p>$200 per week</p></article><article className="details-card"><p className="overline">Timing rules</p><p>5% early discount · $15 late fee after 2 days</p></article></div>
          <article className="boundary-card"><p className="overline">Shared expectations</p><h2>Clear beats assumed.</h2><p className="notes-copy">Quiet after 10:30 PM. Text before visitors. Groceries on the left shelf are shared. Sunday check-in takes ten minutes.</p></article>
          {role === "host" && !ended && <button className="button danger-outline" type="button" onClick={() => { setEnded(true); notify("Stay ended. The full record is still here."); }}>End this stay</button>}
        </div>}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map((item) => <button className={`nav-item ${screen === item.id ? "active" : ""}`} type="button" key={item.id} onClick={() => setScreen(item.id)}><item.icon className="nav-icon" size={20} /><span>{item.label}</span></button>)}</nav>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="dialog-heading"><div><p className="eyebrow">{modal === "contribution" ? "Add to the record" : modal === "chore" ? "Pitch in" : "Shared stay"}</p><h2 id="modal-title">{modal === "contribution" ? "New contribution" : modal === "chore" ? "Add a chore" : "Agreement settings"}</h2></div><button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close"><X size={20} /></button></div>
        {modal === "contribution" && <form onSubmit={addContribution}><div className="form-grid"><label><span>Type</span><select name="type"><option>Payment</option><option>Groceries</option><option>Supplies</option><option>House work</option><option>Other</option></select></label><label><span>Value</span><div className="money-input"><span>$</span><input name="amount" type="number" min="0.01" step="0.01" required /></div></label><label><span>Date</span><input name="date" type="date" defaultValue={today} required /></label><label className="full"><span>Note</span><input name="note" placeholder="Week 2 contribution, cleaning supplies..." /></label><label className="check full"><input name="counts" type="checkbox" defaultChecked /><span>Count this toward the stay balance</span></label></div><div className="dialog-actions"><button className="button ghost" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit">Add contribution</button></div></form>}
        {modal === "chore" && <form onSubmit={addChore}><div className="form-grid"><label className="full"><span>Chore</span><input name="title" required placeholder="Take trash out" /></label><label><span>Assigned to</span><select name="assignee"><option>Guest</option><option>Host</option><option>Shared</option></select></label><label><span>Due date</span><input name="dueDate" type="date" defaultValue="2026-09-06" required /></label></div><div className="dialog-actions"><button className="button ghost" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit">Add chore</button></div></form>}
        {modal === "agreement" && <div><div className="settings-summary"><CalendarDays size={24} /><div><strong>Sep 1 to Sep 21</strong><span>$200 weekly · America/New_York</span></div></div><p className="muted modal-note">Cloud-backed editing unlocks after Clerk and Convex are connected. The preview keeps the approved agreement visible without saving personal information locally.</p><div className="dialog-actions"><button className="button primary" type="button" onClick={() => setModal(null)}>Got it</button></div></div>}
      </section></div>}

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
      </div>
    </div>
  );
}
