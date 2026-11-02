"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export const SIGN_OUT_REDIRECT_URL = "/sign-in";

export function SignOutRedirect() {
  const { loaded, signOut } = useClerk();
  const started = useRef(false);

  useEffect(() => {
    if (!loaded || started.current) return;
    started.current = true;
    void signOut({ redirectUrl: SIGN_OUT_REDIRECT_URL });
  }, [loaded, signOut]);

  return (
    <main className="route-state" aria-busy="true">
      <p>Signing you out…</p>
    </main>
  );
}
