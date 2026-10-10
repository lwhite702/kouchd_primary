"use client";

import { Check, Copy, Edit3, Eye, EyeOff, FileText, Key, MapPin, Phone, Plus, Trash2, Wifi } from "lucide-react";
import { FormEvent, useState } from "react";

import type { Doc } from "@/convex/_generated/dataModel";

interface HouseholdLogisticsCardProps {
  houseInfo?: Doc<"stays">["houseInfo"];
  isHost: boolean;
  onEdit: () => void;
  onNotify: (message: string) => void;
}

export function HouseholdLogisticsCard({
  houseInfo,
  isHost,
  onEdit,
  onNotify,
}: HouseholdLogisticsCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hasAnyInfo = Boolean(
    houseInfo &&
      (houseInfo.wifiNetwork ||
        houseInfo.wifiPassword ||
        houseInfo.streetAddress ||
        houseInfo.doorCode ||
        houseInfo.parkingNotes ||
        houseInfo.trashDay ||
        houseInfo.emergencyContact ||
        houseInfo.otherNotes)
  );

  function copyText(text: string, key: string, successMessage: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onNotify(successMessage);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  }

  const formattedAddress = [
    houseInfo?.streetAddress,
    houseInfo?.unit,
    houseInfo?.cityStateZip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="section-block house-guide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Household Guide</p>
          <h2>WiFi & Household Essentials</h2>
        </div>
        {isHost && (
          <button className="mini-button" type="button" onClick={onEdit}>
            <Edit3 size={15} /> {hasAnyInfo ? "Edit details" : "Add details"}
          </button>
        )}
      </div>

      {!hasAnyInfo ? (
        <div className="empty-list" style={{ padding: "28px 20px", textAlign: "center" }}>
          <Wifi
            size={34}
            style={{ margin: "0 auto 10px", color: "var(--green, #184f3a)", opacity: 0.75 }}
          />
          <strong style={{ display: "block", fontSize: "1.05rem", marginBottom: 6 }}>
            {isHost ? "No household details added yet" : "No household details shared yet"}
          </strong>
          <p className="muted" style={{ maxWidth: 440, margin: "0 auto 16px", fontSize: "0.88rem" }}>
            {isHost
              ? "Share your WiFi credentials, mailing address for deliveries, trash day, and parking instructions so guests have what they need immediately."
              : "Your host has not added WiFi or address information for this stay yet."}
          </p>
          {isHost && (
            <button className="button primary compact" type="button" onClick={onEdit}>
              <Plus size={16} /> Add house essentials
            </button>
          )}
        </div>
      ) : (
        <div className="house-info-grid">
          {/* WiFi Card */}
          {(houseInfo?.wifiNetwork || houseInfo?.wifiPassword) && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon wifi">
                  <Wifi size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Wireless Internet</p>
                  <strong>WiFi Network</strong>
                </div>
              </div>

              <div className="house-card-body">
                {houseInfo?.wifiNetwork && (
                  <div className="house-field-row">
                    <div className="house-field-text">
                      <span className="house-label">Network Name (SSID)</span>
                      <strong className="house-value">{houseInfo.wifiNetwork}</strong>
                    </div>
                    <button
                      className="button soft compact copy-btn"
                      type="button"
                      onClick={() => copyText(houseInfo.wifiNetwork!, "wifiNetwork", "WiFi name copied!")}
                      aria-label="Copy WiFi network name"
                    >
                      {copiedKey === "wifiNetwork" ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                      <span>{copiedKey === "wifiNetwork" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}

                {houseInfo?.wifiPassword && (
                  <div className="house-field-row">
                    <div className="house-field-text">
                      <span className="house-label">Password</span>
                      <strong className="house-value font-mono">
                        {showPassword ? houseInfo.wifiPassword : "••••••••••••"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="button ghost compact toggle-btn"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        className="button soft compact copy-btn"
                        type="button"
                        onClick={() => copyText(houseInfo.wifiPassword!, "wifiPassword", "WiFi password copied!")}
                        aria-label="Copy WiFi password"
                      >
                        {copiedKey === "wifiPassword" ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                        <span>{copiedKey === "wifiPassword" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}

          {/* Mailing Address Card */}
          {formattedAddress && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon location">
                  <MapPin size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Deliveries & Mail</p>
                  <strong>Mailing Address</strong>
                </div>
              </div>

              <div className="house-card-body">
                <div className="house-field-row" style={{ alignItems: "flex-start" }}>
                  <div className="house-field-text">
                    <span className="house-label">Street & Unit</span>
                    <strong className="house-value" style={{ display: "block" }}>
                      {houseInfo?.streetAddress}
                      {houseInfo?.unit ? ` (${houseInfo.unit})` : ""}
                    </strong>
                    {houseInfo?.cityStateZip && (
                      <span className="muted" style={{ display: "block", fontSize: "0.85rem", marginTop: 2 }}>
                        {houseInfo.cityStateZip}
                      </span>
                    )}
                  </div>
                  <button
                    className="button soft compact copy-btn"
                    type="button"
                    onClick={() => copyText(formattedAddress, "address", "Address copied for deliveries!")}
                    aria-label="Copy full mailing address"
                  >
                    {copiedKey === "address" ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                    <span>{copiedKey === "address" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Door Code & Access */}
          {houseInfo?.doorCode && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon access">
                  <Key size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Entry & Access</p>
                  <strong>Door / Gate Code</strong>
                </div>
              </div>

              <div className="house-card-body">
                <div className="house-field-row">
                  <div className="house-field-text">
                    <span className="house-label">Lockbox or Keypad</span>
                    <strong className="house-value font-mono" style={{ fontSize: "1.1rem" }}>
                      {houseInfo.doorCode}
                    </strong>
                  </div>
                  <button
                    className="button soft compact copy-btn"
                    type="button"
                    onClick={() => copyText(houseInfo.doorCode!, "doorCode", "Door code copied!")}
                    aria-label="Copy door code"
                  >
                    {copiedKey === "doorCode" ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                    <span>{copiedKey === "doorCode" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Parking Notes */}
          {houseInfo?.parkingNotes && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon parking">
                  <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>🅿️</span>
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Vehicle & Driveway</p>
                  <strong>Parking Instructions</strong>
                </div>
              </div>

              <div className="house-card-body">
                <p className="house-note-text">{houseInfo.parkingNotes}</p>
              </div>
            </article>
          )}

          {/* Trash & Recycling */}
          {houseInfo?.trashDay && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon trash">
                  <Trash2 size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Waste & Sanitation</p>
                  <strong>Trash & Recycling</strong>
                </div>
              </div>

              <div className="house-card-body">
                <p className="house-note-text">{houseInfo.trashDay}</p>
              </div>
            </article>
          )}

          {/* Emergency & Super Contact */}
          {houseInfo?.emergencyContact && (
            <article className="house-card">
              <div className="house-card-header">
                <span className="house-icon emergency">
                  <Phone size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Urgent & Building</p>
                  <strong>Emergency Contact</strong>
                </div>
              </div>

              <div className="house-card-body">
                <div className="house-field-row">
                  <p className="house-note-text" style={{ margin: 0 }}>
                    {houseInfo.emergencyContact}
                  </p>
                  <button
                    className="button soft compact copy-btn"
                    type="button"
                    onClick={() => copyText(houseInfo.emergencyContact!, "emergency", "Contact copied!")}
                    aria-label="Copy emergency contact"
                  >
                    {copiedKey === "emergency" ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                    <span>{copiedKey === "emergency" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Other House Notes */}
          {houseInfo?.otherNotes && (
            <article className="house-card house-card-full">
              <div className="house-card-header">
                <span className="house-icon notes">
                  <FileText size={20} />
                </span>
                <div>
                  <p className="overline" style={{ margin: 0 }}>Household Logistics</p>
                  <strong>Important House Notes</strong>
                </div>
              </div>

              <div className="house-card-body">
                <p className="house-note-text" style={{ whiteSpace: "pre-wrap" }}>
                  {houseInfo.otherNotes}
                </p>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
}

interface HouseInfoFormProps {
  initialInfo?: Doc<"stays">["houseInfo"];
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}

export function HouseInfoForm({ initialInfo, onSubmit, onCancel }: HouseInfoFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(event);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="full" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem", marginBottom: "0.25rem" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--green)" }}>WiFi Connection</strong>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0 0" }}>
            Network name and credentials shared with household members.
          </p>
        </div>

        <label>
          <span>WiFi Network (SSID)</span>
          <input
            name="wifiNetwork"
            defaultValue={initialInfo?.wifiNetwork ?? ""}
            placeholder="e.g. ElmStreet_5G"
            maxLength={100}
          />
        </label>

        <label>
          <span>WiFi Password</span>
          <input
            name="wifiPassword"
            defaultValue={initialInfo?.wifiPassword ?? ""}
            placeholder="Network password"
            maxLength={100}
          />
        </label>

        <div className="full" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--green)" }}>Mailing & Delivery Address</strong>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0 0" }}>
            Helps guests order packages, mail, and deliveries accurately.
          </p>
        </div>

        <label className="full">
          <span>Street Address</span>
          <input
            name="streetAddress"
            defaultValue={initialInfo?.streetAddress ?? ""}
            placeholder="e.g. 124 Elm Street"
            maxLength={200}
          />
        </label>

        <label>
          <span>Apt / Unit / Suite (Optional)</span>
          <input
            name="unit"
            defaultValue={initialInfo?.unit ?? ""}
            placeholder="e.g. Apt 3B"
            maxLength={50}
          />
        </label>

        <label>
          <span>City, State, Zip</span>
          <input
            name="cityStateZip"
            defaultValue={initialInfo?.cityStateZip ?? ""}
            placeholder="e.g. Austin, TX 78701"
            maxLength={100}
          />
        </label>

        <div className="full" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--green)" }}>Access & Logistics</strong>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0 0" }}>
            Door codes, parking guidelines, and trash pickup days.
          </p>
        </div>

        <label>
          <span>Door / Gate Code (Optional)</span>
          <input
            name="doorCode"
            defaultValue={initialInfo?.doorCode ?? ""}
            placeholder="e.g. Keypad #1234 or lockbox 5678"
            maxLength={100}
          />
        </label>

        <label>
          <span>Trash & Recycling Schedule</span>
          <input
            name="trashDay"
            defaultValue={initialInfo?.trashDay ?? ""}
            placeholder="e.g. Tuesdays (bins out Monday night)"
            maxLength={200}
          />
        </label>

        <label className="full">
          <span>Parking Instructions</span>
          <input
            name="parkingNotes"
            defaultValue={initialInfo?.parkingNotes ?? ""}
            placeholder="e.g. Driveway on left or spot #12; street parking requires visitor pass"
            maxLength={1000}
          />
        </label>

        <label className="full">
          <span>Emergency / Super Contact</span>
          <input
            name="emergencyContact"
            defaultValue={initialInfo?.emergencyContact ?? ""}
            placeholder="e.g. Building manager Mike: (555) 012-3456 or Plumber 24/7 line"
            maxLength={300}
          />
        </label>

        <label className="full">
          <span>Important House Notes</span>
          <textarea
            name="otherNotes"
            defaultValue={initialInfo?.otherNotes ?? ""}
            placeholder="e.g. Thermostat is scheduled to 70°; laundry hours 8am-9pm; mailbox key hanging by front door."
            rows={3}
            maxLength={2000}
          />
        </label>
      </div>

      <div className="dialog-actions">
        <button className="button ghost" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save household info"}
        </button>
      </div>
    </form>
  );
}
