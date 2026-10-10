"use client";

import { useMutation, useQuery } from "convex/react";
import { Mail, Phone, Search, Shield, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DestructiveConfirmationDialog } from "@/components/confirmation/destructive-confirmation-dialog";

export function UsersExplorer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [pendingAdminChange, setPendingAdminChange] = useState<{ userId: Id<"users">; userName: string; isAdmin: boolean } | null>(null);

  const users = useQuery(api.admin.listUsers, { searchTerm: searchTerm || undefined });
  const userDetail = useQuery(
    api.admin.getUserDetail,
    selectedUserId ? { userId: selectedUserId } : "skip"
  );
  const toggleAdmin = useMutation(api.admin.toggleAdmin);

  async function confirmAdminChange() {
    if (!pendingAdminChange) return;
    await toggleAdmin({ userId: pendingAdminChange.userId, isAdmin: pendingAdminChange.isAdmin });
    setPendingAdminChange(null);
  }

  const filteredUsers = (users ?? []).filter((u) => {
    if (roleFilter === "all") return true;
    if (roleFilter === "admin") return u.isAdmin;
    if (roleFilter === "host") return u.roles.includes("host");
    if (roleFilter === "guest") return u.roles.includes("guest");
    return true;
  });

  return (
    <div>
      <div className="console-card">
        <div className="console-card-header">
          <div>
            <h2>User Directory</h2>
            <p style={{ margin: "4px 0 0", color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>
              Explore platform accounts, roles, contact methods, and SMS carrier status.
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
              placeholder="Search by name, email, phone, Clerk ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="console-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="host">Hosts</option>
            <option value="guest">Guests</option>
            <option value="admin">Platform Admins</option>
          </select>
        </div>

        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Roles</th>
                <th>Households</th>
                <th>SMS Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: user.imageUrl ? `url(${user.imageUrl}) center/cover` : "var(--kouchd-sage)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: "var(--kouchd-forest)",
                        }}
                      >
                        {!user.imageUrl && user.name.charAt(0)}
                      </div>
                      <div>
                        <strong>{user.name}</strong>
                        {user.isAdmin && (
                          <span
                            className="console-badge"
                            style={{ marginLeft: 6, fontSize: "0.65rem", padding: "2px 6px" }}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {user.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} color="var(--kouchd-muted)" /> {user.email}
                        </span>
                      )}
                      {user.phone ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={12} color="var(--kouchd-muted)" /> {user.phone}
                        </span>
                      ) : (
                        <span style={{ color: "var(--kouchd-muted)" }}>No phone</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {user.roles.map((r) => (
                        <span key={r} className="console-status-pill active" style={{ textTransform: "capitalize" }}>
                          {r}
                        </span>
                      ))}
                      {user.roles.length === 0 && <span style={{ color: "var(--kouchd-muted)", fontSize: "0.8rem" }}>None</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{user.activeStayCount} active</span>
                    <span style={{ color: "var(--kouchd-muted)", fontSize: "0.8rem", marginLeft: 4 }}>
                      ({user.stayCount} total)
                    </span>
                  </td>
                  <td>
                    {user.notifySms ? (
                      <span className="console-status-pill opted_in">Opted In</span>
                    ) : (
                      <span className="console-status-pill ended">Off</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "var(--kouchd-muted)" }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button soft compact"
                      style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                      onClick={() => setSelectedUserId(user._id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--kouchd-muted)" }}>
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Drawer / Modal */}
      {selectedUserId && userDetail && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedUserId(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 700, padding: "1.75rem", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: userDetail.user.imageUrl ? `url(${userDetail.user.imageUrl}) center/cover` : "var(--kouchd-sage)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    color: "var(--kouchd-forest)",
                    fontSize: "1.1rem",
                  }}
                >
                  {!userDetail.user.imageUrl && userDetail.user.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{userDetail.user.name}</h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--kouchd-muted)" }}>
                    ID: {userDetail.user._id} &middot; Clerk: {userDetail.user.clerkUserId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="icon-button compact"
                onClick={() => setSelectedUserId(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "#faf8f5", padding: "0.85rem", borderRadius: 10, border: "1px solid var(--kouchd-line)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", textTransform: "uppercase", fontWeight: 700 }}>Contact Info</span>
                <div style={{ marginTop: 4, fontSize: "0.85rem" }}>
                  <div><strong>Email:</strong> {userDetail.user.email ?? "None"}</div>
                  <div><strong>Phone:</strong> {userDetail.user.phone ?? "None"}</div>
                </div>
              </div>

              <div style={{ background: "#faf8f5", padding: "0.85rem", borderRadius: 10, border: "1px solid var(--kouchd-line)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--kouchd-muted)", textTransform: "uppercase", fontWeight: 700 }}>Preferences & Role</span>
                <div style={{ marginTop: 4, fontSize: "0.85rem" }}>
                  <div><strong>Email Reminders:</strong> {userDetail.user.notifyEmail ? "Yes" : "No"}</div>
                  <div><strong>SMS Reminders:</strong> {userDetail.user.notifySms ? "Yes" : "No"}</div>
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className={`button ${userDetail.user.isAdmin ? "danger-outline" : "soft"} compact`}
                      style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                      onClick={async () => {
                        setPendingAdminChange({ userId: userDetail.user._id, userName: userDetail.user.name, isAdmin: !userDetail.user.isAdmin });
                      }}
                    >
                      <Shield size={12} />
                      {userDetail.user.isAdmin ? "Revoke Admin Grant" : "Promote to Admin"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>Households & Memberships</h4>
            <div style={{ marginBottom: "1.5rem" }}>
              {userDetail.memberships.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.75rem",
                    background: "white",
                    border: "1px solid var(--kouchd-line)",
                    borderRadius: 8,
                    marginBottom: 6,
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <strong>{m.role === "host" ? "Hosting Stay" : `Guest of ${m.hostName}`}</strong>
                    <div style={{ fontSize: "0.78rem", color: "var(--kouchd-muted)" }}>
                      Code: {m.referralCode ?? "N/A"} &middot; Status: {m.stayStatus}
                    </div>
                  </div>
                  <span className={`console-status-pill ${m.status}`}>{m.status}</span>
                </div>
              ))}
              {userDetail.memberships.length === 0 && (
                <p style={{ color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>No household memberships.</p>
              )}
            </div>

            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>10DLC SMS Consent Audit Trail</h4>
            <div>
              {userDetail.smsEvents.map((evt) => (
                <div
                  key={evt._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    background: "#faf8f5",
                    border: "1px solid #f0ebe1",
                    borderRadius: 8,
                    marginBottom: 4,
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <span className={`console-status-pill ${evt.action}`} style={{ marginRight: 6 }}>
                      {evt.action.replace("_", " ")}
                    </span>
                    <span>Source: {evt.source} ({evt.consentVersion})</span>
                  </div>
                  <span style={{ color: "var(--kouchd-muted)" }}>
                    {new Date(evt.recordedAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {userDetail.smsEvents.length === 0 && (
                <p style={{ color: "var(--kouchd-muted)", fontSize: "0.85rem" }}>No SMS consent events logged.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {pendingAdminChange && <DestructiveConfirmationDialog
        title={pendingAdminChange.isAdmin ? "Grant platform admin access?" : "Revoke platform admin access?"}
        description={pendingAdminChange.isAdmin ? `${pendingAdminChange.userName} will be able to access staff-only platform tools and account data.` : `${pendingAdminChange.userName} will lose access to staff-only platform tools.`}
        confirmLabel={pendingAdminChange.isAdmin ? "Grant access" : "Revoke access"}
        onConfirm={confirmAdminChange}
        onCancel={() => setPendingAdminChange(null)}
      />}
    </div>
  );
}
