"use client";

import { useQuery } from "convex/react";
import { MapPin, Search, Users, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function StaysExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStayId, setSelectedStayId] = useState<Id<"stays"> | null>(null);

  const stays = useQuery(api.admin.listStays, {
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    searchTerm: searchTerm || undefined,
  });

  const stayDetail = useQuery(
    api.admin.getStayDetail,
    selectedStayId ? { stayId: selectedStayId } : "skip"
  );

  return (
    <div>
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Household & Stay Explorer</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Inspect shared household agreements, referral codes, living logistics, and ledger balances.
            </p>
          </div>
        </div>

        <div className="console-filters">
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--kouchd-muted)" }} />
            <input
              type="text"
              className="console-search-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by referral code, host name, guest name, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="console-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Referral Code</th>
                <th>Host</th>
                <th>Members</th>
                <th>Terms</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(stays ?? []).map((stay) => (
                <tr key={stay._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ letterSpacing: "1px", color: "var(--kouchd-forest)" }}>
                        {stay.referralCode ?? "KCH-SHARED"}
                      </strong>
                    </div>
                    {stay.houseCityState && (
                      <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                        <MapPin size={11} /> {stay.houseCityState}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{stay.hostName}</strong>
                    {stay.hostEmail && (
                      <div style={{ fontSize: "0.78rem", color: "var(--kouchd-muted)" }}>
                        {stay.hostEmail}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={14} color="var(--kouchd-muted)" />
                      <span>{stay.memberCount} member{stay.memberCount === 1 ? "" : "s"}</span>
                    </div>
                    {stay.guestNames.length > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                        Guests: {stay.guestNames.join(", ")}
                      </div>
                    )}
                  </td>
                  <td>
                    {stay.terms ? (
                      <div style={{ fontSize: "0.82rem" }}>
                        <div><strong>{formatMoney(stay.terms.rateCents)}</strong> / {stay.terms.cadence}</div>
                        <div style={{ color: "var(--kouchd-muted)", fontSize: "0.75rem" }}>
                          {stay.terms.startDate} &rarr; {stay.terms.endDate}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--kouchd-muted)", fontSize: "0.8rem" }}>Pending</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>
                      <strong>{formatMoney(stay.balanceCents)}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                        {formatMoney(stay.totalConfirmedCents)} confirmed
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`console-status-pill ${stay.status}`}>
                      {stay.status}
                    </span>
                    {stay.disputedContributionsCount > 0 && (
                      <span className="console-status-pill disputed" style={{ marginLeft: 4 }}>
                        {stay.disputedContributionsCount} disputed
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button soft compact"
                      style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                      onClick={() => setSelectedStayId(stay._id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {(stays ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No households found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stay Detail Modal */}
      {selectedStayId && stayDetail && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedStayId(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 740, padding: "1.75rem", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0 }}>Household: {stayDetail.stay.referralCode ?? "KCH-SHARED"}</h3>
                  <span className={`console-status-pill ${stayDetail.stay.status}`}>
                    {stayDetail.stay.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)", marginTop: 2 }}>
                  Host: {stayDetail.host?.name} ({stayDetail.host?.email ?? "No email"}) &middot; Timezone: {stayDetail.stay.timezone}
                </div>
              </div>
              <button
                type="button"
                className="icon-button compact"
                onClick={() => setSelectedStayId(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Living Logistics Summary */}
            <div style={{ background: "#faf8f5", padding: "0.85rem", borderRadius: 10, border: "1px solid var(--kouchd-line)", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                House Logistics & Access
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: 6, fontSize: "0.82rem" }}>
                <div><strong>Address:</strong> {stayDetail.stay.houseInfo?.streetAddress ?? "Not specified"} {stayDetail.stay.houseInfo?.unit ? `Unit ${stayDetail.stay.houseInfo.unit}` : ""}</div>
                <div><strong>City/State/Zip:</strong> {stayDetail.stay.houseInfo?.cityStateZip ?? "Not specified"}</div>
                <div><strong>WiFi Network:</strong> {stayDetail.stay.houseInfo?.wifiNetwork ?? "None"}</div>
                <div><strong>WiFi Password:</strong> {stayDetail.stay.houseInfo?.wifiPassword ?? "None"}</div>
                <div><strong>Door / Lock Code:</strong> {stayDetail.stay.houseInfo?.doorCode ?? "None"}</div>
                <div><strong>Trash Day:</strong> {stayDetail.stay.houseInfo?.trashDay ?? "None"}</div>
              </div>
            </div>

            {/* Terms Summary */}
            {stayDetail.terms && (
              <div style={{ background: "white", padding: "0.85rem", borderRadius: 10, border: "1px solid var(--kouchd-line)", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Active Household Agreement (v{stayDetail.terms.version})
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: 6, fontSize: "0.82rem" }}>
                  <div><strong>Contribution Plan:</strong> {formatMoney(stayDetail.terms.rateCents)} / {stayDetail.terms.cadence}</div>
                  <div><strong>Start Date:</strong> {stayDetail.terms.startDate}</div>
                  <div><strong>End Date:</strong> {stayDetail.terms.endDate}</div>
                  <div><strong>Early Discount:</strong> {stayDetail.terms.earlyDiscountEnabled ? `${stayDetail.terms.earlyDiscountPercentage}%` : "Off"}</div>
                  <div><strong>Late Fee:</strong> {stayDetail.terms.lateFeeEnabled ? formatMoney(stayDetail.terms.lateFeeCents) : "Off"}</div>
                  <div><strong>Grace Days:</strong> {stayDetail.terms.graceDays}</div>
                </div>
              </div>
            )}

            {/* Members Roster */}
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Members Roster ({stayDetail.members.length})</h4>
            <div style={{ marginBottom: "1.25rem" }}>
              {stayDetail.members.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "white",
                    border: "1px solid #f0ebe1",
                    borderRadius: 8,
                    marginBottom: 4,
                    fontSize: "0.82rem",
                  }}
                >
                  <div>
                    <strong>{m.user?.name ?? "Unknown"}</strong> &middot; <span style={{ textTransform: "capitalize", color: "var(--kouchd-forest)" }}>{m.role}</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)" }}>
                      {m.user?.email} &middot; Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`console-status-pill ${m.status}`}>{m.status}</span>
                </div>
              ))}
            </div>

            {/* Counts of obligations, contributions, chores */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", textAlign: "center" }}>
              <div style={{ background: "#faf8f5", padding: "0.75rem", borderRadius: 8 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--kouchd-muted)", textTransform: "uppercase" }}>Obligations</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{stayDetail.obligations.length}</div>
              </div>
              <div style={{ background: "#faf8f5", padding: "0.75rem", borderRadius: 8 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--kouchd-muted)", textTransform: "uppercase" }}>Contributions</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{stayDetail.contributions.length}</div>
              </div>
              <div style={{ background: "#faf8f5", padding: "0.75rem", borderRadius: 8 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--kouchd-muted)", textTransform: "uppercase" }}>Chores</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{stayDetail.chores.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
