"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { hashInviteToken } from "@/lib/invite";

export function InviteAccept({ token }: { token: string }) {
  return (
    <main className="auth-landing">
      <Show when="signed-out">
        <p className="eyebrow">You&apos;ve been invited</p>
        <h1>There&apos;s a spot for you on Kouchd.</h1>
        <p>Sign in or create an account to accept the private shared-stay invitation.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <SignUpButton mode="modal">
            <button className="button primary" type="button">
              Sign up to accept <ArrowRight size={18} />
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="button soft" type="button">
              Sign in
            </button>
          </SignInButton>
        </div>
      </Show>
      <Show when="signed-in">
        <Accept token={token} />
      </Show>
    </main>
  );
}

function Accept({ token }: { token: string }) {
  const sync = useMutation(api.users.syncCurrent);
  const accept = useMutation(api.invites.accept);
  const started = useRef(false);
  const [status, setStatus] = useState("Checking your invitation...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        await sync({});
        await accept({ tokenHash: await hashInviteToken(token) });
        setDone(true); setStatus("You joined the stay. The current terms are ready for your review.");
      } catch (reason) { setStatus(reason instanceof Error ? reason.message : "This invitation could not be accepted."); }
    })();
  }, [accept, sync, token]);

  return <>{done && <CheckCircle2 className="auth-success" size={42} />}<p className="eyebrow">Guest invitation</p><h1>{done ? "You're Kouchd." : "Joining the stay"}</h1><p>{status}</p>{done && <Link className="button primary button-link" href="/">Open the shared stay</Link>}</>;
}
