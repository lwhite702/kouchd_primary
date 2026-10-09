"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { HELP_LINKS } from "@/lib/help-links";

export type WorkspaceScreen = "home" | "contributions" | "chores" | "stay";
export type GuideRole = "host" | "guest";
export type GuideStep = { screen: WorkspaceScreen; title: string; body: string; helpHref: string };

const hostGuide = HELP_LINKS.hostsGettingStarted;
const guestGuide = HELP_LINKS.joiningAStay;

export const guideSteps: Record<GuideRole, GuideStep[]> = {
  host: [
    { screen: "home", title: "Your household at a glance", body: "Home brings together the current stay, upcoming check-in, household notes, and recent activity. If you have guests, you can switch whose private ledger you are viewing.", helpHref: hostGuide },
    { screen: "contributions", title: "Keep each ledger clear", body: "Choose a guest to review their private balance, scheduled charges, and logged contributions. Confirm a contribution after you have checked it. Kouchd does not process payments.", helpHref: HELP_LINKS.ledgerManagement },
    { screen: "chores", title: "Share the household work", body: "Add chores, choose who is responsible, and mark them complete as the household goes. Everyone in the stay can see the shared chore board.", helpHref: HELP_LINKS.houseRulesAndChores },
    { screen: "stay", title: "Manage the stay and invite guests", body: "Review the agreement, house rules, and access details here. Share the referral code or create a private invite when you are ready to add someone.", helpHref: hostGuide },
  ],
  guest: [
    { screen: "home", title: "Your household at a glance", body: "Home shows stay updates, important household details, announcements, and recent activity shared with your household.", helpHref: guestGuide },
    { screen: "contributions", title: "Your private ledger", body: "Only you and your host can see your money details. Log a payment or shared expense here, then confirm entries together so the record stays clear.", helpHref: HELP_LINKS.loggingContributions },
    { screen: "chores", title: "See what needs doing", body: "The chore board shows shared household tasks, who they are assigned to, and what is complete. Mark your task complete when it is done.", helpHref: HELP_LINKS.houseRulesAndChores },
    { screen: "stay", title: "Keep household details close", body: "Find your accepted agreement, house rules, stay dates, and household access information here. Ask your host if anything needs to change.", helpHref: HELP_LINKS.stayAgreements },
  ],
};

type GuidedTourProps = {
  role: GuideRole;
  step: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
};

export function GuidedTour({ role, step, onBack, onNext, onSkip, onClose }: GuidedTourProps) {
  const cardRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [isMinimized, setIsMinimized] = useState(false);
  const steps = guideSteps[role];
  const current = steps[step] ?? steps[0];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!isMinimized) {
      cardRef.current?.querySelector<HTMLElement>("#guided-tour-title")?.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab" || !cardRef.current) return;
      const controls = Array.from(cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const activeIndex = controls.indexOf(document.activeElement as HTMLElement);
      if (activeIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isMinimized]);

  if (isMinimized) {
    return (
      <div className="guided-tour-backdrop">
        <aside
          aria-label="Guided tour assistant"
          className="guided-tour-card is-minimized"
          ref={cardRef}
        >
          <div className="guided-tour-minimized-content">
            <Sparkles size={16} color="var(--green, #184f3a)" />
            <span>{role === "host" ? "Host Tour" : "Guest Tour"} · Step {step + 1} of {steps.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              aria-label="Expand tour"
              className="button soft compact"
              onClick={() => setIsMinimized(false)}
              type="button"
              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
            >
              <ChevronUp size={14} /> Expand
            </button>
            <button
              aria-label="Next step"
              className="button primary compact"
              onClick={onNext}
              type="button"
              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
            >
              {step === steps.length - 1 ? <Check size={14} /> : <ArrowRight size={14} />}
            </button>
            <button
              aria-label="Pause tour"
              className="guided-tour-close"
              onClick={onClose}
              type="button"
              style={{ width: 28, height: 28 }}
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="guided-tour-backdrop">
      <section aria-labelledby="guided-tour-title" className="guided-tour-card" ref={cardRef} role="region">
        <div className="guided-tour-topline">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color="var(--green, #184f3a)" />
            {role === "host" ? "Host tour" : "Guest tour"}
          </span>
          <div className="guided-tour-topline-actions">
            <button
              aria-label="Minimize tour card"
              className="guided-tour-minimize"
              onClick={() => setIsMinimized(true)}
              title="Minimize tour"
              type="button"
            >
              <ChevronDown size={18} />
            </button>
            <button
              aria-label="Pause tour"
              className="guided-tour-close"
              onClick={onClose}
              title="Close tour"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div aria-label={`Step ${step + 1} of ${steps.length}`} className="guided-tour-progress">
          {steps.map((item, index) => <span aria-hidden="true" className={index <= step ? "active" : ""} key={item.title} />)}
        </div>
        <p className="eyebrow">Step {step + 1} of {steps.length}</p>
        <h2 id="guided-tour-title" tabIndex={-1}>{current.title}</h2>
        <p className="guided-tour-copy">{current.body}</p>
        <Link className="guided-tour-help" href={current.helpHref} target="_blank" rel="noopener noreferrer">Read the related help article <ArrowRight size={15} /></Link>
        <div className="guided-tour-actions">
          <button className="button ghost" onClick={onSkip} type="button">Skip tour</button>
          <div>
            {step > 0 && <button aria-label="Previous step" className="button soft" onClick={onBack} type="button"><ArrowLeft size={17} /> Back</button>}
            <button className="button primary" onClick={onNext} type="button">
              {step === steps.length - 1 ? "Done" : "Next"} {step === steps.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
