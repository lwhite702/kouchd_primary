"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Check, Coins, Copy, ExternalLink, QrCode, Smartphone, Sparkles, Wallet } from "lucide-react";

import {
  buildNetworkRouteUri,
  calculateContributionWithRewards,
  DEFAULT_P2P_TRANSACTION,
  detectMobileUserAgent,
  ExtendedPaymentChannelId,
  formatRecipientHandle,
  P2PTransactionInput,
} from "@/lib/domain/p2pRouting";
import { generateQrMatrixLevelH } from "@/lib/domain/qrCodeLevelH";

export type LifecyclePhase =
  | "SELECT_AND_ROUTE"
  | "OUTBOUND_CONFIRMATION"
  | "PROCESSING_VERIFICATION"
  | "SUCCESS_COMPLETION";

export type ContributionCategory =
  | "payment"
  | "groceries"
  | "supplies"
  | "house_work"
  | "other";

export interface RewardWalletConfig {
  enabled: boolean;
  availablePoints: number;
  coinName: string;
  centsPerPoint: number;
  maxRedeemablePoints: number;
}

export interface LoggedContributionPayload {
  transactionId: string;
  type: ContributionCategory;
  channelId: ExtendedPaymentChannelId | "rewards_only" | "non_cash";
  channelLabel: string;
  grossAmountCents: number;
  netPaymentAmountCents: number;
  pointsRedeemed: number;
  rewardCreditCents: number;
  date: string;
  note: string;
  countsTowardBalance: boolean;
}

export interface P2PConfirmationReceipt {
  transactionId: string;
  timestamp: string;
  settledAmount: string;
  rewardCreditFormatted?: string;
  pointsRedeemed?: number;
  networkId: string;
  networkLabel: string;
  recipientHandle: string;
}

export interface P2PPaymentRouterProps {
  transaction?: P2PTransactionInput;
  defaultDate?: string;
  allowEditingDetails?: boolean;
  rewardWallet?: RewardWalletConfig;
  forceMobileDevice?: boolean;
  onLogContribution?: (payload: LoggedContributionPayload) => Promise<void> | void;
  onComplete?: (receipt: P2PConfirmationReceipt) => void;
  onCancel?: () => void;
}

interface ChannelMeta {
  id: ExtendedPaymentChannelId;
  name: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  shortHint: string;
}

const CHANNEL_META: Record<ExtendedPaymentChannelId, ChannelMeta> = {
  venmo: {
    id: "venmo",
    name: "Venmo",
    accentColor: "#184f3a",
    badgeBg: "#eef6f2",
    badgeText: "#184f3a",
    shortHint: "App link on phone · QR on desktop",
  },
  cashapp: {
    id: "cashapp",
    name: "Cash App",
    accentColor: "#184f3a",
    badgeBg: "#eef6f2",
    badgeText: "#184f3a",
    shortHint: "$Cashtag link on phone · QR on desktop",
  },
  chime: {
    id: "chime",
    name: "Chime",
    accentColor: "#184f3a",
    badgeBg: "#eef6f2",
    badgeText: "#184f3a",
    shortHint: "Pay Anyone link · QR on desktop",
  },
  zelle: {
    id: "zelle",
    name: "Zelle",
    accentColor: "#184f3a",
    badgeBg: "#f4f8f0",
    badgeText: "#184f3a",
    shortHint: "Copy email or phone for your bank app",
  },
  cash: {
    id: "cash",
    name: "Cash",
    accentColor: "#184f3a",
    badgeBg: "#f5f0e8",
    badgeText: "#37423c",
    shortHint: "Hand directly to your host or leave a note",
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    accentColor: "#184f3a",
    badgeBg: "#f1f9fb",
    badgeText: "#1c5665",
    shortHint: "PayPal.me link on phone · QR on desktop",
  },
  applepay: {
    id: "applepay",
    name: "Apple Cash",
    accentColor: "#184f3a",
    badgeBg: "#f5f0e8",
    badgeText: "#17251f",
    shortHint: "Send via Messages with Apple Cash",
  },
};

const CASUAL_VERIFICATION_STEPS = [
  "Writing down your note for the house...",
  "Adding your contribution to the shared Ledger...",
  "Giving your host a quick heads-up...",
];

const PROCESSING_DURATION_MS = 4500;

function LevelHQrCodeSvg({
  value,
  size = 184,
}: {
  value: string;
  size?: number;
}) {
  const matrix = useMemo(() => generateQrMatrixLevelH(value), [value]);
  const quietZone = 3;
  const totalModules = matrix.size + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      role="img"
      aria-label={`Level-H QR code for ${value}`}
      style={{ display: "block", borderRadius: "12px", background: "#fffdf8" }}
    >
      <rect width={totalModules} height={totalModules} fill="#fffdf8" />
      {matrix.modules.map((row, rIdx) =>
        row.map((isDark, cIdx) =>
          isDark ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#17251f"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export const P2PPaymentRouter: React.FC<P2PPaymentRouterProps> = ({
  transaction = DEFAULT_P2P_TRANSACTION,
  defaultDate,
  allowEditingDetails = false,
  rewardWallet,
  forceMobileDevice,
  onLogContribution,
  onComplete,
  onCancel,
}) => {
  const [phase, setPhase] = useState<LifecyclePhase>("SELECT_AND_ROUTE");
  const [contributionType, setContributionType] = useState<ContributionCategory>("payment");
  const [selectedChannel, setSelectedChannel] = useState<ExtendedPaymentChannelId>("venmo");

  // Editable amount, memo, date, and fallback handle when hosts haven't configured one yet
  const [amountInput, setAmountInput] = useState<string>(transaction.amount);
  const [memoInput, setMemoInput] = useState<string>(transaction.memo);
  const [dateInput, setDateInput] = useState<string>(
    defaultDate || new Date().toISOString().slice(0, 10),
  );
  const [countsTowardBalance, setCountsTowardBalance] = useState<boolean>(true);
  const [customHandleOverride, setCustomHandleOverride] = useState<Record<string, string>>({});

  // Rewards offset state
  const [applyRewards, setApplyRewards] = useState<boolean>(false);
  const [pointsToUse, setPointsToUse] = useState<number>(
    rewardWallet?.maxRedeemablePoints ?? 0,
  );

  // Device detection (with optional manual toggle override)
  const [deviceOverride, setDeviceOverride] = useState<boolean | null>(null);
  const isMobile =
    deviceOverride !== null
      ? deviceOverride
      : typeof forceMobileDevice === "boolean"
        ? forceMobileDevice
        : detectMobileUserAgent();

  const [copiedCredential, setCopiedCredential] = useState<boolean>(false);
  const [verificationStepIndex, setVerificationStepIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [completionTimestamp, setCompletionTimestamp] = useState<string>("");
  const [persistError, setPersistError] = useState<string>("");

  const copyTimeoutRef = useRef<number | null>(null);
  const hasLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Build effective transaction object combining props + any inline edits
  const effectiveTransaction: P2PTransactionInput = useMemo(
    () => ({
      ...transaction,
      amount: amountInput || transaction.amount,
      memo: memoInput || transaction.memo,
      recipientVenmo:
        customHandleOverride.venmo ?? (transaction.recipientVenmo || "johndoe"),
      recipientCashApp:
        customHandleOverride.cashapp ?? (transaction.recipientCashApp || "johndoe33"),
      recipientChime:
        customHandleOverride.chime ?? (transaction.recipientChime || "john-doe-chime"),
      recipientZelle:
        customHandleOverride.zelle ?? (transaction.recipientZelle || "johndoe@email.com"),
      recipientCashNote:
        customHandleOverride.cash ??
        (transaction.recipientCashNote || "Hand directly to your host or leave in the agreed spot"),
      recipientPayPal:
        customHandleOverride.paypal ?? (transaction.recipientPayPal || "johndoe"),
      recipientApplePay: customHandleOverride.applepay ?? transaction.recipientApplePay,
    }),
    [transaction, amountInput, memoInput, customHandleOverride],
  );

  const canUseRewards = Boolean(
    rewardWallet?.enabled &&
      rewardWallet.availablePoints > 0 &&
      rewardWallet.maxRedeemablePoints > 0 &&
      contributionType === "payment",
  );

  const rewardSummary = useMemo(() => {
    if (!canUseRewards || !applyRewards || !rewardWallet) {
      const grossCents = Math.max(0, Math.round((Number(effectiveTransaction.amount) || 0) * 100));
      return {
        grossAmountCents: grossCents,
        pointsApplied: 0,
        rewardCreditCents: 0,
        netPayableCents: grossCents,
        netPayableFormatted: (grossCents / 100).toFixed(2),
      };
    }
    return calculateContributionWithRewards({
      amountDollars: effectiveTransaction.amount,
      pointsToApply: pointsToUse,
      availablePoints: rewardWallet.availablePoints,
      centsPerPoint: rewardWallet.centsPerPoint,
      maxRedeemablePoints: rewardWallet.maxRedeemablePoints,
    });
  }, [canUseRewards, applyRewards, rewardWallet, effectiveTransaction.amount, pointsToUse]);

  const isCoveredEntirelyByRewards =
    canUseRewards &&
    applyRewards &&
    rewardSummary.grossAmountCents > 0 &&
    rewardSummary.netPayableCents === 0;

  const availableChannels: ExtendedPaymentChannelId[] = useMemo(() => {
    const base: ExtendedPaymentChannelId[] = [
      "venmo",
      "cashapp",
      "chime",
      "paypal",
      "zelle",
      "cash",
    ];
    if (effectiveTransaction.recipientApplePay) base.push("applepay");
    return base;
  }, [effectiveTransaction.recipientApplePay]);

  const activeChannelMeta = CHANNEL_META[selectedChannel];
  const activeRouteUri = useMemo(
    () =>
      buildNetworkRouteUri(
        selectedChannel,
        effectiveTransaction,
        rewardSummary.netPayableFormatted,
      ),
    [selectedChannel, effectiveTransaction, rewardSummary.netPayableFormatted],
  );
  const activeHandle = useMemo(
    () => formatRecipientHandle(selectedChannel, effectiveTransaction),
    [selectedChannel, effectiveTransaction],
  );

  const startVerificationPhase = useCallback(() => {
    setPersistError("");
    setVerificationStepIndex(0);
    setProgressPercent(0);
    setPhase("PROCESSING_VERIFICATION");
  }, []);

  // Phase 3: 4.5-second internal timer + casual cycling status microcopy + persistence hook
  useEffect(() => {
    if (phase !== "PROCESSING_VERIFICATION") {
      return;
    }

    hasLoggedRef.current = false;

    const startTime = performance.now();
    const stepDuration = PROCESSING_DURATION_MS / CASUAL_VERIFICATION_STEPS.length;

    const progressInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const ratio = Math.min(elapsed / PROCESSING_DURATION_MS, 1);
      setProgressPercent(Math.round(ratio * 100));

      const nextIdx = Math.min(
        Math.floor(elapsed / stepDuration),
        CASUAL_VERIFICATION_STEPS.length - 1,
      );
      setVerificationStepIndex(nextIdx);
    }, 60);

    const completionTimer = window.setTimeout(async () => {
      if (hasLoggedRef.current) return;
      hasLoggedRef.current = true;

      const settledAt = new Date().toISOString();
      setCompletionTimestamp(settledAt);
      setProgressPercent(100);

      if (onLogContribution) {
        try {
          const channelLabel =
            contributionType !== "payment"
              ? contributionType.replaceAll("_", " ")
              : isCoveredEntirelyByRewards
                ? `${rewardWallet?.coinName ?? "Reward"} credit`
                : activeChannelMeta.name;

          const noteParts = [effectiveTransaction.memo.trim()];
          if (contributionType === "payment") {
            if (isCoveredEntirelyByRewards) {
              noteParts.push(`Covered with ${rewardSummary.pointsApplied} ${rewardWallet?.coinName ?? "Coins"}`);
            } else if (rewardSummary.pointsApplied > 0) {
              noteParts.push(
                `Sent $${rewardSummary.netPayableFormatted} via ${activeChannelMeta.name} + ${rewardSummary.pointsApplied} ${rewardWallet?.coinName ?? "Coins"}`,
              );
            } else {
              noteParts.push(`via ${activeChannelMeta.name}`);
            }
          }

          await onLogContribution({
            transactionId: effectiveTransaction.transactionId,
            type: contributionType,
            channelId:
              contributionType !== "payment"
                ? "non_cash"
                : isCoveredEntirelyByRewards
                  ? "rewards_only"
                  : selectedChannel,
            channelLabel,
            grossAmountCents: rewardSummary.grossAmountCents,
            netPaymentAmountCents: rewardSummary.netPayableCents,
            pointsRedeemed: rewardSummary.pointsApplied,
            rewardCreditCents: rewardSummary.rewardCreditCents,
            date: dateInput,
            note: noteParts.filter(Boolean).join(" · "),
            countsTowardBalance,
          });
        } catch (err) {
          setPersistError(
            err instanceof Error
              ? err.message
              : "Could not save this contribution to the Ledger.",
          );
          setPhase("SELECT_AND_ROUTE");
          return;
        }
      }

      setPhase("SUCCESS_COMPLETION");
    }, PROCESSING_DURATION_MS);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(completionTimer);
    };
  }, [
    phase,
    onLogContribution,
    contributionType,
    isCoveredEntirelyByRewards,
    rewardWallet?.coinName,
    activeChannelMeta.name,
    effectiveTransaction.memo,
    effectiveTransaction.transactionId,
    rewardSummary.pointsApplied,
    rewardSummary.netPayableFormatted,
    rewardSummary.grossAmountCents,
    rewardSummary.netPayableCents,
    rewardSummary.rewardCreditCents,
    selectedChannel,
    dateInput,
    countsTowardBalance,
  ]);

  const handleCopyCredential = useCallback(async (textToCopy: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCredential(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedCredential(false);
      }, 2400);
    } catch {
      setCopiedCredential(false);
    }
  }, []);

  const handleLaunchOutboundRoute = useCallback(() => {
    if (
      contributionType === "payment" &&
      !isCoveredEntirelyByRewards &&
      (selectedChannel === "venmo" ||
        selectedChannel === "cashapp" ||
        selectedChannel === "chime" ||
        selectedChannel === "paypal")
    ) {
      if (isMobile) {
        window.open(activeRouteUri, "_blank", "noopener,noreferrer");
      }
    }
    setPhase("OUTBOUND_CONFIRMATION");
  }, [contributionType, isCoveredEntirelyByRewards, selectedChannel, activeRouteUri, isMobile]);

  const handleDirectLogWithoutAppSwitch = useCallback(() => {
    startVerificationPhase();
  }, [startVerificationPhase]);

  const handleFinishAndClose = useCallback(() => {
    const receipt: P2PConfirmationReceipt = {
      transactionId: effectiveTransaction.transactionId,
      timestamp: completionTimestamp || new Date().toISOString(),
      settledAmount: rewardSummary.netPayableFormatted,
      rewardCreditFormatted:
        rewardSummary.rewardCreditCents > 0
          ? (rewardSummary.rewardCreditCents / 100).toFixed(2)
          : undefined,
      pointsRedeemed: rewardSummary.pointsApplied > 0 ? rewardSummary.pointsApplied : undefined,
      networkId:
        contributionType !== "payment"
          ? contributionType
          : isCoveredEntirelyByRewards
            ? "rewards"
            : selectedChannel,
      networkLabel:
        contributionType !== "payment"
          ? contributionType.replaceAll("_", " ")
          : isCoveredEntirelyByRewards
            ? `${rewardWallet?.coinName ?? "Reward"} credit`
            : activeChannelMeta.name,
      recipientHandle: activeHandle,
    };
    onComplete?.(receipt);
    setPhase("SELECT_AND_ROUTE");
  }, [
    effectiveTransaction.transactionId,
    completionTimestamp,
    rewardSummary.netPayableFormatted,
    rewardSummary.rewardCreditCents,
    rewardSummary.pointsApplied,
    contributionType,
    isCoveredEntirelyByRewards,
    selectedChannel,
    rewardWallet?.coinName,
    activeChannelMeta.name,
    activeHandle,
    onComplete,
  ]);

  return (
    <div style={styles.wrapper}>
      <style>{`
        @keyframes kouchdRouterSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes kouchdRouterFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={styles.card} aria-live="polite">
        {/* Top Summary Header */}
        <header style={styles.header}>
          <div style={styles.headerBadgeRow}>
            <span style={styles.refPill}>Ref · {effectiveTransaction.transactionId}</span>
            <button
              type="button"
              onClick={() => setDeviceOverride(!isMobile)}
              style={styles.deviceTogglePill}
              title="Switch between mobile deep-link and desktop QR code view"
            >
              {isMobile ? (
                <>
                  <Smartphone size={12} /> Phone app links
                </>
              ) : (
                <>
                  <QrCode size={12} /> Desktop QR view
                </>
              )}
            </button>
          </div>

          <div style={styles.amountDisplayRow}>
            <span style={styles.currencySign}>$</span>
            <span style={styles.amountBigText}>{rewardSummary.netPayableFormatted}</span>
          </div>

          {rewardSummary.rewardCreditCents > 0 && (
            <div style={styles.rewardOffsetPill}>
              <Coins size={13} />
              <span>
                ${(rewardSummary.grossAmountCents / 100).toFixed(2)} total − $
                {(rewardSummary.rewardCreditCents / 100).toFixed(2)} ({rewardSummary.pointsApplied}{" "}
                {rewardWallet?.coinName ?? "Coins"})
              </span>
            </div>
          )}

          <div style={styles.memoPill}>
            <span style={styles.memoPrefix}>Note:</span>
            <span style={styles.memoValue}>{effectiveTransaction.memo}</span>
          </div>
        </header>

        {persistError && (
          <div style={styles.errorBanner} role="alert">
            {persistError}
          </div>
        )}

        {/* PHASE 1: SELECT & ROUTE */}
        {phase === "SELECT_AND_ROUTE" && (
          <div style={styles.phaseBody}>
            {allowEditingDetails && (
              <div style={styles.editDetailsBox}>
                <div style={styles.modePillsRow} role="tablist" aria-label="Contribution kind">
                  {(
                    [
                      { id: "payment", label: "Send money / Cash" },
                      { id: "groceries", label: "Groceries" },
                      { id: "supplies", label: "Supplies" },
                      { id: "house_work", label: "House work" },
                      { id: "other", label: "Other" },
                    ] as const
                  ).map((item) => {
                    const active = contributionType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setContributionType(item.id)}
                        style={{
                          ...styles.modePillBtn,
                          backgroundColor: active ? "#184f3a" : "#fffdf8",
                          color: active ? "#ffffff" : "#37423c",
                          borderColor: active ? "#184f3a" : "#ded8ce",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div style={styles.inlineFieldsRow}>
                  <label style={styles.fieldLabel}>
                    <span>Amount ($)</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      style={styles.textInput}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    <span>Date</span>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      style={styles.textInput}
                    />
                  </label>
                </div>

                <label style={{ ...styles.fieldLabel, marginTop: "8px" }}>
                  <span>Household note</span>
                  <input
                    type="text"
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    placeholder="Week two contribution, grocery run..."
                    style={styles.textInput}
                  />
                </label>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={countsTowardBalance}
                    onChange={(e) => setCountsTowardBalance(e.target.checked)}
                  />
                  <span>Count this toward the stay balance</span>
                </label>
              </div>
            )}

            {/* Optional Reward Points Offset Box */}
            {canUseRewards && rewardWallet && (
              <div style={styles.rewardsBox}>
                <div style={styles.rewardsHeaderRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Coins size={17} color="#184f3a" />
                    <div>
                      <strong style={{ fontSize: "13px", color: "#17251f", display: "block" }}>
                        Apply {rewardWallet.coinName} ({rewardWallet.availablePoints} available)
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#59675f" }}>
                        Up to {rewardWallet.maxRedeemablePoints} {rewardWallet.coinName} ($
                        {(
                          (rewardWallet.maxRedeemablePoints * rewardWallet.centsPerPoint) /
                          100
                        ).toFixed(2)}
                        ) can apply right now
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyRewards}
                    onChange={(e) => {
                      setApplyRewards(e.target.checked);
                      if (e.target.checked && pointsToUse <= 0) {
                        setPointsToUse(rewardWallet.maxRedeemablePoints);
                      }
                    }}
                    aria-label={`Apply ${rewardWallet.coinName}`}
                    style={{ width: "18px", height: "18px", accentColor: "#184f3a" }}
                  />
                </div>

                {applyRewards && (
                  <div style={styles.rewardsSliderArea}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span>Using {rewardSummary.pointsApplied} {rewardWallet.coinName}</span>
                      <strong>−${(rewardSummary.rewardCreditCents / 100).toFixed(2)} credit</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, rewardWallet.maxRedeemablePoints)}
                      value={Math.min(pointsToUse, rewardWallet.maxRedeemablePoints)}
                      onChange={(e) => setPointsToUse(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#184f3a" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Non-cash contribution logging */}
            {contributionType !== "payment" ? (
              <div style={styles.routingViewport}>
                <p style={styles.casualHelperCopy}>
                  Logging <strong>{contributionType.replaceAll("_", " ")}</strong> ($
                  {rewardSummary.netPayableFormatted}) on the shared Ledger. Your host will get a
                  quick note to confirm it.
                </p>
                <button
                  type="button"
                  onClick={handleDirectLogWithoutAppSwitch}
                  disabled={rewardSummary.grossAmountCents <= 0}
                  style={styles.primaryForestButton}
                >
                  Log {contributionType.replaceAll("_", " ")} on Ledger
                </button>
              </div>
            ) : isCoveredEntirelyByRewards ? (
              /* Covered 100% by Reward Points */
              <div style={styles.routingViewport}>
                <div style={styles.rewardsFullCoverBadge}>
                  <Sparkles size={18} color="#184f3a" />
                  <span>
                    Covered in full with <strong>{rewardSummary.pointsApplied}</strong>{" "}
                    {rewardWallet?.coinName ?? "Coins"}! No outside transfer needed.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDirectLogWithoutAppSwitch}
                  style={styles.primaryForestButton}
                >
                  Redeem {rewardSummary.pointsApplied} {rewardWallet?.coinName ?? "Coins"} &amp; Log
                </button>
              </div>
            ) : (
              /* P2P & Cash Channel Selector + Routing Matrix */
              <>
                <div style={styles.sectionHeaderRow}>
                  <span style={styles.sectionEyebrow}>How are you sending it?</span>
                  <span style={styles.stepPill}>Step 1 of 3</span>
                </div>

                <div role="tablist" aria-label="Payment Channels" style={styles.channelGrid}>
                  {availableChannels.map((chanId) => {
                    const meta = CHANNEL_META[chanId];
                    const isSelected = selectedChannel === chanId;
                    return (
                      <button
                        key={chanId}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedChannel(chanId);
                          setCopiedCredential(false);
                        }}
                        style={{
                          ...styles.channelTabBtn,
                          borderColor: isSelected ? "#184f3a" : "#ded8ce",
                          backgroundColor: isSelected ? "#eef6f2" : "#fffdf8",
                          boxShadow: isSelected ? "0 0 0 2px rgba(24, 79, 58, 0.14)" : "none",
                        }}
                      >
                        <span
                          style={{
                            ...styles.channelDot,
                            backgroundColor: isSelected ? "#184f3a" : "#9e9787",
                          }}
                        />
                        <span style={styles.channelTabName}>{meta.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={styles.routingViewport}>
                  <div style={styles.recipientStrip}>
                    <div>
                      <span style={styles.recipientOverline}>
                        {selectedChannel === "cash"
                          ? "In-person cash note"
                          : `Host ${activeChannelMeta.name} handle`}
                      </span>
                      <strong style={styles.recipientHandleDisplay}>{activeHandle}</strong>
                    </div>
                    <span style={styles.channelBadgePill}>{activeChannelMeta.name}</span>
                  </div>

                  {/* Allow setting a handle inline if host hasn't configured one */}
                  {activeHandle === "Not set by host" && selectedChannel !== "cash" && (
                    <label style={{ ...styles.fieldLabel, marginBottom: "10px", textAlign: "left" }}>
                      <span>Enter host&apos;s {activeChannelMeta.name} handle to route</span>
                      <input
                        type="text"
                        placeholder={
                          selectedChannel === "zelle"
                            ? "host@email.com or phone"
                            : "username or cashtag"
                        }
                        value={customHandleOverride[selectedChannel] ?? ""}
                        onChange={(e) =>
                          setCustomHandleOverride((prev) => ({
                            ...prev,
                            [selectedChannel]: e.target.value,
                          }))
                        }
                        style={styles.textInput}
                      />
                    </label>
                  )}

                  {/* ZELLE: Both Mobile & Desktop display credential field + Copy to Clipboard */}
                  {selectedChannel === "zelle" ? (
                    <div style={styles.channelBodyStack}>
                      <div style={styles.copyFieldRow}>
                        <input
                          type="text"
                          readOnly
                          aria-label="Zelle recipient credential"
                          value={effectiveTransaction.recipientZelle}
                          onFocus={(e) => e.currentTarget.select()}
                          style={styles.readonlyCodeInput}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyCredential(effectiveTransaction.recipientZelle)}
                          style={{
                            ...styles.copyActionBtn,
                            backgroundColor: copiedCredential ? "#184f3a" : "#17251f",
                          }}
                        >
                          {copiedCredential ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedCredential ? "Copied!" : "Copy to Clipboard"}</span>
                        </button>
                      </div>

                      <p style={styles.casualHelperCopy}>
                        Copy your host&apos;s Zelle info above, send{" "}
                        <strong>${rewardSummary.netPayableFormatted}</strong> in your bank&apos;s
                        Zelle app, then tap below so we can log it.
                      </p>

                      <button
                        type="button"
                        onClick={handleLaunchOutboundRoute}
                        style={styles.primaryForestButton}
                      >
                        I&apos;m ready to send via Zelle
                      </button>
                    </div>
                  ) : selectedChannel === "cash" ? (
                    /* CASH: In-person handoff */
                    <div style={styles.channelBodyStack}>
                      <div style={styles.cashInstructionCard}>
                        <Wallet size={18} color="#184f3a" />
                        <span>{effectiveTransaction.recipientCashNote}</span>
                      </div>
                      <p style={styles.casualHelperCopy}>
                        Hand <strong>${rewardSummary.netPayableFormatted}</strong> to your host (or
                        leave it in the agreed spot), then tap below to put it on the shared Ledger.
                      </p>
                      <button
                        type="button"
                        onClick={handleLaunchOutboundRoute}
                        style={styles.primaryForestButton}
                      >
                        Log ${rewardSummary.netPayableFormatted} Cash Contribution
                      </button>
                    </div>
                  ) : isMobile ? (
                    /* MOBILE: Outbound Deep Link for Venmo, Cash App, Chime, PayPal, Apple Cash */
                    <div style={styles.channelBodyStack}>
                      <p style={styles.casualHelperCopy}>
                        Tap below to open <strong>{activeChannelMeta.name}</strong> with{" "}
                        <strong>${rewardSummary.netPayableFormatted}</strong> and your note ready to
                        go.
                      </p>

                      <a
                        href={activeRouteUri}
                        onClick={(e) => {
                          e.preventDefault();
                          handleLaunchOutboundRoute();
                        }}
                        style={{
                          ...styles.primaryForestButton,
                          textDecoration: "none",
                        }}
                      >
                        <span>
                          Open {activeChannelMeta.name} · ${rewardSummary.netPayableFormatted}
                        </span>
                        <ExternalLink size={15} />
                      </a>

                      <div style={styles.uriPillBox}>
                        <span style={styles.uriPillTitle}>App Route</span>
                        <code style={styles.uriCodeString}>{activeRouteUri}</code>
                      </div>
                    </div>
                  ) : (
                    /* DESKTOP: Level-H QR Code for Venmo, Cash App, Chime */
                    <div style={styles.channelBodyStack}>
                      <div
                        role="button"
                        tabIndex={0}
                        title="Scan with your phone camera or click once scanned"
                        onClick={handleLaunchOutboundRoute}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLaunchOutboundRoute();
                          }
                        }}
                        style={styles.qrCardFrame}
                      >
                        <LevelHQrCodeSvg value={activeRouteUri} size={180} />
                        <span style={styles.qrBadgeCaption}>
                          Level-H QR · Scan with your phone camera
                        </span>
                      </div>

                      <p style={styles.casualHelperCopy}>
                        Point your phone camera at the QR code to open{" "}
                        <strong>{activeChannelMeta.name}</strong> with{" "}
                        <strong>${rewardSummary.netPayableFormatted}</strong> pre-filled.
                      </p>

                      <div style={styles.uriPillBox}>
                        <span style={styles.uriPillTitle}>Compiled Link</span>
                        <code style={styles.uriCodeString}>{activeRouteUri}</code>
                      </div>

                      <button
                        type="button"
                        onClick={handleLaunchOutboundRoute}
                        style={styles.primaryForestButton}
                      >
                        I scanned the QR code — next step
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{ ...styles.ghostCancelButton, marginTop: "12px" }}
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* PHASE 2: OUTBOUND CONFIRMATION PROMPT */}
        {phase === "OUTBOUND_CONFIRMATION" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kouchd-outbound-title"
            style={styles.phaseBody}
          >
            <div style={styles.outboundPromptStack}>
              <div style={styles.avatarCircle}>{activeChannelMeta.name.slice(0, 1)}</div>

              <h3 id="kouchd-outbound-title" style={styles.promptTitle}>
                {selectedChannel === "cash"
                  ? "Hand off your cash contribution"
                  : `Finish up in ${activeChannelMeta.name}`}
              </h3>

              <p style={styles.promptCasualCopy}>
                {selectedChannel === "cash" ? (
                  <>
                    Once you hand over <strong>${rewardSummary.netPayableFormatted}</strong> (or
                    leave it in the agreed spot), tap below so we can put it on the shared Ledger.
                  </>
                ) : (
                  <>
                    We&apos;ve opened <strong>{activeChannelMeta.name}</strong>. Please complete
                    your transfer of <strong>${rewardSummary.netPayableFormatted}</strong> inside
                    their app, then pop right back here to log it.
                  </>
                )}
              </p>

              <div style={styles.miniSummaryBox}>
                <div style={styles.miniSummaryRow}>
                  <span>Going to</span>
                  <strong>{activeHandle}</strong>
                </div>
                <div style={styles.miniSummaryRow}>
                  <span>Amount sent</span>
                  <strong>${rewardSummary.netPayableFormatted}</strong>
                </div>
                {rewardSummary.pointsApplied > 0 && (
                  <div style={styles.miniSummaryRow}>
                    <span>{rewardWallet?.coinName ?? "Coins"} applied</span>
                    <strong>
                      {rewardSummary.pointsApplied} (−$
                      {(rewardSummary.rewardCreditCents / 100).toFixed(2)})
                    </strong>
                  </div>
                )}
                <div style={styles.miniSummaryRow}>
                  <span>House note</span>
                  <strong>{effectiveTransaction.memo}</strong>
                </div>
              </div>

              <div style={styles.buttonStack}>
                <button
                  type="button"
                  onClick={startVerificationPhase}
                  style={styles.primaryForestButton}
                >
                  I Have Sent the Money
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("SELECT_AND_ROUTE")}
                  style={styles.secondaryCreamButton}
                >
                  Cancel / Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: SIMULATED PROCESSING VERIFICATION (4.5s) */}
        {phase === "PROCESSING_VERIFICATION" && (
          <div style={styles.phaseBody}>
            <div style={styles.processingStack}>
              <div style={styles.spinnerContainer}>
                <div style={styles.spinnerRing} />
              </div>

              <p style={styles.cyclingCasualTitle}>
                {CASUAL_VERIFICATION_STEPS[verificationStepIndex]}
              </p>

              <p style={styles.processingSubcopy}>
                Saving a shared contribution record for{" "}
                <strong>${(rewardSummary.grossAmountCents / 100).toFixed(2)}</strong> — Kouchd
                keeps the house in sync while payments stay between you two.
              </p>

              <div style={styles.progressTrack} aria-hidden="true">
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              <div style={styles.dotsRow}>
                {CASUAL_VERIFICATION_STEPS.map((stepText, idx) => (
                  <span
                    key={stepText}
                    style={{
                      ...styles.stepDot,
                      backgroundColor: idx <= verificationStepIndex ? "#184f3a" : "#ded8ce",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 4: SUCCESS & ORDER COMPLETION */}
        {phase === "SUCCESS_COMPLETION" && (
          <div style={styles.phaseBody}>
            <div style={styles.successStack}>
              <div style={styles.successBadgeCircle} aria-hidden="true">
                <Check size={32} color="#17251f" strokeWidth={3} />
              </div>

              <h3 style={styles.successHeading}>On the Ledger!</h3>

              <p style={styles.successCasualCopy}>
                All set — your contribution is saved and we gave your host a heads-up so they can
                confirm it once they check their app.
              </p>

              <div style={styles.immutableCard}>
                <div style={styles.immutableCardHeader}>
                  <span style={styles.immutableHeaderLabel}>SHARED CONTRIBUTION RECORD</span>
                  <span style={styles.loggedStatusPill}>AWAITING HOST CONFIRMATION</span>
                </div>

                <div style={styles.immutableCardBody}>
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptKey}>Transaction ID</span>
                    <span style={styles.receiptMonoVal}>{effectiveTransaction.transactionId}</span>
                  </div>
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptKey}>Timestamp</span>
                    <span style={styles.receiptMonoVal}>
                      {completionTimestamp ? new Date(completionTimestamp).toLocaleString() : "Just now"}
                    </span>
                  </div>
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptKey}>Settled Amount</span>
                    <span style={styles.receiptStrongVal}>
                      ${(rewardSummary.grossAmountCents / 100).toFixed(2)} USD
                    </span>
                  </div>
                  {rewardSummary.pointsApplied > 0 && (
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptKey}>
                        {rewardWallet?.coinName ?? "Coins"} Redeemed
                      </span>
                      <span style={styles.receiptStrongVal}>
                        {rewardSummary.pointsApplied} (−$
                        {(rewardSummary.rewardCreditCents / 100).toFixed(2)})
                      </span>
                    </div>
                  )}
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptKey}>Selected Network Routing Channel</span>
                    <span style={styles.receiptStrongVal}>
                      {contributionType !== "payment"
                        ? contributionType.replaceAll("_", " ")
                        : isCoveredEntirelyByRewards
                          ? `${rewardWallet?.coinName ?? "Reward"} credit`
                          : `${activeChannelMeta.name} (${activeHandle})`}
                    </span>
                  </div>
                </div>
              </div>

              <p style={styles.complianceDisclaimer}>
                A contribution is a shared household record — Kouchd never collects, holds, or
                moves money itself.
              </p>

              <button
                type="button"
                onClick={handleFinishAndClose}
                style={styles.primaryForestButton}
              >
                Back to Ledger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
    fontFamily: 'var(--font-manrope), "Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
    color: "#17251f",
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: "22px",
    border: "1px solid #ded8ce",
    boxShadow: "0 14px 32px -12px rgba(23, 37, 31, 0.12)",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(145deg, #184f3a 0%, #123d2e 100%)",
    color: "#ffffff",
    padding: "20px 22px",
    textAlign: "center",
  },
  headerBadgeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  refPill: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    color: "#e5edde",
    padding: "4px 10px",
    borderRadius: "999px",
  },
  deviceTogglePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: "rgba(223, 242, 94, 0.18)",
    color: "#dff25e",
    border: "1px solid rgba(223, 242, 94, 0.35)",
    padding: "4px 10px",
    borderRadius: "999px",
    cursor: "pointer",
  },
  amountDisplayRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "baseline",
    gap: "3px",
    margin: "4px 0 10px",
  },
  currencySign: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#b5d7c7",
  },
  amountBigText: {
    fontSize: "40px",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1,
    color: "#ffffff",
  },
  rewardOffsetPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(223, 242, 94, 0.2)",
    color: "#dff25e",
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "8px",
  },
  memoPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    padding: "5px 14px",
    borderRadius: "999px",
    fontSize: "12.5px",
    maxWidth: "100%",
  },
  memoPrefix: {
    color: "#b5d7c7",
    fontWeight: 600,
  },
  memoValue: {
    color: "#fffdf8",
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  errorBanner: {
    margin: "14px 20px 0",
    padding: "10px 14px",
    borderRadius: "12px",
    backgroundColor: "#fdf2ef",
    border: "1px solid #f5cac0",
    color: "#a93c24",
    fontSize: "13px",
    fontWeight: 600,
  },
  phaseBody: {
    padding: "20px 22px 24px",
    animation: "kouchdRouterFade 0.22s ease-out",
  },
  editDetailsBox: {
    backgroundColor: "#f5f0e8",
    border: "1px solid #ded8ce",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "14px",
  },
  modePillsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "12px",
  },
  modePillBtn: {
    fontSize: "12px",
    fontWeight: 700,
    padding: "6px 11px",
    borderRadius: "999px",
    border: "1px solid #ded8ce",
    cursor: "pointer",
  },
  inlineFieldsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#37423c",
  },
  textInput: {
    padding: "9px 11px",
    borderRadius: "10px",
    border: "1px solid #c4bdad",
    backgroundColor: "#fffdf8",
    fontSize: "13.5px",
    fontWeight: 600,
    color: "#17251f",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#37423c",
  },
  rewardsBox: {
    backgroundColor: "#f4f8f0",
    border: "1px solid #b7cbab",
    borderRadius: "14px",
    padding: "12px 14px",
    marginBottom: "14px",
  },
  rewardsHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  rewardsSliderArea: {
    marginTop: "10px",
    paddingTop: "10px",
    borderTop: "1px solid #d0dec7",
  },
  rewardsFullCoverBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#eef6f2",
    border: "1px solid #b5d7c7",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "13.5px",
    color: "#17251f",
    marginBottom: "12px",
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  sectionEyebrow: {
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#59675f",
  },
  stepPill: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#59675f",
  },
  channelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "8px",
    marginBottom: "14px",
  },
  channelTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1.5px solid #ded8ce",
    cursor: "pointer",
    textAlign: "left",
  },
  channelDot: {
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    flexShrink: 0,
  },
  channelTabName: {
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#17251f",
  },
  routingViewport: {
    backgroundColor: "#f5f0e8",
    border: "1px solid #ded8ce",
    borderRadius: "16px",
    padding: "16px",
  },
  recipientStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    marginBottom: "14px",
    borderBottom: "1px solid #ded8ce",
    gap: "8px",
  },
  recipientOverline: {
    display: "block",
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#59675f",
  },
  recipientHandleDisplay: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#17251f",
    wordBreak: "break-all",
  },
  channelBadgePill: {
    fontSize: "11.5px",
    fontWeight: 800,
    backgroundColor: "#dff25e",
    color: "#17251f",
    padding: "4px 10px",
    borderRadius: "999px",
    flexShrink: 0,
  },
  channelBodyStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  copyFieldRow: {
    width: "100%",
    display: "flex",
    gap: "8px",
  },
  readonlyCodeInput: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    fontSize: "13.5px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 700,
    backgroundColor: "#fffdf8",
    border: "1px solid #c4bdad",
    borderRadius: "10px",
    color: "#17251f",
  },
  copyActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 14px",
    fontSize: "12.5px",
    fontWeight: 700,
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  cashInstructionCard: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    backgroundColor: "#fffdf8",
    border: "1px solid #ded8ce",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#37423c",
  },
  qrCardFrame: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#fffdf8",
    padding: "14px",
    borderRadius: "16px",
    border: "2px solid #184f3a",
    cursor: "pointer",
  },
  qrBadgeCaption: {
    marginTop: "8px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#59675f",
  },
  casualHelperCopy: {
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#37423c",
    margin: 0,
    textAlign: "center",
  },
  uriPillBox: {
    width: "100%",
    backgroundColor: "#ece5da",
    border: "1px dashed #c4bdad",
    borderRadius: "10px",
    padding: "8px 10px",
    textAlign: "left",
  },
  uriPillTitle: {
    display: "block",
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#59675f",
    marginBottom: "2px",
  },
  uriCodeString: {
    display: "block",
    fontSize: "11px",
    color: "#17251f",
    wordBreak: "break-all",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  primaryForestButton: {
    width: "100%",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "13px 18px",
    fontSize: "14.5px",
    fontWeight: 800,
    color: "#ffffff",
    backgroundColor: "#184f3a",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
  },
  secondaryCreamButton: {
    width: "100%",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px 18px",
    fontSize: "13.5px",
    fontWeight: 700,
    color: "#37423c",
    backgroundColor: "#ece5da",
    border: "1px solid #c4bdad",
    borderRadius: "14px",
    cursor: "pointer",
  },
  ghostCancelButton: {
    width: "100%",
    padding: "10px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#59675f",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
  },
  outboundPromptStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
  },
  avatarCircle: {
    width: "52px",
    height: "52px",
    borderRadius: "999px",
    backgroundColor: "#dff25e",
    color: "#184f3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 800,
  },
  promptTitle: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#17251f",
    margin: 0,
  },
  promptCasualCopy: {
    fontSize: "13.5px",
    lineHeight: 1.55,
    color: "#37423c",
    margin: 0,
  },
  miniSummaryBox: {
    width: "100%",
    backgroundColor: "#f5f0e8",
    border: "1px solid #ded8ce",
    borderRadius: "14px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    fontSize: "13px",
  },
  miniSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  buttonStack: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  processingStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "18px 6px",
    gap: "12px",
  },
  spinnerContainer: {
    width: "54px",
    height: "54px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    width: "46px",
    height: "46px",
    borderRadius: "999px",
    border: "4px solid #ece5da",
    borderTopColor: "#184f3a",
    animation: "kouchdRouterSpin 0.85s linear infinite",
  },
  cyclingCasualTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#17251f",
    margin: 0,
    minHeight: "24px",
  },
  processingSubcopy: {
    fontSize: "13px",
    color: "#59675f",
    lineHeight: 1.5,
    margin: 0,
  },
  progressTrack: {
    width: "100%",
    height: "8px",
    backgroundColor: "#ece5da",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "4px",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#184f3a",
    borderRadius: "999px",
    transition: "width 0.1s linear",
  },
  dotsRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  stepDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
  },
  successStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
  },
  successBadgeCircle: {
    width: "60px",
    height: "60px",
    borderRadius: "999px",
    backgroundColor: "#dff25e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px -6px rgba(24, 79, 58, 0.28)",
  },
  successHeading: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#17251f",
    margin: 0,
  },
  successCasualCopy: {
    fontSize: "13.5px",
    lineHeight: 1.55,
    color: "#37423c",
    margin: 0,
  },
  immutableCard: {
    width: "100%",
    backgroundColor: "#f5f0e8",
    border: "1px solid #ded8ce",
    borderRadius: "14px",
    overflow: "hidden",
    textAlign: "left",
  },
  immutableCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 14px",
    backgroundColor: "#ece5da",
    borderBottom: "1px solid #ded8ce",
    gap: "8px",
  },
  immutableHeaderLabel: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "#59675f",
  },
  loggedStatusPill: {
    fontSize: "10px",
    fontWeight: 800,
    backgroundColor: "#dff25e",
    color: "#184f3a",
    padding: "2px 8px",
    borderRadius: "999px",
  },
  immutableCardBody: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  receiptRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "10px",
    fontSize: "12.5px",
  },
  receiptKey: {
    color: "#59675f",
    fontWeight: 600,
    flexShrink: 0,
  },
  receiptMonoVal: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "12px",
    fontWeight: 700,
    color: "#17251f",
    textAlign: "right",
    wordBreak: "break-all",
  },
  receiptStrongVal: {
    fontSize: "12.5px",
    fontWeight: 800,
    color: "#17251f",
    textAlign: "right",
  },
  complianceDisclaimer: {
    fontSize: "11.5px",
    color: "#59675f",
    margin: 0,
  },
};

export default P2PPaymentRouter;
