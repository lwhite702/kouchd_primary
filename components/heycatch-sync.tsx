"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { analytics } from "@heycatch/sdk";

export function HeyCatchAuthSync() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (userId && user) {
      if (lastUserIdRef.current !== userId) {
        lastUserIdRef.current = userId;
        const email = user.primaryEmailAddress?.emailAddress;
        const name = user.fullName ?? undefined;
        const signupDate = user.createdAt ? new Date(user.createdAt).toISOString() : undefined;

        analytics.setIdentity(
          userId,
          {
            email,
            name,
          },
          signupDate ? { signup_date: signupDate } : undefined,
        );
      }
    } else if (!userId && lastUserIdRef.current) {
      lastUserIdRef.current = null;
      analytics.resetIdentity();
    }
  }, [isLoaded, userId, user]);

  return null;
}
