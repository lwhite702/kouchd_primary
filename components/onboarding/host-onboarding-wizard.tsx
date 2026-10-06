"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Check, MessageSquare, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { addCalendarDays, calendarDateInTimezone } from "@/lib/domain/dates";
import { SUGGESTED_HOUSE_RULES, HouseRuleItem } from "@/lib/domain/houseRulesCatalog";
import { SUGGESTED_CONTRIBUTION_TASKS, SuggestedContributionTask } from "@/lib/domain/rewards";
import { calculateStayChargeCents } from "@/lib/domain/pricing";
import { HelpTip } from "@/components/onboarding/help-tip";
import { HELP_LINKS } from "@/lib/help-links";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function HostOnboardingWizard({
  onCancel,
  onComplete,
}: {
  onCancel?: () => void;
  onComplete?: (stayId: Id<"stays">) => void;
}) {
  const viewer = useQuery(api.users.viewer, {});
  const createStay = useMutation(api.stays.create);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = calendarDateInTimezone(new Date(), timezone);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [phone, setPhone] = useState("");
  const [optInSms, setOptInSms] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addCalendarDays(today, 14));
  const [cadence, setCadence] = useState<"daily" | "weekly">("weekly");
  const [rate, setRate] = useState("200");
  const [nextCheckInDate, setNextCheckInDate] = useState(addCalendarDays(today, 7));

  // Step 2: House Rules
  const [selectedRules, setSelectedRules] = useState<HouseRuleItem[]>(() =>
    SUGGESTED_HOUSE_RULES.flatMap((cat) =>
      cat.suggestions.map((s) => ({ ...s, category: cat.category }))
    ).filter((r) => r.required)
  );
  const [customRuleTitle, setCustomRuleTitle] = useState("");
  const [customRuleDesc, setCustomRuleDesc] = useState("");

  // Step 3: Contribution Rewards
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [coinName, setCoinName] = useState("Coins");
  const [centsPerPoint, setCentsPerPoint] = useState("100"); // $1.00 per coin
  const [maxCreditPeriod, setMaxCreditPeriod] = useState("100"); // $100 max credit per week
  const [selectedTasks, setSelectedTasks] = useState<SuggestedContributionTask[]>(SUGGESTED_CONTRIBUTION_TASKS);

  // Step 4: Early discount & Late fees
  const [earlyEnabled, setEarlyEnabled] = useState(false);
  const [earlyDiscount, setEarlyDiscount] = useState("5");
  const [earlyDays, setEarlyDays] = useState("2");
  const [lateEnabled, setLateEnabled] = useState(false);
  const [lateFee, setLateFee] = useState("15");
  const [graceDays, setGraceDays] = useState("2");
  const [paymentDetails, setPaymentDetails] = useState({ paypal: "", cashapp: "", zelle: "", applepay: "" });

  // Step 5: Submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const estimatedStayCharge = useMemo(() => {
    try {
      return calculateStayChargeCents({
        startDate,
        endDate,
        cadence,
        rateCents: Math.round(Number(rate || 0) * 100),
      });
    } catch {
      return 0;
    }
  }, [cadence, endDate, rate, startDate]);

  function toggleSuggestedRule(rule: HouseRuleItem) {
    if (selectedRules.some((r) => r.id === rule.id)) {
      setSelectedRules(selectedRules.filter((r) => r.id !== rule.id));
    } else {
      setSelectedRules([...selectedRules, rule]);
    }
  }

  function addCustomRule(e: FormEvent) {
    e.preventDefault();
    if (!customRuleTitle.trim()) return;
    const newRule: HouseRuleItem = {
      id: `custom_${Date.now()}`,
      category: "custom",
      title: customRuleTitle.trim(),
      description: customRuleDesc.trim(),
      required: false,
    };
    setSelectedRules([...selectedRules, newRule]);
    setCustomRuleTitle("");
    setCustomRuleDesc("");
  }

  function toggleTask(task: SuggestedContributionTask) {
    if (selectedTasks.some((t) => t.id === task.id)) {
      setSelectedTasks(selectedTasks.filter((t) => t.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  }

  async function handleFinalSubmit() {
    setSaving(true);
    setError("");
    try {
      const targetPhone = phone.trim() || viewer?.phone?.trim() || "";
      if (optInSms && targetPhone) {
        const digits = targetPhone.replace(/\D/g, "");
        const formatted = targetPhone.startsWith("+")
          ? targetPhone
          : digits.length === 10
            ? `+1${digits}`
            : `+${digits}`;
        await updatePreferences({
          phone: formatted,
          notifyEmail: viewer?.notifyEmail ?? true,
          notifySms: true,
          smsConsentSource: "host_onboarding",
          smsConsentConfirmed: true,
        });
      }

      // Compile human-readable notes from house rules
      const rulesMarkdown = selectedRules
        .map((r, i) => `${i + 1}. **${r.title}**: ${r.description}`)
        .join("\n\n");

      const stayId = await createStay({
        timezone,
        nextCheckInDate: nextCheckInDate || undefined,
        paymentOptions: (Object.entries(paymentDetails) as Array<[keyof typeof paymentDetails, string]>)
          .filter(([, detail]) => detail.trim())
          .map(([provider, detail]) => ({ provider, detail: detail.trim() })),
        terms: {
          startDate,
          endDate,
          cadence,
          rateCents: Math.round(Number(rate) * 100),
          earlyDiscountEnabled: earlyEnabled,
          earlyDiscountPercentage: earlyEnabled ? Number(earlyDiscount) : 0,
          earlyDiscountDays: earlyEnabled ? Number(earlyDays) : 0,
          lateFeeEnabled: lateEnabled,
          lateFeeCents: lateEnabled ? Math.round(Number(lateFee) * 100) : 0,
          graceDays: lateEnabled ? Number(graceDays) : 0,
          houseNotes: rulesMarkdown || "Standard household expectations apply.",
          houseRules: selectedRules.map((r) => ({
            id: r.id,
            category: r.category,
            title: r.title,
            description: r.description,
            required: r.required,
          })),
          rewards: {
            enabled: rewardsEnabled,
            coinName: coinName.trim() || "Coins",
            centsPerPoint: Math.max(1, Math.round(Number(centsPerPoint || "100"))),
            maxCreditPerPeriodCents: Math.round(Number(maxCreditPeriod || "0") * 100),
          },
        },
      });
      onComplete?.(stayId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the stay");
      setSaving(false);
    }
  }

  return (
    <div className="setup-card" style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Wizard Progress Bar */}
      <div className="wizard-header">
        <div className="wizard-progress-track">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className="wizard-progress-step"
              style={{
                background: s <= step ? "var(--green, #184f3a)" : "var(--line, #e2ded7)",
              }}
            />
          ))}
        </div>
        <span className="wizard-step-label">
          Step {step} of 5 · {["Dates", "Rules", "Rewards", "Financials", "Review"][step - 1]}
        </span>
      </div>

      {/* Step 1: Stay Basics & Cadence */}
      {step === 1 && (
        <div key="step-1" className="screen-transition">
          <p className="eyebrow onboarding-eyebrow">Step 1 of 5 · Stay Schedule <HelpTip title="Set the stay dates" href={HELP_LINKS.hostsGettingStarted}>Choose the planned dates, contribution rhythm, and first check-in. The estimated total is a planning guide and excludes optional discounts, rewards, and one-off charges.</HelpTip></p>
          <h1>Set the dates and contribution cadence.</h1>
          <p className="subhead">
            Past start dates are welcome. Kouchd builds the historical ledger from day one.
          </p>

          <div className="form-grid" style={{ marginTop: "1.5rem" }}>
            <label>
              <span>Start date</span>
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Planned end</span>
              <input
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Contribution schedule</span>
              <select
                name="cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as "daily" | "weekly")}
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </label>
            <label>
              <span>Amount per {cadence === "weekly" ? "week" : "day"}</span>
              <div className="money-input">
                <span>$</span>
                <input
                  name="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                />
              </div>
            </label>
            <div className="estimate-card full">
              <span>Estimated stay total</span>
              <strong>{money.format(estimatedStayCharge / 100)}</strong>
              <small>Before optional contribution rewards, discounts, or one-off charges.</small>
            </div>
            <label>
              <span>First check-in date</span>
              <input
                name="checkInDate"
                type="date"
                value={nextCheckInDate}
                onChange={(e) => setNextCheckInDate(e.target.value)}
              />
            </label>
            <label>
              <span>Household Timezone</span>
              <input
                type="text"
                readOnly
                value={`${timezone} (Auto-detected)`}
                style={{ background: "var(--paper, #f5f0e8)", color: "var(--muted)", cursor: "default" }}
              />
            </label>
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            {onCancel && (
              <button className="button ghost" type="button" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button className="button primary" type="button" onClick={() => setStep(2)}>
              Next: House Rules <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Guided House Rules & Boundaries */}
      {step === 2 && (
        <div key="step-2" className="screen-transition">
          <p className="eyebrow onboarding-eyebrow">Step 2 of 5 · Living Expectations <HelpTip title="Choose house rules" href={HELP_LINKS.houseRulesAndChores}>Select the expectations that fit your home, and add custom guidance where a suggestion does not cover it.</HelpTip></p>
          <h1>Establish clear house rules.</h1>
          <p className="subhead">
            We provide suggestions based on successful shared stays. Select what applies or add custom boundaries.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.5rem" }}>
            {SUGGESTED_HOUSE_RULES.map((category) => (
              <div key={category.category} className="rule-category-card">
                <div className="rule-category-header">
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {category.suggestions.map((suggestion) => {
                    const isSelected = selectedRules.some((r) => r.id === suggestion.id);
                    return (
                      <label
                        key={suggestion.id}
                        className="rule-check-item"
                        style={{ background: isSelected ? "#f2f8f4" : undefined }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleSuggestedRule({
                              ...suggestion,
                              category: category.category,
                            })
                          }
                        />
                        <div className="rule-check-content">
                          <strong>{suggestion.title}</strong>
                          <p>{suggestion.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom Rule Input */}
            <div
              style={{
                border: "1px dashed var(--line, #e2ded7)",
                borderRadius: "16px",
                padding: "1.2rem 1.4rem",
                background: "var(--paper, #faf8f5)",
              }}
            >
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "0.35rem", color: "var(--ink)" }}>
                Add a custom house rule
              </strong>
              <p className="muted" style={{ fontSize: "0.82rem", margin: "0 0 0.85rem" }}>
                Add specific rules for keys, quiet hours, pets, or shared spaces.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="Rule title (e.g. Lock deadbolt whenever leaving)"
                  value={customRuleTitle}
                  onChange={(e) => setCustomRuleTitle(e.target.value)}
                  maxLength={160}
                />
                <input
                  type="text"
                  placeholder="Optional details or context"
                  value={customRuleDesc}
                  onChange={(e) => setCustomRuleDesc(e.target.value)}
                  maxLength={500}
                />
                <button
                  className="button soft"
                  type="button"
                  onClick={addCustomRule}
                  style={{ alignSelf: "flex-start" }}
                  disabled={!customRuleTitle.trim()}
                >
                  <Plus size={16} /> Add rule
                </button>
              </div>
            </div>

            {/* Selected Rules Summary */}
            {selectedRules.length > 0 && (
              <div style={{ marginTop: "0.25rem" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green, #184f3a)" }}>
                  ✓ {selectedRules.length} house rule{selectedRules.length === 1 ? "" : "s"} selected for this agreement
                </p>
              </div>
            )}
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(1)}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" type="button" onClick={() => setStep(3)}>
              Next: Contribution Rewards <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contribution Rewards & Household Economy */}
      {step === 3 && (
        <div key="step-3" className="screen-transition">
          <p className="eyebrow onboarding-eyebrow">Step 3 of 5 · Contribution Rewards <HelpTip title="Optional rewards" href={HELP_LINKS.pricingAndTerms}>Rewards let guests earn household credits for approved contributions. You can turn them off or adjust their value and limits.</HelpTip></p>
          <h1>Reward household contributions.</h1>
          <p className="subhead">
            Allow members to earn points/coins by contributing to the household, which can turn into financial value toward their stay.
          </p>

          <div style={{ marginTop: "1.5rem" }}>
            <label className="switch-row full" style={{ marginBottom: "1.25rem" }}>
              <input
                type="checkbox"
                checked={rewardsEnabled}
                onChange={(e) => setRewardsEnabled(e.target.checked)}
              />
              <span>
                <strong>Enable Contribution Points System</strong>
                <small>Optional: Guests earn coins for approved chores, cooking, or supplies that reduce their balance.</small>
              </span>
            </label>

            {rewardsEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="rewards-config-grid">
                  <label>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Coin / Point Name</span>
                    <input
                      type="text"
                      value={coinName}
                      onChange={(e) => setCoinName(e.target.value)}
                      placeholder="e.g. Coins, Points"
                      required
                    />
                  </label>
                  <label>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Financial Value per Coin</span>
                    <div className="money-input">
                      <span>$</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        value={(Number(centsPerPoint) / 100).toFixed(2)}
                        onChange={(e) => setCentsPerPoint(String(Math.round(Number(e.target.value) * 100)))}
                        required
                      />
                    </div>
                  </label>
                  <label>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Max Credit Cap per {cadence === "weekly" ? "Week" : "Day"}</span>
                    <div className="money-input">
                      <span>$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={maxCreditPeriod}
                        onChange={(e) => setMaxCreditPeriod(e.target.value)}
                        placeholder="e.g. 100"
                        required
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "0.25rem" }}>
                    Select Eligible Contribution Activities
                  </strong>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted, #6f6b64)", marginBottom: "0.75rem" }}>
                    Guests can complete these tasks and request host confirmation to earn {coinName}.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {SUGGESTED_CONTRIBUTION_TASKS.map((task) => {
                      const isSelected = selectedTasks.some((t) => t.id === task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: `1px solid ${isSelected ? "var(--green, #184f3a)" : "var(--line, #e2ded7)"}`,
                            borderRadius: "12px",
                            padding: "0.75rem 1rem",
                            background: isSelected ? "#f1f6f1" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "6px",
                                border: "1px solid var(--line, #e2ded7)",
                                background: isSelected ? "var(--green, #184f3a)" : "#fff",
                                color: "#fff",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && <Check size={14} />}
                            </div>
                            <div>
                              <strong style={{ fontSize: "0.88rem", display: "block" }}>{task.title}</strong>
                              <span style={{ fontSize: "0.78rem", color: "var(--muted, #6f6b64)" }}>
                                {task.description}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              color: "var(--green, #184f3a)",
                              background: "rgba(24, 79, 58, 0.1)",
                              padding: "4px 10px",
                              borderRadius: "99px",
                              whiteSpace: "nowrap",
                              marginLeft: "8px",
                              flexShrink: 0,
                            }}
                          >
                            +{task.defaultPoints} {coinName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(2)}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" type="button" onClick={() => setStep(4)}>
              Next: Financial Rules <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Early Discount & Late Fee Rules + IN-APP PAYMENTS */}
      {step === 4 && (
        <div key="step-4" className="screen-transition">
          <p className="eyebrow onboarding-eyebrow">Step 4 of 5 · Financial Rules <HelpTip title="Set clear timing rules" href={HELP_LINKS.pricingAndTerms}>Early discounts and late fees are optional. Keep the rules understandable and agree on them before the stay begins.</HelpTip></p>
          <h1>Discounts and late fee terms.</h1>
          <p className="subhead">Optional incentives to encourage timely contributions. Both are off by default.</p>

          <div className="form-grid" style={{ marginTop: "1.5rem" }}>
            <label className="switch-row full">
              <input
                type="checkbox"
                checked={earlyEnabled}
                onChange={(e) => setEarlyEnabled(e.target.checked)}
              />
              <span>
                <strong>Offer an early-payment discount</strong>
                <small>Rewarding guests who settle before their due date.</small>
              </span>
            </label>
            {earlyEnabled && (
              <>
                <label>
                  <span>Discount percentage</span>
                  <div className="suffix-input">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={earlyDiscount}
                      onChange={(e) => setEarlyDiscount(e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </label>
                <label>
                  <span>Days paid before due date</span>
                  <div className="suffix-input">
                    <input
                      type="number"
                      min="1"
                      value={earlyDays}
                      onChange={(e) => setEarlyDays(e.target.value)}
                    />
                    <span>days</span>
                  </div>
                </label>
              </>
            )}

            <label className="switch-row full">
              <input
                type="checkbox"
                checked={lateEnabled}
                onChange={(e) => setLateEnabled(e.target.checked)}
              />
              <span>
                <strong>Add weekly rollover late fees</strong>
                <small>Applies after an agreed grace period.</small>
              </span>
            </label>
            {lateEnabled && (
              <>
                <label>
                  <span>Weekly late fee</span>
                  <div className="money-input">
                    <span>$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={lateFee}
                      onChange={(e) => setLateFee(e.target.value)}
                    />
                  </div>
                </label>
                <label>
                  <span>Grace period</span>
                  <div className="suffix-input">
                    <input
                      type="number"
                      min="1"
                      value={graceDays}
                      onChange={(e) => setGraceDays(e.target.value)}
                    />
                    <span>days</span>
                  </div>
                </label>
              </>
            )}
          </div>

          <section className="payment-setup-card">
            <h3>How guests can pay you</h3>
            <p className="muted">Add any payment username, contact detail, or link you want to share. Guests pay you directly outside Kouchd.</p>
            <div className="form-grid">
              {([
                ["paypal", "PayPal"],
                ["cashapp", "Cash App"],
                ["zelle", "Zelle"],
                ["applepay", "Apple Pay"],
              ] as const).map(([provider, label]) => (
                <label className="full" key={provider}>
                  <span>{label}</span>
                  <input value={paymentDetails[provider]} onChange={(event) => setPaymentDetails({ ...paymentDetails, [provider]: event.target.value })} maxLength={250} placeholder="Username, phone/email, or https:// link" />
                </label>
              ))}
            </div>
            <p className="muted">Kouchd does not collect or process these payments. You can update these details later in Stay details.</p>
          </section>

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(3)}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" type="button" onClick={() => setStep(5)}>
              Next: Review Agreement <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Final Review & Agreement Launch */}
      {step === 5 && (
        <div key="step-5" className="screen-transition">
          <p className="eyebrow onboarding-eyebrow">Step 5 of 5 · Final Agreement <HelpTip title="Review before creating" href={HELP_LINKS.hostsGettingStarted}>Check the dates, amount, house rules, and optional financial rules. You can then invite guests to review and accept the agreement.</HelpTip></p>
          <h1>Review the House Agreement.</h1>
          <p className="subhead">
            Creating the stay records your acceptance as host. Each guest reviews and accepts these terms when joining; they only need to accept again if the agreement changes.
          </p>

          <div
            style={{
              marginTop: "1.5rem",
              border: "1px solid var(--line, #e2ded7)",
              borderRadius: "16px",
              padding: "1.5rem",
              background: "#faf8f5",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Stay Dates
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: "1rem" }}>{startDate} to {endDate}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Contribution Plan
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: "1rem" }}>
                  ${rate} / {cadence === "weekly" ? "week" : "day"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Contribution Rewards
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: "1rem" }}>
                  {rewardsEnabled ? `Active (1 ${coinName} = $${(Number(centsPerPoint) / 100).toFixed(2)})` : "Off"}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted, #6f6b64)", fontWeight: 700 }}>
                  Payment Processing
                </span>
                <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: "0.92rem", color: "var(--green, #184f3a)" }}>
                  External payments · Kouchd does not process payments
                </p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--line, #e2ded7)", paddingTop: "1rem" }}>
              <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: "0.5rem" }}>
                House Rules & Boundaries ({selectedRules.length})
              </strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {selectedRules.map((rule, idx) => (
                  <div key={rule.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--green, #184f3a)", fontWeight: 700 }}>{idx + 1}.</span>
                    <div>
                      <strong>{rule.title}</strong>: <span style={{ color: "var(--muted, #6f6b64)" }}>{rule.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Notification Acceptance */}
            <div
              style={{
                marginTop: "1.25rem",
                border: "1px solid #b8d2c1",
                borderRadius: "14px",
                padding: "1.25rem",
                background: "#eaf4ec",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                <MessageSquare size={20} color="var(--green, #184f3a)" />
                <strong style={{ fontSize: "0.95rem", color: "var(--green, #184f3a)" }}>
                  Host SMS Notifications &middot; Wrelik Brands LLC
                </strong>
              </div>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#2d4438", lineHeight: 1.5 }}>
                Receive real-time text alerts when guests join, log contributions, or accept agreements from <strong>Wrelik Brands LLC</strong> (operating <strong>Kouchd</strong>).
              </p>

              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#184f3a", marginBottom: "0.3rem" }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  defaultValue={viewer?.phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    border: "1px solid var(--line, #e2ded7)",
                    background: "#fff",
                    fontSize: "0.9rem",
                    color: "var(--ink, #17251f)",
                  }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={optInSms}
                  onChange={(e) => setOptInSms(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    marginTop: "2px",
                    accentColor: "var(--green, #184f3a)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.78rem", color: "#184f3a", lineHeight: 1.5 }}>
                  I agree to receive transactional text messages (SMS) from Wrelik Brands LLC (operating Kouchd). <strong>Message and data rates may apply.</strong> Message frequency varies. Reply STOP to cancel, HELP for info. View{" "}
                  <Link href="/terms" target="_blank" style={{ color: "var(--green, #184f3a)", fontWeight: 700, textDecoration: "underline" }}>
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "var(--green, #184f3a)", fontWeight: 700, textDecoration: "underline" }}>
                    Privacy Policy
                  </Link>.
                </span>
              </label>
            </div>
          </div>

          {error && <p className="form-error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}

          <div className="dialog-actions" style={{ marginTop: "2rem" }}>
            <button className="button ghost" type="button" onClick={() => setStep(4)} disabled={saving}>
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" type="button" onClick={handleFinalSubmit} disabled={saving}>
              <Sparkles size={18} /> {saving ? "Creating household..." : "Create stay"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
