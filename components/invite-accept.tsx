"use client";

import { Show, SignUp, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InviteSkeleton } from "@/components/skeleton-loader";
import { InviteHero, InvitePrivacyPanel } from "@/components/invite-guest-panels";
import { planLimitError, STAY_FULL_MESSAGE } from "@/lib/planLimitError";

const nameKey = (tokenHash: string) => `kouchd:invite-display-name:${tokenHash}`;

export function InviteAccept({ token, tokenHash }: { token: string; tokenHash: string }) {
  const preview = useQuery(api.invites.preview, { tokenHash });
  // Accepting the invite marks it used, which re-runs the preview query. Remember
  // the join here so the guest sees the success state, not "already accepted".
  const [joinedStayId, setJoinedStayId] = useState<Id<"stays"> | null>(null);

  if (joinedStayId) {
    return (
      <main className="auth-landing invite-landing screen-transition">
        <JoinedHousehold stayId={joinedStayId} />
      </main>
    );
  }

  if (preview === undefined) {
    return <main className="auth-landing screen-transition"><InviteSkeleton /></main>;
  }

  if (!preview.valid) {
    const wasUsed = preview.status === "used";
    return (
      <main className="auth-landing invite-landing screen-transition">
        <section className="invite-hero-card">
          <p className="invite-eyebrow">For invited guests</p>
          <h1>{wasUsed ? "This invite was already accepted." : "This invite is unavailable."}</h1>
          <p className="invite-hero-body">
            {wasUsed
              ? "If you joined with this link, open Kouchd to continue. Otherwise, ask your host for a fresh invitation."
              : "Ask your host for a new invitation link."}
          </p>
          {wasUsed && <Link className="kouchd-main-action invite-action" href="/">Open Kouchd</Link>}
        </section>
      </main>
    );
  }

  const details = "hostName" in preview ? preview : null;
  return (
    <main className="auth-landing invite-landing screen-transition">
      <InviteHero hostName={details?.hostName} stayName={details?.stayName} referralCode={details?.referralCode} expiresAt={details?.expiresAt} />
      <Show when="signed-out">
        <Registration token={token} tokenHash={tokenHash} />
      </Show>
      <Show when="signed-in">
        <Accept tokenHash={tokenHash} onJoined={setJoinedStayId} />
      </Show>
      <InvitePrivacyPanel />
    </main>
  );
}

function Registration({ token, tokenHash }: { token: string; tokenHash: string }) {
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [ready, setReady] = useState(false);
  const returnUrl = `/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    try {
      const savedName = window.sessionStorage.getItem(nameKey(tokenHash));
      if (savedName) queueMicrotask(() => setDisplayName((current) => current || savedName));
    } catch {
      // Registration still works when browser storage is disabled.
    }
  }, [tokenHash]);

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = displayName.trim();
    if (!normalizedName || normalizedName.length > 80) {
      setNameError("Enter a name between 1 and 80 characters.");
      return;
    }
    setDisplayName(normalizedName);
    try {
      window.sessionStorage.setItem(nameKey(tokenHash), normalizedName);
    } catch {
      // The name can be entered again after account creation if storage is disabled.
    }
    setReady(true);
  }

  return (
    <section className="invite-registration-card">
      {!ready ? (
        <form onSubmit={saveName} className="invite-name-form">
          <label>
            <span>Your name</span>
            <input
              autoComplete="name"
              maxLength={80}
              onChange={(event) => { setDisplayName(event.target.value); setNameError(""); }}
              placeholder="Name your host will recognize"
              required
              value={displayName}
            />
          </label>
          {nameError && <p className="form-error" role="alert">{nameError}</p>}
          <button className="kouchd-main-action invite-action" type="submit">Continue to registration <ArrowRight size={18} aria-hidden="true" /></button>
        </form>
      ) : (
        <>
          <p className="eyebrow">Create your Kouchd account</p>
          <SignUp routing="hash" forceRedirectUrl={returnUrl} />
          <p className="invite-auth-switch">Already have an account? <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}>Sign in</Link></p>
        </>
      )}
    </section>
  );
}

function JoinedHousehold({ stayId }: { stayId: Id<"stays"> }) {
  const router = useRouter();
  const stayHref = `/?stayId=${encodeURIComponent(stayId)}`;
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(stayHref), 1200);
    return () => window.clearTimeout(timer);
  }, [router, stayHref]);
  return (
    <section className="invite-hero-card" role="status">
      <CheckCircle2 className="auth-success" size={36} aria-hidden="true" />
      <p className="invite-eyebrow">Invitation accepted</p>
      <h1>You’re part of the household.</h1>
      <p className="invite-hero-body">Opening your stay so you can review the agreement and house rules.</p>
      <Link className="kouchd-main-action invite-action" href={stayHref}>Open your stay</Link>
    </section>
  );
}

function Accept({ tokenHash, onJoined }: { tokenHash: string; onJoined: (stayId: Id<"stays">) => void }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const sync = useMutation(api.users.syncCurrent);
  const accept = useMutation(api.invites.accept);
  const recordBlockedJoin = useMutation(api.subscriptions.recordBlockedJoin);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let savedName: string | null = null;
    try {
      savedName = window.sessionStorage.getItem(nameKey(tokenHash));
    } catch {
      // Fall back to the name already on the Clerk profile.
    }
    const preferredName = savedName || user?.fullName || "";
    if (preferredName) queueMicrotask(() => setDisplayName((current) => current || preferredName));
  }, [tokenHash, user?.fullName]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = displayName.trim();
    if (!normalizedName || normalizedName.length > 80) {
      setStatus("Enter a name between 1 and 80 characters.");
      return;
    }

    setJoining(true);
    setStatus("");
    try {
      if (!user) throw new Error("Your Clerk profile is still loading. Try again in a moment.");
      const [firstName, ...lastNameParts] = normalizedName.split(/\s+/);
      const updatedClerkUser = await user.update({ firstName, lastName: lastNameParts.join(" ") });
      await sync({
        clerkName: updatedClerkUser.fullName || normalizedName,
        email: updatedClerkUser.primaryEmailAddress?.emailAddress,
        imageUrl: updatedClerkUser.imageUrl,
      });
      const joinedStayId = await accept({ tokenHash });
      try {
        window.sessionStorage.removeItem(nameKey(tokenHash));
      } catch {
        // Storage cleanup is optional after a successful join.
      }
      setDone(true);
      setStatus("You joined the household. Your host can now see your name.");
      onJoined(joinedStayId);
    } catch (reason) {
      if (planLimitError(reason)) {
        setStatus(STAY_FULL_MESSAGE);
        void recordBlockedJoin({ tokenHash }).catch(() => undefined);
        return;
      }
      const message = reason instanceof Error ? reason.message : "This invitation could not be accepted.";
      setStatus(message.includes("Already a member") ? "This account is already part of the household. Open Kouchd to continue." : message);
    } finally {
      setJoining(false);
    }
  }

  if (authLoading || !isAuthenticated) return <InviteSkeleton />;

  return (
    <section className="invite-registration-card">
      {done && <CheckCircle2 className="auth-success" size={36} aria-hidden="true" />}
      <p className="eyebrow">{done ? "Invitation accepted" : "One last step"}</p>
      <h2>{done ? "You’re part of the household." : "Confirm your name to join."}</h2>
      {!done && (
        <form onSubmit={join} className="invite-name-form">
          <label>
            <span>Your name</span>
            <input
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </label>
          <button className="kouchd-main-action invite-action" type="submit" disabled={joining}>
            {joining ? "Joining..." : "Join free"} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      )}
      {status && <p className={done ? "invite-success" : "form-error"} role={done ? "status" : "alert"}>{status}</p>}
      {(done || status.includes("already part")) && <Link className="kouchd-main-action invite-action" href="/">Open Kouchd</Link>}
    </section>
  );
}
