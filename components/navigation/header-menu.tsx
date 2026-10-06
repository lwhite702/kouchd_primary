"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  KeyRound,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { HELP_LINKS } from "@/lib/help-links";

export interface MobileHeaderMenuProps {
  onTakeTour?: () => void;
  onStays?: () => void;
  onJoinCode?: () => void;
  onSettings?: () => void;
  docsHref?: string;
}

export function MobileHeaderMenu({
  onTakeTour,
  onStays,
  onJoinCode,
  onSettings,
  docsHref = HELP_LINKS.home,
}: MobileHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const hasAnyAction = Boolean(onTakeTour || onStays || onJoinCode || onSettings || docsHref);
  if (!hasAnyAction) return null;

  return (
    <div className="mobile-header-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="button soft compact mobile-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Household menu"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Household menu"
      >
        <Menu size={16} />
        <span>Menu</span>
      </button>

      {isOpen && (
        <>
          <div
            className="mobile-menu-scrim"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="mobile-menu-card"
            role="dialog"
            aria-label="Household quick menu"
          >
            <div className="mobile-menu-header">
              <strong>Household Menu</strong>
              <button
                type="button"
                className="icon-button compact"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                style={{ width: 32, height: 32 }}
              >
                <X size={17} />
              </button>
            </div>

            <nav className="mobile-menu-list" aria-label="Household menu options">
              {onTakeTour && (
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsOpen(false);
                    onTakeTour();
                  }}
                >
                  <span className="mobile-menu-icon">
                    <Sparkles size={18} />
                  </span>
                  <div className="mobile-menu-text">
                    <strong>Guided Tour</strong>
                    <span>Interactive walkthrough of features</span>
                  </div>
                  <ChevronRight size={16} className="mobile-menu-chevron" />
                </button>
              )}

              {onStays && (
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsOpen(false);
                    onStays();
                  }}
                >
                  <span className="mobile-menu-icon">
                    <Users size={18} />
                  </span>
                  <div className="mobile-menu-text">
                    <strong>All Stays</strong>
                    <span>Switch or view other household stays</span>
                  </div>
                  <ChevronRight size={16} className="mobile-menu-chevron" />
                </button>
              )}

              {onJoinCode && (
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsOpen(false);
                    onJoinCode();
                  }}
                >
                  <span className="mobile-menu-icon">
                    <KeyRound size={18} />
                  </span>
                  <div className="mobile-menu-text">
                    <strong>Join with Code</strong>
                    <span>Enter referral code to join a stay</span>
                  </div>
                  <ChevronRight size={16} className="mobile-menu-chevron" />
                </button>
              )}

              {onSettings && (
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsOpen(false);
                    onSettings();
                  }}
                >
                  <span className="mobile-menu-icon">
                    <Settings size={18} />
                  </span>
                  <div className="mobile-menu-text">
                    <strong>Reminder Settings</strong>
                    <span>Configure SMS and email notifications</span>
                  </div>
                  <ChevronRight size={16} className="mobile-menu-chevron" />
                </button>
              )}

              {docsHref && (
                <a
                  className="mobile-menu-item"
                  href={docsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="mobile-menu-icon">
                    <BookOpen size={18} />
                  </span>
                  <div className="mobile-menu-text">
                    <strong>Help Center &amp; Docs</strong>
                    <span>Guides, stay rules, and FAQs</span>
                  </div>
                  <ArrowUpRight size={16} className="mobile-menu-chevron" />
                </a>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
