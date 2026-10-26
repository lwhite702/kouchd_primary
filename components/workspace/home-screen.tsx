"use client";

import { ArrowRight, Check, Home, Megaphone, Plus, Users } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { HouseholdLogisticsCard } from "@/components/household/household-logistics";

import { DashboardNotificationFeed } from "@/components/notifications/dashboard-notifications";

import { Tooltip } from "@/components/ui/tooltip";

import { FeatureGate } from "@/components/flags/feature-gate";
import { FEATURE_FLAGS } from "@/lib/flags/config";
import {
  activityScreen,
  formatMoney,
  formatDate,
} from "@/components/workspace/types";

import type { WorkspaceState } from "./use-live-stay";
import { GuestTabs } from "./view-helpers";
export function HomeScreen({
  state,
  onBackToHub,
}: {
  state: WorkspaceState;
  onBackToHub: () => void;
}) {
  const [greeting, setGreeting] = useState("Welcome back,");
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const hour = new Date().getHours();
      setGreeting(
        hour < 12
          ? "Good morning,"
          : hour < 18
            ? "Good afternoon,"
            : "Good evening,",
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const {
    pendingContributionCount,
    dueCount,
    stayTitle,
    stayDatesSummary,
    setScreen,
    setPanel,
    viewer,
    isHost,
    notifications,
    isEnded,
    setInviteUrl,
    setInviteMode,
    setInviteError,
    members,
    guestMembers,
    openChores,
    todayChores,
    credits,
    activeContributions,
    toggleChore,
    asOfDate,
    recent,
    bundle,
    obligations,
    pendingAgreementGuests,
    financialGuestId,
    setSelectedGuestId,
    notify,
    announcements,
  } = state;
  return (
    <div key="home" className="screen-transition">
      <DashboardNotificationFeed
        notifications={notifications}
        onOpenSettings={() => setPanel("settings")}
      />

      {isHost ? (
        <div className="host-workspace-overview">
          <Image
            className="host-workspace-glow host-workspace-glow-sage"
            src="/host-workspace/ambient-glass-sage-desktop.svg"
            width={590}
            height={510}
            alt=""
            aria-hidden="true"
          />
          <Image
            className="host-workspace-glow host-workspace-glow-lime"
            src="/host-workspace/ambient-glass-lime-desktop.svg"
            width={530}
            height={490}
            alt=""
            aria-hidden="true"
          />
          <Image
            className="host-workspace-glow host-workspace-glow-sage-mobile"
            src="/host-workspace/ambient-glass-sage-mobile.svg"
            width={480}
            height={430}
            alt=""
            aria-hidden="true"
          />
          <Image
            className="host-workspace-glow host-workspace-glow-lime-mobile"
            src="/host-workspace/ambient-glass-lime-mobile.svg"
            width={440}
            height={410}
            alt=""
            aria-hidden="true"
          />

          <section className="host-workspace-heading">
            <div className="host-workspace-heading-copy">
              <span className="host-workspace-eyebrow">Host workspace</span>
              <h1>
                {isEnded ? "Stay history for" : greeting}{" "}
                {
                  (viewer?.name && viewer.name !== "Kouchd member"
                    ? viewer.name
                    : "Host"
                  ).split(" ")[0]
                }
              </h1>
              <p>
                {isEnded
                  ? `Agreements and activity from ${stayTitle}, kept for your reference.`
                  : `Here’s what needs attention at ${stayTitle} today.`}
              </p>
            </div>
            {!isEnded && (
              <button
                type="button"
                className="v21-invite-pill-btn host-workspace-invite"
                onClick={() => {
                  setInviteUrl("");
                  setInviteMode(null);
                  setInviteError("");
                  setPanel("invite");
                }}
              >
                <Plus size={16} />
                <span>Invite people</span>
              </button>
            )}
          </section>

          <button
            className="host-workspace-stay-switcher"
            type="button"
            onClick={onBackToHub}
            title="Switch household or view all stays"
          >
            <span className="host-workspace-stay-mark" aria-hidden="true">
              <Home size={19} />
            </span>
            <span className="host-workspace-stay-copy">
              <strong>{stayTitle}</strong>
              <span>
                {isEnded ? "Past stay" : "Host stay"} · {members.length}{" "}
                {members.length === 1 ? "person" : "people"} ·{" "}
                {stayDatesSummary}
              </span>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <section
            className="host-workspace-members"
            aria-label="Household members"
          >
            <div className="host-workspace-section-kicker">
              Household · {members.length}{" "}
              {members.length === 1 ? "person" : "people"}
            </div>
            <div className="host-workspace-member-strip">
              <div className="host-workspace-avatar-list">
                {members.slice(0, 5).map((member, index) => {
                  const name =
                    member.person.name && member.person.name !== "Kouchd member"
                      ? member.person.name
                      : member.membership.role === "host"
                        ? "Host"
                        : "Guest";
                  const initials = name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const color =
                    member.membership.role === "host"
                      ? "host"
                      : index === 4
                        ? "other"
                        : "guest";
                  return (
                    <span
                      className={`host-workspace-avatar ${color}`}
                      key={member.person.id}
                      title={`${name} · ${member.membership.role}`}
                      aria-label={`${name}, ${member.membership.role}`}
                    >
                      {initials}
                    </span>
                  );
                })}
                {members.length > 5 && (
                  <span
                    className="host-workspace-avatar other"
                    aria-label={`${members.length - 5} more members`}
                  >
                    +{members.length - 5}
                  </span>
                )}
              </div>
              <p>
                {guestMembers.length === 0
                  ? "Your shared household, in one place."
                  : `${guestMembers.length} ${guestMembers.length === 1 ? "guest is" : "guests are"} part of this stay.`}
              </p>
            </div>
          </section>

          <section
            className="host-workspace-summary-grid"
            aria-label="Household summary"
          >
            <button
              className="host-workspace-summary-card"
              type="button"
              onClick={() => setScreen("chores")}
            >
              <span>Chores</span>
              <strong>{openChores.length}</strong>
              <small>{todayChores.length} due or overdue</small>
            </button>
            <button
              className="host-workspace-summary-card"
              type="button"
              onClick={() => setScreen("contributions")}
            >
              <span>Contributions</span>
              <strong>{formatMoney(credits)}</strong>
              <small>Confirmed records for selected guest</small>
            </button>
            <button
              className="host-workspace-summary-card"
              type="button"
              onClick={() => setScreen("stay")}
            >
              <span>Household</span>
              <strong>{members.length}</strong>
              <small>
                {members.length === 1
                  ? "person in the stay"
                  : "people in the stay"}
              </small>
            </button>
            <button
              className="host-workspace-summary-card host-workspace-summary-guide"
              type="button"
              onClick={() =>
                isEnded ? setScreen("stay") : setPanel("houseInfo")
              }
            >
              <span>House guide</span>
              <strong>Open</strong>
              <small>Household essentials</small>
            </button>
          </section>

          <section
            className="host-workspace-mobile-summary"
            aria-label="Today’s shared plan"
          >
            <span>Today’s shared plan</span>
            <strong>
              {todayChores.length + pendingContributionCount}{" "}
              {todayChores.length + pendingContributionCount === 1
                ? "item"
                : "items"}
            </strong>
            <small>
              {todayChores.length}{" "}
              {todayChores.length === 1 ? "chore" : "chores"} due or overdue ·{" "}
              {pendingContributionCount} contribution{" "}
              {pendingContributionCount === 1 ? "record" : "records"} to review
            </small>
          </section>

          <div className="host-workspace-columns">
            <div className="host-workspace-primary-column">
              <section className="host-workspace-card host-workspace-chores">
                <div className="host-workspace-card-heading">
                  <div>
                    <span className="host-workspace-eyebrow">Shared plan</span>
                    <h2>A few things for today</h2>
                  </div>
                  <button
                    className="host-workspace-text-action"
                    type="button"
                    onClick={() => setScreen("chores")}
                  >
                    All chores <ArrowRight size={15} />
                  </button>
                </div>
                {todayChores.length ? (
                  <div className="host-workspace-chore-list">
                    {todayChores.slice(0, 3).map((item) => {
                      const assigned = item.assigneeUserId
                        ? members.find(
                            (member) =>
                              member.person.id === item.assigneeUserId,
                          )?.person.name
                        : undefined;
                      const assignee =
                        assigned && assigned !== "Kouchd member"
                          ? assigned
                          : item.assigneeUserId
                            ? "Guest"
                            : item.assignee;
                      return (
                        <article
                          className="host-workspace-chore-row"
                          key={item._id}
                        >
                          <Tooltip
                            content={
                              isEnded
                                ? "This stay is read-only"
                                : "Mark chore as completed"
                            }
                          >
                            <button
                              className="host-workspace-chore-check"
                              type="button"
                              disabled={isEnded}
                              onClick={() =>
                                void toggleChore({ choreId: item._id })
                              }
                              aria-label={`Complete ${item.title}`}
                            >
                              <Check size={17} />
                            </button>
                          </Tooltip>
                          <span className="host-workspace-row-copy">
                            <strong>{item.title}</strong>
                            <small>
                              {assignee} ·{" "}
                              {asOfDate && item.dueDate < asOfDate
                                ? "Overdue since"
                                : "Due"}{" "}
                              {formatDate(item.dueDate)}
                            </small>
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="host-workspace-empty">
                    No chores are due today. You can see every open task on the
                    chore board.
                  </p>
                )}
              </section>

              <section className="host-workspace-card host-workspace-contributions">
                <div className="host-workspace-card-heading">
                  <div>
                    <span className="host-workspace-eyebrow">
                      Shared record
                    </span>
                    <h2>Contribution records</h2>
                  </div>
                  <button
                    className="host-workspace-text-action"
                    type="button"
                    onClick={() => setScreen("contributions")}
                  >
                    View records <ArrowRight size={15} />
                  </button>
                </div>
                {activeContributions.length ? (
                  <div className="host-workspace-contribution-list">
                    {activeContributions.slice(0, 2).map((entry) => {
                      const contributor = members.find(
                        (member) => member.person.id === entry.createdBy,
                      )?.person.name;
                      const contributorName =
                        contributor && contributor !== "Kouchd member"
                          ? contributor
                          : "Household member";
                      const contributionType =
                        entry.type === "payment"
                          ? "Contribution"
                          : entry.type
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (letter) =>
                                letter.toUpperCase(),
                              );
                      const recordStatus =
                        entry.status === "confirmed"
                          ? "Confirmed"
                          : entry.status === "disputed"
                            ? "Disputed"
                            : "Needs confirmation";
                      return (
                        <article
                          className="host-workspace-contribution-row"
                          key={entry._id}
                        >
                          <div className="host-workspace-row-copy">
                            <strong>{contributionType}</strong>
                            <small>
                              {contributorName} · {recordStatus} ·{" "}
                              {formatDate(entry.date)}
                            </small>
                          </div>
                          <span className="host-workspace-contribution-amount">
                            {formatMoney(entry.amountCents)}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="host-workspace-empty">
                    Contribution records will show here when someone adds one.
                  </p>
                )}
                <p className="host-workspace-record-note">
                  These are shared records; payments happen outside Kouchd.
                </p>
              </section>

              <section className="host-workspace-card host-workspace-activity">
                <div className="host-workspace-card-heading">
                  <div>
                    <span className="host-workspace-eyebrow">
                      Household updates
                    </span>
                    <h2>Recent activity</h2>
                  </div>
                  <button
                    className="host-workspace-text-action"
                    type="button"
                    onClick={() => setScreen("contributions")}
                  >
                    Full record <ArrowRight size={15} />
                  </button>
                </div>
                {recent.length ? (
                  <div className="host-workspace-activity-list">
                    {recent.slice(0, 3).map((item) => {
                      const actor = members.find(
                        (member) => member.person.id === item.actorUserId,
                      );
                      const actorName =
                        item.actorType === "system"
                          ? "System"
                          : actor?.person.name &&
                              actor.person.name !== "Kouchd member"
                            ? actor.person.name
                            : item.actorUserId === bundle.membership.userId
                              ? "You"
                              : "A household member";
                      const initials = actorName
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      const isContributionActivity =
                        item.kind === "contribution" ||
                        item.action.includes("contribution") ||
                        item.action.includes("payment");
                      const isChoreActivity =
                        item.kind === "chore" || item.action.includes("chore");
                      const isConfirmedActivity =
                        item.action.includes("confirm");
                      const activityLabel = isContributionActivity
                        ? isConfirmedActivity
                          ? "confirmed a contribution record"
                          : "recorded a contribution"
                        : isChoreActivity
                          ? "updated a shared chore"
                          : item.action.replaceAll("_", " ");
                      const activityStatus = isContributionActivity
                        ? isConfirmedActivity
                          ? "Confirmed"
                          : "Recorded"
                        : "Logged";
                      return (
                        <button
                          className="host-workspace-activity-row"
                          key={item._id}
                          type="button"
                          onClick={() => setScreen(activityScreen(item.kind))}
                          aria-label={`Open ${item.kind.replaceAll("_", " ")} details: ${item.detail}`}
                        >
                          <span
                            className={`host-workspace-avatar host-workspace-activity-avatar ${actor?.membership.role === "host" ? "host" : "guest"}`}
                            aria-hidden="true"
                          >
                            {initials}
                          </span>
                          <span className="host-workspace-row-copy">
                            <strong>
                              {actorName} {activityLabel}
                            </strong>
                            <small>
                              {item.detail} ·{" "}
                              {new Date(item.createdAt).toLocaleDateString()}
                            </small>
                          </span>
                          <span
                            className={`host-workspace-status ${isConfirmedActivity ? "confirmed" : isContributionActivity ? "recorded" : "logged"}`}
                          >
                            {activityStatus}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="host-workspace-empty">
                    New household activity will appear here.
                  </p>
                )}
              </section>
            </div>

            <aside className="host-workspace-secondary-column">
              <section className="host-workspace-card host-workspace-household-card">
                <div className="host-workspace-card-heading">
                  <div>
                    <span className="host-workspace-eyebrow">Your people</span>
                    <h2>At {stayTitle}</h2>
                  </div>
                  <button
                    className="host-workspace-icon-action"
                    type="button"
                    onClick={() => setScreen("stay")}
                    aria-label="View household members"
                  >
                    <Users size={17} />
                  </button>
                </div>
                <div className="host-workspace-household-avatars">
                  {members.map((member) => {
                    const personName =
                      member.person.name &&
                      member.person.name !== "Kouchd member"
                        ? member.person.name
                        : member.membership.role === "host"
                          ? "Host"
                          : "Guest";
                    const initials = personName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <span
                        className={`host-workspace-avatar ${member.membership.role === "host" ? "host" : "guest"}`}
                        key={member.person.id}
                        title={`${personName} · ${member.membership.role}`}
                        aria-label={`${personName}, ${member.membership.role}`}
                      >
                        {initials}
                      </span>
                    );
                  })}
                  {!members.length && (
                    <p className="host-workspace-empty">
                      Household members will appear here.
                    </p>
                  )}
                </div>
                <p className="host-workspace-household-copy">
                  {guestMembers.length}{" "}
                  {guestMembers.length === 1 ? "guest is" : "guests are"}{" "}
                  included in this stay.
                </p>
                {!isEnded && (
                  <button
                    className="host-workspace-secondary-action"
                    type="button"
                    onClick={() => {
                      setInviteUrl("");
                      setInviteMode(null);
                      setInviteError("");
                      setPanel("invite");
                    }}
                  >
                    <Plus size={15} /> Invite someone
                  </button>
                )}
              </section>

              <section className="host-workspace-card host-workspace-upcoming-card">
                <span className="host-workspace-eyebrow">
                  {isEnded ? "Saved for reference" : "Coming up"}
                </span>
                <h2>Stay dates</h2>
                <p>
                  {isEnded
                    ? "This stay has ended. Its shared history is retained."
                    : bundle.stay.nextCheckInDate
                      ? `Next arrival · ${formatDate(bundle.stay.nextCheckInDate)}`
                      : "No upcoming arrival date has been added."}
                </p>
                <div className="host-workspace-upcoming-divider" />
                <p>{stayDatesSummary}</p>
              </section>

              <section className="host-workspace-checkin-card">
                <span className="host-workspace-eyebrow">House guide</span>
                <h2>Keep the details close.</h2>
                <p>
                  Review the household essentials and shared notes in one place.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    isEnded ? setScreen("stay") : setPanel("houseInfo")
                  }
                >
                  Open house guide <ArrowRight size={15} />
                </button>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Host Heading & Top Invite CTA */}
          <section className="v21-host-heading">
            <div className="v21-host-heading-copy">
              <span className="v21-role-pill">{isHost ? "Host" : "Guest"}</span>
              <h1 className="v21-stay-title">{stayTitle}</h1>
              <p className="v21-stay-subhead">
                {stayDatesSummary} · {guestMembers.length}{" "}
                {guestMembers.length === 1 ? "guest" : "guests"} ·{" "}
                {isHost ? "You manage this stay" : "You’re staying here"}
              </p>
            </div>
            {isHost && !isEnded && (
              <button
                type="button"
                className="v21-invite-pill-btn"
                onClick={() => {
                  setInviteUrl("");
                  setInviteMode(null);
                  setInviteError("");
                  setPanel("invite");
                }}
              >
                <Plus size={16} />
                <span>Invite people</span>
              </button>
            )}
          </section>

          {/* 2. Shared Home Panel with Organic Curves & Room Illustration */}
          <section className="v21-shared-home-panel">
            <div className="v21-panel-curves" aria-hidden="true">
              <img
                src="/dashboard-v21/curve-sky.svg"
                alt=""
                className="v21-panel-curve-sky"
              />
              <img
                src="/dashboard-v21/curve-lime.svg"
                alt=""
                className="v21-panel-curve-lime"
              />
            </div>
            <div className="v21-panel-copy">
              <span className="v21-panel-overline">Shared Home</span>
              <h2 className="v21-panel-headline">
                The practical things, held in one place.
              </h2>
              <p className="v21-panel-subcopy">
                Plans, responsibilities and contributions stay clear without
                making the house feel transactional.
              </p>
            </div>
            <div className="v21-panel-illustration" aria-hidden="true">
              <img
                src="/dashboard-v21/room-illustration-dashboard.svg"
                alt="Cozy room illustration"
              />
            </div>
          </section>

          {/* 3. Three Figma V2.1 Summary Tiles */}
          <section className="v21-summary-grid">
            {/* Tile 1: Guests */}
            <button
              type="button"
              className="v21-summary-tile tile-guests"
              onClick={() => setScreen("stay")}
              title="View household members and agreements"
            >
              <span className="v21-tile-label">Guests</span>
              <span className="v21-tile-metric">{guestMembers.length}</span>
              <span className="v21-tile-note">
                {
                  guestMembers.filter((m) => m.membership.acceptedTermsId)
                    .length
                }{" "}
                confirmed
              </span>
            </button>

            {/* Tile 2: Contributions */}
            <button
              type="button"
              className="v21-summary-tile tile-contributions"
              onClick={() => setScreen("contributions")}
              title="Open private ledger"
            >
              <span className="v21-tile-label">Contributions</span>
              <span className="v21-tile-metric">{formatMoney(credits)}</span>
              <span
                className={`v21-tile-note ${
                  dueCount > 0 ? "note-pending" : "note-clear"
                }`}
              >
                {dueCount} records due
              </span>
            </button>

            {/* Tile 3: Chores */}
            <button
              type="button"
              className="v21-summary-tile tile-chores"
              onClick={() => setScreen("chores")}
              title="View shared chores board"
            >
              <span className="v21-tile-label">Chores</span>
              <span className="v21-tile-metric">{openChores.length}</span>
              <span
                className={`v21-tile-note ${
                  openChores.filter((c) => !c.assigneeUserId).length > 0
                    ? "note-pending"
                    : "note-clear"
                }`}
              >
                {openChores.filter((c) => !c.assigneeUserId).length > 0
                  ? `${openChores.filter((c) => !c.assigneeUserId).length} need an owner`
                  : "All chores assigned"}
              </span>
            </button>
          </section>

          {/* 4. Needs Attention Cards */}
          <section className="v21-workspace-section">
            <div className="v21-section-heading">
              <h2>Needs attention</h2>
              <button
                type="button"
                className="v21-pill-action"
                onClick={() => setScreen("stay")}
              >
                See all
              </button>
            </div>
            <div className="v21-attention-grid">
              {pendingAgreementGuests.length > 0 && (
                <article className="v21-attention-card attention-needs-action">
                  <span className="v21-attention-kicker kicker-action">
                    Action needed
                  </span>
                  <h3 className="v21-attention-title">
                    Pending guest agreement
                  </h3>
                  <p className="v21-attention-desc">
                    {pendingAgreementGuests.length === 1
                      ? `${pendingAgreementGuests[0].person.name || "A guest"} has not reviewed the agreement.`
                      : `${pendingAgreementGuests.length} guests have not reviewed the agreement.`}
                  </p>
                  <button
                    type="button"
                    className="v21-attention-btn"
                    onClick={() => setScreen("stay")}
                  >
                    Review
                  </button>
                </article>
              )}

              <article
                className={`v21-attention-card ${
                  obligations &&
                  obligations.some(
                    (o) => o.status === "due" || o.status === "late",
                  )
                    ? "attention-needs-action"
                    : "attention-calm"
                }`}
              >
                <span className="v21-attention-kicker">
                  {obligations &&
                  obligations.some(
                    (o) => o.status === "due" || o.status === "late",
                  )
                    ? "Contribution due"
                    : "Clear"}
                </span>
                <h3 className="v21-attention-title">Upcoming contribution</h3>
                <p className="v21-attention-desc">
                  {obligations &&
                  obligations.some(
                    (o) => o.status === "due" || o.status === "late",
                  )
                    ? `${formatMoney(obligations.find((o) => o.status === "due" || o.status === "late")?.balanceCents ?? 0)} due for scheduled contribution.`
                    : "No overdue contributions right now."}
                </p>
                <button
                  type="button"
                  className="v21-attention-btn"
                  onClick={() =>
                    isHost
                      ? setPanel("contribution")
                      : setScreen("contributions")
                  }
                >
                  {isHost ? "Record entry" : "View ledger"}
                </button>
              </article>

              <FeatureGate flag={FEATURE_FLAGS.CHECK_IN_BOARD}>
                <article className="v21-attention-card attention-calm">
                  <span className="v21-attention-kicker">Arrivals</span>
                  <h3 className="v21-attention-title">House check-in</h3>
                  <p className="v21-attention-desc">
                    {bundle.stay.nextCheckInDate
                      ? `Next arrival scheduled for ${formatDate(bundle.stay.nextCheckInDate)}.`
                      : "WiFi and access guide are ready for guests."}
                  </p>
                  <button
                    type="button"
                    className="v21-attention-btn"
                    onClick={() => setScreen("checkins")}
                  >
                    Open check-ins
                  </button>
                </article>
              </FeatureGate>

              <FeatureGate flag={FEATURE_FLAGS.SHOPPING_LIST}>
                <article className="v21-attention-card attention-calm">
                  <span className="v21-attention-kicker">Shared list</span>
                  <h3 className="v21-attention-title">Shopping list</h3>
                  <p className="v21-attention-desc">
                    Keep shared household needs and personal errands together.
                  </p>
                  <button
                    type="button"
                    className="v21-attention-btn"
                    onClick={() => setScreen("shopping")}
                  >
                    Open list
                  </button>
                </article>
              </FeatureGate>
            </div>
          </section>

          {/* Guest selector for hosts with multiple guests */}
          {isHost && guestMembers.length > 0 && (
            <GuestTabs
              guests={guestMembers}
              selected={financialGuestId}
              onSelect={setSelectedGuestId}
            />
          )}

          {/* 5. Household Logistics & Access */}
          <HouseholdLogisticsCard
            houseInfo={bundle.stay.houseInfo}
            isHost={Boolean(isHost && !isEnded)}
            onEdit={() => setPanel("houseInfo")}
            onNotify={notify}
          />

          {/* 6. Announcements Section */}
          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">House notes</p>
                <h2>Announcements</h2>
              </div>
              {isHost && !isEnded && (
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => setPanel("announcement")}
                >
                  <Megaphone size={16} /> Add
                </button>
              )}
            </div>
            <div className="activity-list">
              {announcements.map((item) => (
                <article className="list-row" key={item._id}>
                  <span className="list-icon">
                    <Megaphone size={19} />
                  </span>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </article>
              ))}
              {announcements.length === 0 && (
                <p className="muted">No announcements yet.</p>
              )}
            </div>
          </section>

          {/* 7. Recent Activity (Figma V2.1 styling) */}
          <section className="v21-workspace-section">
            <div className="v21-section-heading">
              <h2>Recent activity</h2>
            </div>
            <div className="v21-activity-list">
              {recent.map((item) => {
                const actorMember = members.find(
                  (m) => m.person.id === item.actorUserId,
                );
                const actorName =
                  item.actorType === "system"
                    ? "System"
                    : actorMember?.person.name &&
                        actorMember.person.name !== "Kouchd member"
                      ? actorMember.person.name
                      : item.actorUserId === bundle.membership.userId
                        ? "You"
                        : "Member";
                const actorRole = actorMember?.membership.role;
                const initials =
                  actorName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "K";
                const isRecorded =
                  item.action.includes("contribution") ||
                  item.action.includes("payment");
                const isConfirmed =
                  item.action.includes("confirm") ||
                  item.action.includes("terms");
                return (
                  <button
                    className="v21-activity-row"
                    key={item._id}
                    type="button"
                    onClick={() => setScreen(activityScreen(item.kind))}
                    aria-label={`Open ${item.kind.replaceAll("_", " ")} details: ${item.detail}`}
                  >
                    <div className="v21-activity-avatar">
                      {actorMember?.person.imageUrl ? (
                        <img
                          src={actorMember.person.imageUrl}
                          alt={actorName}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="v21-activity-copy">
                      <p className="v21-activity-title">
                        {actorName}
                        {actorRole
                          ? ` · ${actorRole === "host" ? "Host" : "Guest"}`
                          : ""}{" "}
                        · {item.action.replaceAll("_", " ")}
                      </p>
                      <p className="v21-activity-meta">
                        {item.detail} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`v21-activity-status ${
                        isConfirmed
                          ? "status-confirmed"
                          : isRecorded
                            ? "status-recorded"
                            : "status-pending"
                      }`}
                    >
                      {isConfirmed
                        ? "Confirmed"
                        : isRecorded
                          ? "Recorded"
                          : "Logged"}
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                );
              })}
              {recent.length === 0 && (
                <p className="muted">No recent activity recorded yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
