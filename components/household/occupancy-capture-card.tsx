"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarCheck2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function OccupancyCaptureCard({
  stayId,
  guestUserId,
  guestName,
  isHost,
  canRecord,
  cadence,
  onNotify,
}: {
  stayId: Id<"stays">;
  guestUserId: Id<"users">;
  guestName: string;
  isHost: boolean;
  canRecord: boolean;
  cadence: "daily" | "weekly";
  onNotify: (message: string) => void;
}) {
  const nights = useQuery(api.occupancy.list, { stayId, guestUserId });
  const recordOvernight = useMutation(api.occupancy.recordOvernight);
  const [nightDate, setNightDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nightDate) return;
    setBusy(true);
    setError("");
    try {
      await recordOvernight({ stayId, guestUserId, nightDate });
      setNightDate("");
      onNotify("Overnight recorded and added to the guest ledger.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record this overnight.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="section-block occupancy-capture-card">
    <div className="section-heading"><div><p className="eyebrow">Recorded occupancy</p><h2><CalendarCheck2 size={20} /> {isHost ? `Overnight record · ${guestName}` : "Nights recorded for you"}</h2></div></div>
    <p className="muted">This agreement bills only completed overnights the host records. Each recorded night is charged at the agreed daily rate or prorated share of the weekly rate. Nights without a host record are not billed. Kouchd records the charge; it does not collect payment.</p>
    {isHost && canRecord && <form className="form-grid" onSubmit={submit}>
      <label><span>Overnight date</span><input type="date" value={nightDate} onChange={(event) => setNightDate(event.target.value)} required /></label>
      <div className="dialog-actions"><button className="button primary" type="submit" disabled={!nightDate || busy}>{busy ? "Recording…" : "Record overnight"}</button></div>
      {error && <p className="form-error full" role="alert">{error}</p>}
    </form>}
    {isHost && !canRecord && <p className="muted">Recording becomes available after {guestName} accepts this agreement.</p>}
    <div className="activity-list">
      {(nights ?? []).map((night) => <article className="list-row" key={night._id}>
        <span className="list-icon"><CalendarCheck2 size={18} /></span>
        <div className="list-copy"><strong>Overnight · {date.format(new Date(`${night.nightDate}T00:00:00Z`))}</strong><span>{cadence === "weekly" ? "Weekly rate prorated" : "Daily rate"}</span></div>
        <div className="list-value">{money.format(night.amountCents / 100)}<small>recorded</small></div>
      </article>)}
      {nights?.length === 0 && <p className="muted">No overnights recorded yet.</p>}
    </div>
  </section>;
}
