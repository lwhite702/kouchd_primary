"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calendarDateInTimezone } from "@/lib/domain/dates";
import { createInviteToken, hashInviteToken } from "@/lib/invite";

import { GuestTerms } from "@/components/household/guest-agreement-form";

import { guideSteps } from "@/components/onboarding/guided-tour";
import type { GuideRole } from "@/components/onboarding/guided-tour";

import type { NotificationItem } from "@/components/notifications/dashboard-notifications";

import {
  StayBundle,
  Screen,
  Panel,
  DestructiveAction,
  GuideProgressState,
  Viewer,
  formatMoney,
  formatDate,
  value,
} from "@/components/workspace/types";

export function useLiveStay(stayId: Id<"stays">, onBackToHub: () => void) {
  const { user: clerkUser } = useUser();
  const bundle = useQuery(api.stays.getBundle, { stayId }) as StayBundle;
  const viewer = useQuery(api.users.viewer, {}) as Viewer;
  const chores = useQuery(api.chores.list, { stayId }) as Doc<"chores">[];
  const activities = useQuery(api.activity.list, {
    stayId,
  }) as Doc<"activity">[];
  const announcements = useQuery(api.announcements.list, {
    stayId,
  }) as Doc<"announcements">[];
  const [screen, setScreen] = useState<Screen>("home");
  const [panel, updatePanel] = useState<Panel>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<
    Id<"users"> | undefined
  >();
  const [editingGuestId, setEditingGuestId] = useState<
    Id<"users"> | undefined
  >();
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteMode, setInviteMode] = useState<"text" | "email" | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const submitting = useRef(false);
  function beginSubmit() {
    if (submitting.current) return false;
    submitting.current = true;
    setIsSubmittingModal(true);
    setActionError("");
    return true;
  }
  function finishSubmit() {
    submitting.current = false;
    setIsSubmittingModal(false);
  }
  const setPanel = useCallback((next: Panel) => {
    setActionError("");
    updatePanel(next);
  }, []);
  const [guestOnboardingOpen, setGuestOnboardingOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourSuppressedForRole, setTourSuppressedForRole] =
    useState<GuideRole | null>(null);
  const [destructiveAction, setDestructiveAction] =
    useState<DestructiveAction | null>(null);

  useEffect(() => {
    const handleLocationHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#/, "");
      if (
        hash === "contributions" ||
        hash === "chores" ||
        hash === "shopping" ||
        hash === "checkins" ||
        hash === "stay" ||
        hash === "home"
      ) {
        setScreen(hash);
      } else if (hash === "rewards") {
        setScreen("contributions");
      } else if (
        hash === "invite" ||
        hash === "houseInfo" ||
        hash === "contribution"
      ) {
        setPanel(hash as Panel);
      } else if (hash === "house-info") {
        setPanel("houseInfo");
      }
    };
    handleLocationHash();
    window.addEventListener("hashchange", handleLocationHash);
    return () => window.removeEventListener("hashchange", handleLocationHash);
  }, [setPanel]);
  const members = bundle?.members ?? [];
  const guestMembers = members.filter(
    (item) =>
      item.membership.role === "guest" && item.membership.status === "active",
  );
  const pendingAgreementGuests = guestMembers.filter(
    (member) => !member.membership.acceptedTermsId,
  );
  const isHost = bundle?.membership.role === "host";
  const financialGuestId = isHost
    ? guestMembers.some((member) => member.person.id === selectedGuestId)
      ? selectedGuestId
      : guestMembers[0]?.person.id
    : bundle?.membership.userId;
  const asOfDate = bundle
    ? calendarDateInTimezone(new Date(), bundle.stay.timezone)
    : null;
  const financialSummary = useQuery(
    api.obligations.summary,
    asOfDate && financialGuestId
      ? { stayId, asOfDate, guestUserId: financialGuestId }
      : "skip",
  );
  const createContribution = useMutation(api.contributions.create);
  const confirmContribution = useMutation(api.contributions.confirm);
  const disputeContribution = useMutation(api.contributions.dispute);
  const voidContribution = useMutation(api.contributions.voidContribution);
  const endGuestAgreement = useMutation(api.stays.endGuestAgreement);
  const createChore = useMutation(api.chores.create);
  const toggleChore = useMutation(api.chores.toggle);
  const voidChore = useMutation(api.chores.voidChore);
  const voidClaim = useMutation(api.rewards.voidClaim);
  const updateStayName = useMutation(api.stays.updateName);
  const regenerateCode = useMutation(api.referral.regenerateCode);
  const updateHouseholdTerms = useMutation(api.terms.updateCurrent);
  const createAnnouncement = useMutation(api.announcements.create);
  const createAdhocCharge = useMutation(api.obligations.createAdhocCharge);
  const voidAdhocCharge = useMutation(api.obligations.voidAdhocCharge);
  const waiveLateFee = useMutation(api.obligations.waiveLateFee);
  const createInvite = useMutation(api.invites.create);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const syncCurrent = useMutation(api.users.syncCurrent);
  const updateGuideProgress = useMutation(api.users.updateGuideProgress);
  const updateHouseInfo = useMutation(api.stays.updateHouseInfo);
  const updatePaymentOptions = useMutation(api.stays.updatePaymentOptions);
  const updateGuestTerms = useMutation(api.terms.updateGuest);
  const updateGuestPreferredName = useMutation(
    api.stays.updateGuestPreferredName,
  );
  const updateAgreementAutoAccept = useMutation(
    api.stays.updateAgreementAutoAccept,
  );
  const endStay = useMutation(api.stays.end);

  const credits = financialSummary?.creditCents ?? 0;
  const charge = financialSummary?.chargesCents ?? 0;
  const balance = financialSummary?.balanceCents ?? 0;
  const pendingContributionCount = financialSummary?.pendingCount ?? 0;
  const dueCount = financialSummary?.dueCount ?? 0;
  const openChores = (chores ?? []).filter(
    (item) => !item.completedAt && !item.voidedAt,
  );
  const todayChores = asOfDate
    ? openChores.filter((item) => item.dueDate <= asOfDate)
    : openChores;
  const recent = useMemo(() => (activities ?? []).slice(0, 5), [activities]);
  const selectedGuestMember = guestMembers.find(
    (item) => item.person.id === financialGuestId,
  );
  const selectedGuest = selectedGuestMember?.person;
  const terms = bundle?.terms;
  const selectedGuestTerms = selectedGuestMember?.terms ?? terms;
  const hasAccepted = bundle?.membership.acceptedTermsId === terms?._id;
  const displayedAgreementTerms = isHost ? selectedGuestTerms : terms;
  const displayedAgreementAccepted =
    isHost && selectedGuestMember
      ? selectedGuestMember.membership.acceptedTermsId ===
        selectedGuestTerms?._id
      : hasAccepted;
  const guideRole = bundle?.membership.role;

  const storedGuideProgress = guideRole
    ? viewer?.guideProgress?.[guideRole]
    : undefined;
  const canShowTour = Boolean(
    viewer &&
    guideRole &&
    bundle?.stay.status !== "ended" &&
    (guideRole === "host" || hasAccepted),
  );
  const isTourVisible = Boolean(
    canShowTour &&
    guideRole &&
    (tourOpen ||
      (tourSuppressedForRole !== guideRole &&
        (!storedGuideProgress ||
          storedGuideProgress.status === "in_progress"))),
  );
  const visibleTourStep = tourOpen
    ? tourStep
    : storedGuideProgress?.status === "in_progress" && guideRole
      ? Math.min(storedGuideProgress.step, guideSteps[guideRole].length - 1)
      : 0;
  const visibleScreen =
    isTourVisible && guideRole
      ? guideSteps[guideRole][visibleTourStep].screen
      : screen;
  const financialArgs =
    asOfDate && financialGuestId
      ? { stayId, asOfDate, guestUserId: financialGuestId }
      : null;
  const ledgerDetails = useQuery(
    api.obligations.list,
    visibleScreen === "contributions" && financialArgs ? financialArgs : "skip",
  );
  const contributionDetails = useQuery(
    api.contributions.list,
    visibleScreen === "contributions" && financialGuestId
      ? { stayId, guestUserId: financialGuestId }
      : "skip",
  );
  const obligations = useMemo(
    () =>
      (visibleScreen === "contributions"
        ? ledgerDetails
        : financialSummary?.highlights) ?? [],
    [visibleScreen, ledgerDetails, financialSummary?.highlights],
  );
  const contributions = useMemo(
    () =>
      (visibleScreen === "contributions"
        ? contributionDetails
        : financialSummary?.recentContributions) ?? [],
    [visibleScreen, contributionDetails, financialSummary?.recentContributions],
  );
  const activeContributions = contributions.filter(
    (entry) => entry.status !== "voided",
  );

  useEffect(() => {
    if (
      !viewer ||
      !guideRole ||
      (guideRole === "guest" && !hasAccepted) ||
      storedGuideProgress
    )
      return;
    void updateGuideProgress({
      role: guideRole,
      step: 0,
      status: "in_progress",
    });
  }, [
    guideRole,
    hasAccepted,
    storedGuideProgress,
    updateGuideProgress,
    viewer,
  ]);

  const persistTourProgress = useCallback(
    (role: GuideRole, step: number, status: GuideProgressState["status"]) => {
      void updateGuideProgress({ role, step, status }).catch((reason) => {
        console.error("Could not save tour progress:", reason);
      });
    },
    [updateGuideProgress],
  );

  const openTour = useCallback(() => {
    if (!guideRole || !viewer) return;
    const progress = viewer.guideProgress?.[guideRole];
    const startAt =
      progress?.status === "in_progress"
        ? Math.min(progress.step, guideSteps[guideRole].length - 1)
        : 0;
    setTourSuppressedForRole(null);
    setTourStep(startAt);
    setScreen(guideSteps[guideRole][startAt].screen);
    setTourOpen(true);
    persistTourProgress(guideRole, startAt, "in_progress");
  }, [guideRole, persistTourProgress, viewer]);

  const pauseTour = useCallback(() => {
    if (guideRole)
      persistTourProgress(guideRole, visibleTourStep, "in_progress");
    setTourSuppressedForRole(guideRole ?? null);
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);

  const skipTour = useCallback(() => {
    if (guideRole) persistTourProgress(guideRole, visibleTourStep, "skipped");
    setTourSuppressedForRole(guideRole ?? null);
    setTourOpen(false);
  }, [guideRole, persistTourProgress, visibleTourStep]);

  const moveTour = useCallback(
    (direction: -1 | 1) => {
      if (!guideRole) return;
      const currentStep = visibleTourStep;
      const nextStep = currentStep + direction;
      if (nextStep < 0) return;
      if (nextStep >= guideSteps[guideRole].length) {
        persistTourProgress(guideRole, currentStep, "completed");
        setTourSuppressedForRole(guideRole);
        setTourOpen(false);
        return;
      }
      setTourOpen(true);
      setTourStep(nextStep);
      setScreen(guideSteps[guideRole][nextStep].screen);
      persistTourProgress(guideRole, nextStep, "in_progress");
    },
    [guideRole, persistTourProgress, visibleTourStep],
  );

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Pending contributions (Host confirms)
    if (isHost && contributions) {
      const pendingForHost = contributions.filter(
        (c) =>
          c.status === "pending" && c.createdBy !== bundle?.membership.userId,
      );
      for (const item of pendingForHost) {
        const guestMember = guestMembers.find(
          (g) => g.person.id === item.guestUserId,
        );
        const guestName =
          guestMember?.person.name &&
          guestMember.person.name !== "Kouchd member"
            ? guestMember.person.name
            : "A guest";
        list.push({
          id: `pending_contrib_${item._id}`,
          type: "payment",
          urgency: "notice",
          title: "Contribution needs confirmation",
          description: `${guestName} recorded a ${formatMoney(item.amountCents)} ${item.type.replaceAll("_", " ")} contribution (${item.note || "No note"}).`,
          confirmLabel: "Confirm",
          confirmAction: () => {
            void confirmContribution({ contributionId: item._id }).then(() =>
              notify("Contribution confirmed."),
            );
          },
          actionLabel: "View Ledger",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 2. Pending contributions recorded by guest (Guest view)
    if (!isHost && contributions) {
      const myPending = contributions.filter(
        (c) =>
          c.status === "pending" && c.createdBy === bundle?.membership.userId,
      );
      for (const item of myPending) {
        list.push({
          id: `guest_pending_${item._id}`,
          type: "payment",
          urgency: "info",
          title: "Contribution awaiting confirmation",
          description: `Your ${formatMoney(item.amountCents)} ${item.type.replaceAll("_", " ")} entry is logged and awaiting host review.`,
          actionLabel: "View Ledger",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 3. Agreement needing review (Guest view)
    if (!isHost && !hasAccepted) {
      list.push({
        id: `agreement_pending_${terms?._id ?? "terms"}`,
        type: "agreement",
        urgency: "urgent",
        title: "Household agreement requires review",
        description:
          "The host has set household rules and stay guidelines. Review and accept the agreement.",
        actionLabel: "Review Agreement",
        onAction: () => setGuestOnboardingOpen(true),
      });
    }

    // 4. Overdue or due today obligations
    if (obligations) {
      const overdueOrDue = obligations.filter(
        (o) =>
          (o.status === "late" || o.status === "due") && o.balanceCents > 0,
      );
      for (const item of overdueOrDue) {
        list.push({
          id: `obligation_${item._id}`,
          type: "payment",
          urgency: item.status === "late" ? "urgent" : "notice",
          title:
            item.status === "late"
              ? `Overdue payment (${formatMoney(item.balanceCents)})`
              : `Payment due today (${formatMoney(item.balanceCents)})`,
          description: `${item.title ?? "Scheduled contribution"} due ${formatDate(item.dueDate)}. ${item.lateFeeCents > 0 && !item.lateFeeWaived ? `Late fee applied.` : ""}`,
          actionLabel: "View Breakdown",
          onAction: () => setScreen("contributions"),
        });
      }
    }

    // 5. Chores due today or overdue
    if (chores && asOfDate) {
      const urgentChores = chores.filter(
        (c) => !c.completedAt && !c.voidedAt && c.dueDate <= asOfDate,
      );
      if (urgentChores.length > 0) {
        list.push({
          id: `chores_due_${asOfDate}`,
          type: "chore",
          urgency: "notice",
          title: `${urgentChores.length} chore${urgentChores.length === 1 ? "" : "s"} due today`,
          description:
            urgentChores
              .map((c) => c.title)
              .slice(0, 2)
              .join(", ") +
            (urgentChores.length > 2
              ? ` and ${urgentChores.length - 2} more.`
              : "."),
          actionLabel: "Open Chore Board",
          onAction: () => setScreen("chores"),
        });
      }
    }

    // 6. Recent announcements
    if (announcements && announcements.length > 0) {
      const latest = announcements[0];
      list.push({
        id: `announcement_${latest._id}`,
        type: "announcement",
        urgency: "info",
        title: `Announcement: ${latest.title}`,
        description: latest.body,
        actionLabel: "View Notes",
        onAction: () => setScreen("home"),
      });
    }

    return list;
  }, [
    isHost,
    contributions,
    bundle?.membership.userId,
    guestMembers,
    confirmContribution,
    hasAccepted,
    terms?._id,
    obligations,
    chores,
    asOfDate,
    announcements,
  ]);

  const ready = Boolean(
    bundle &&
    viewer &&
    chores &&
    activities &&
    announcements &&
    (!financialGuestId || financialSummary),
  );
  const ledgerReady =
    !financialGuestId || Boolean(ledgerDetails && contributionDetails);
  const isEnded = bundle?.stay.status === "ended";
  async function makeInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const delivery = String(
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ??
        "text",
    );
    const email = value(form, "email");
    if (delivery === "email" && !email) {
      setInviteError(
        "Enter the guest’s email address to send an email invitation.",
      );
      return;
    }
    const token = createInviteToken();
    const url = `${window.location.origin}/invite/${token}`;
    setInviteError("");
    if (!beginSubmit()) return;
    try {
      await createInvite({
        stayId,
        tokenHash: await hashInviteToken(token),
        invitedEmail: delivery === "email" ? email : undefined,
        inviteUrl: url,
        expiresAt: Date.now() + 7 * 86_400_000,
      });
      setInviteMode(delivery === "email" ? "email" : "text");
      setInviteUrl(url);
      notify(
        delivery === "email"
          ? "Email invitation sent."
          : "Invite link ready to copy.",
      );
    } catch (reason) {
      setInviteError(
        reason instanceof Error
          ? reason.message
          : "Could not create the invitation.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function addContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!financialGuestId) return;
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await createContribution({
        stayId,
        guestUserId: financialGuestId,
        type: value(form, "type") as
          "payment" | "groceries" | "supplies" | "house_work" | "other",
        amountCents: Math.round(Number(value(form, "amount")) * 100),
        date: value(form, "date"),
        note: value(form, "note"),
        countsTowardBalance: form.get("counts") === "on",
      });
      setPanel(null);
      notify("Contribution added for confirmation.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function addCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!financialGuestId) return;
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await createAdhocCharge({
        stayId,
        guestUserId: financialGuestId,
        title: value(form, "title"),
        amountCents: Math.round(Number(value(form, "amount")) * 100),
        effectiveDate: value(form, "effectiveDate"),
        dueDate: value(form, "dueDate"),
      });
      setPanel(null);
      notify("One-off charge added and recorded.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function addChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assigneeUserId = value(form, "assigneeUserId") as Id<"users"> | "";
    if (!beginSubmit()) return;
    try {
      const repeatCadence = value(form, "repeatCadence");
      const selectedMember = members.find(
        (member) => member.person.id === assigneeUserId,
      );
      const assignee =
        selectedMember?.membership.role === "host"
          ? "host"
          : selectedMember
            ? "guest"
            : "shared";
      await createChore({
        stayId,
        title: value(form, "title"),
        note: value(form, "note"),
        assignee,
        assigneeUserId: assigneeUserId || undefined,
        dueDate: value(form, "dueDate"),
        repeatCadence:
          repeatCadence === "daily" || repeatCadence === "weekly"
            ? repeatCadence
            : undefined,
      });
      setPanel(null);
      notify("Chore added.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function addAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await createAnnouncement({
        stayId,
        title: value(form, "title"),
        body: value(form, "body"),
        pinnedUntil: value(form, "pinnedUntil") || undefined,
      });
      setPanel(null);
      notify("Announcement shared with the household.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      const displayName = value(form, "name");
      if (!displayName) throw new Error("Enter your name before saving.");
      if (!clerkUser)
        throw new Error(
          "Your Clerk profile is still loading. Try again in a moment.",
        );
      const [firstName, ...lastNameParts] = displayName.split(/\s+/);
      const updatedClerkUser = await clerkUser.update({
        firstName,
        lastName: lastNameParts.join(" "),
      });
      await syncCurrent({
        clerkName: updatedClerkUser.fullName || displayName,
        email: updatedClerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: updatedClerkUser.imageUrl,
      });
      await updatePreferences({
        phone: value(form, "phone") || undefined,
        notifyEmail: form.get("notifyEmail") === "on",
        notifySms: form.get("notifySms") === "on",
      });
      setPanel(null);
      notify("Profile and reminder preferences saved.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not save your profile and reminder preferences.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function saveHouseInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await updateHouseInfo({
        stayId,
        houseInfo: {
          wifiNetwork: value(form, "wifiNetwork") || undefined,
          wifiPassword: value(form, "wifiPassword") || undefined,
          streetAddress: value(form, "streetAddress") || undefined,
          unit: value(form, "unit") || undefined,
          cityStateZip: value(form, "cityStateZip") || undefined,
          doorCode: value(form, "doorCode") || undefined,
          parkingNotes: value(form, "parkingNotes") || undefined,
          trashDay: value(form, "trashDay") || undefined,
          emergencyContact: value(form, "emergencyContact") || undefined,
          otherNotes: value(form, "otherNotes") || undefined,
        },
      });
      setPanel(null);
      notify("Household guide & access info updated.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save the house guide. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function savePaymentOptions(
    options: NonNullable<Doc<"stays">["paymentOptions"]>,
  ) {
    if (!beginSubmit()) return;
    try {
      await updatePaymentOptions({ stayId, paymentOptions: options });
      setPanel(null);
      notify("External payment options saved.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }
  async function saveGuestPreferredName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!financialGuestId) return;
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await updateGuestPreferredName({
        stayId,
        guestUserId: financialGuestId,
        preferredName: value(form, "preferredName"),
      });
      notify("Guest preferred name updated.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not update the guest preferred name.",
      );
    } finally {
      finishSubmit();
    }
  }

  async function saveAgreementAutoAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await updateAgreementAutoAccept({
        stayId,
        enabled: form.get("enabled") === "on",
        hours: Number(value(form, "hours")),
      });
      notify("Agreement auto-accept settings saved.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not save agreement settings.",
      );
    } finally {
      finishSubmit();
    }
  }

  async function saveStayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!beginSubmit()) return;
    try {
      await updateStayName({ stayId, name: value(form, "name") });
      setPanel(null);
      notify("Stay name updated.");
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not rename this stay. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }

  async function saveHouseholdTerms(updatedTerms: GuestTerms) {
    if (!beginSubmit()) return;
    try {
      await updateHouseholdTerms({ stayId, terms: updatedTerms });
      setPanel(null);
      notify(
        "Household defaults updated. Each active guest needs to review and accept the new version.",
      );
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }

  async function disputeContributionEntry(contributionId: Id<"contributions">) {
    try {
      await disputeContribution({ contributionId });
      notify("Contribution marked as disputed.");
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : "We could not dispute this contribution.",
      );
    }
  }

  async function saveGuestAgreement(updatedTerms: GuestTerms) {
    if (!editingGuestId) return;
    if (!beginSubmit()) return;
    try {
      await updateGuestTerms({
        stayId,
        guestUserId: editingGuestId,
        terms: updatedTerms,
      });
      const guestName =
        guestMembers.find((guest) => guest.person.id === editingGuestId)?.person
          .name ?? "Guest";
      setPanel(null);
      notify(
        `${guestName}'s agreement updated. They need to review and accept it.`,
      );
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      finishSubmit();
    }
  }

  // The confirmation dialog owns busy state, failure feedback and success dismissal.
  async function confirmDestructiveAction() {
    if (destructiveAction?.type === "end") {
      await endStay({ stayId });
      notify("Stay ended. The record is retained in Past stays.");
      onBackToHub();
    } else if (destructiveAction?.type === "cancelCharge") {
      await voidAdhocCharge({ obligationId: destructiveAction.obligationId });
      notify("Charge cancelled. Its history is retained.");
    } else if (destructiveAction?.type === "voidContribution") {
      await voidContribution({
        contributionId: destructiveAction.contributionId,
      });
      notify("Contribution voided. Its history is retained.");
    } else if (destructiveAction?.type === "voidChore") {
      await voidChore({ choreId: destructiveAction.choreId });
      notify("Chore voided. Its history is retained.");
    } else if (destructiveAction?.type === "voidClaim") {
      await voidClaim({ claimId: destructiveAction.claimId });
      notify("Reward claim voided. Its history is retained.");
    } else if (destructiveAction?.type === "regenerateCode") {
      await regenerateCode({ stayId });
      notify("New join code created. The old code no longer works.");
    } else if (destructiveAction?.type === "endGuestAgreement") {
      await endGuestAgreement({ stayId, guestUserId: destructiveAction.guestUserId });
      notify(`${destructiveAction.name} has been removed from this stay.`);
    }
  }

  const guestDisplayName =
    selectedGuest?.name && selectedGuest.name !== "Kouchd member"
      ? selectedGuest.name
      : "Guest";
  const ledgerLabel = isHost
    ? financialGuestId
      ? `${guestDisplayName}'s private ledger`
      : "Private guest ledgers"
    : "Your private ledger";
  const stayTitle =
    bundle?.stay.name || bundle?.stay.houseInfo?.cityStateZip || "Shared stay";
  const stayDatesSummary = terms
    ? `${formatDate(terms.startDate)} to ${formatDate(terms.endDate)}`
    : "Dates pending";

  return {
    ready,
    ledgerReady,
    actionError,
    pendingContributionCount,
    dueCount,
    stayTitle,
    stayDatesSummary,
    visibleScreen,
    setScreen,
    setPanel,
    viewer,
    isHost,
    canShowTour,
    openTour,
    setJoinModalOpen,
    notifications,
    isEnded,
    balance,
    hasAccepted,
    setGuestOnboardingOpen,
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
    ledgerLabel,
    charge,
    waiveLateFee,
    setDestructiveAction,
    confirmContribution,
    chores,
    displayedAgreementTerms,
    selectedGuestMember,
    guestDisplayName,
    displayedAgreementAccepted,
    saveAgreementAutoAccept,
    isSubmittingModal,
    saveGuestPreferredName,
    terms,
    selectedGuestTerms,
    setEditingGuestId,
    panel,
    addContribution,
    addCharge,
    addChore,
    addAnnouncement,
    savePreferences,
    clerkUser,
    saveHouseInfo,
    savePaymentOptions,
    editingGuestId,
    saveGuestAgreement,
    saveStayName,
    saveHouseholdTerms,
    disputeContributionEntry,
    inviteUrl,
    inviteMode,
    makeInvite,
    inviteError,
    guestOnboardingOpen,
    joinModalOpen,
    isTourVisible,
    guideRole,
    visibleTourStep,
    moveTour,
    skipTour,
    pauseTour,
    destructiveAction,
    confirmDestructiveAction,
    notice,
    stayId,
  };
}
export type WorkspaceState = ReturnType<typeof useLiveStay>;
