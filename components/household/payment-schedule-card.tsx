"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock } from "lucide-react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PaymentScheduleCard({
  stayId,
  isHost,
  hasAccepted,
  cadence,
  paymentDayOfWeek,
  ended = false,
  onNotify,
}: {
  stayId: Id<"stays">;
  isHost: boolean;
  hasAccepted: boolean;
  cadence: "daily" | "weekly";
  paymentDayOfWeek?: number;
  ended?: boolean;
  onNotify: (message: string) => void;
}) {
  const requests = useQuery(api.paymentSchedule.list, { stayId });
  const requestChange = useMutation(api.paymentSchedule.requestChange);
  const reviewRequest = useMutation(api.paymentSchedule.reviewRequest);
  const [nextCadence, setNextCadence] = useState<"daily" | "weekly">(cadence === "daily" ? "weekly" : "daily");
  const [nextDay, setNextDay] = useState(5);
  const [busy, setBusy] = useState(false);
  const ownPending = requests?.some((request) => request.status === "pending");

  async function submitRequest() {
    setBusy(true);
    try {
      await requestChange({ stayId, cadence: nextCadence, ...(nextCadence === "weekly" ? { paymentDayOfWeek: nextDay } : {}) });
      onNotify("Payment schedule request sent to your host.");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: Id<"paymentScheduleRequests">, decision: "approve" | "reject") {
    setBusy(true);
    try {
      await reviewRequest({ requestId, decision });
      onNotify(decision === "approve" ? "Payment schedule updated. Charges are prorated from today." : "Payment schedule request declined.");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Could not review the request.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="section-block payment-schedule-card">
    <div className="section-heading"><div><p className="eyebrow">Payment timing</p><h2><CalendarClock size={20} /> {isHost ? "Schedule requests" : "Choose your payment schedule"}</h2></div></div>
    {!isHost ? <>
      <p className="muted">Current schedule: <strong>{cadence === "weekly" ? `Weekly${paymentDayOfWeek === undefined ? "" : ` · due ${weekdays[paymentDayOfWeek]}`}` : "Daily"}</strong>. Mixed and partial contributions count toward your balance. Daily contributions are due each day; weekly contributions must cover the full prorated weekly amount by the chosen weekday. Changes need host approval, require a $0 due balance, and are limited to one every 14 days.</p>
      {ended && <p className="muted">This stay has ended, so payment schedule changes are no longer available.</p>}
      {!ended && hasAccepted && !ownPending && <div className="form-grid">
        <label><span>Request a change to</span><select value={nextCadence} onChange={(event) => setNextCadence(event.target.value as "daily" | "weekly")}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
        {nextCadence === "weekly" && <label><span>Weekly payment day</span><select value={nextDay} onChange={(event) => setNextDay(Number(event.target.value))}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>}
        <div className="dialog-actions full"><button className="button soft" type="button" disabled={busy} onClick={() => void submitRequest()}>{busy ? "Sending…" : "Request schedule change"}</button></div>
      </div>}
      {ownPending && <p className="accepted-pill">Your request is waiting for host approval.</p>}
    </> : requests?.length ? <div className="activity-list">{requests.map((request) => <article className="list-row" key={request._id}>
      <div className="list-copy"><strong>{request.guestName} · {request.requestedCadence}{request.requestedCadence === "weekly" && request.requestedPaymentDayOfWeek !== undefined ? ` · ${weekdays[request.requestedPaymentDayOfWeek]}` : ""}</strong><span>Requested {new Date(request.requestedAt).toLocaleDateString()}</span></div>
      <div className="row-actions">{!ended && <button className="mini-button" type="button" disabled={busy} onClick={() => void decide(request._id, "approve")}>Approve</button>}<button className="mini-button danger" type="button" disabled={busy} onClick={() => void decide(request._id, "reject")}>Decline</button></div>
    </article>)}</div> : <p className="muted">No payment schedule requests are waiting for review.</p>}
    <p className="muted small">Daily/weekly rates are adjusted to keep the same approximate weekly cost. A schedule change starts on its approval date, and charges crossing that date are prorated. When enabled, the $5 daily or $25 weekly late fee repeats every 7 days after the agreed grace period while an amount remains unpaid.</p>
  </section>;
}
