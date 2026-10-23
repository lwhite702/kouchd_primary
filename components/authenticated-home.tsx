"use client";

import { Show, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { LandingPage } from "@/components/landing-page";
import { KnockGuidesProvider } from "@/components/knock/knock-guides-provider";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import "@/components/dashboard-v21.css";
import { GetStartedHub, StayHub } from "@/components/workspace/account-shell";
import dynamic from "next/dynamic";
const LiveStay = dynamic(
  () => import("@/components/workspace/live-stay").then((m) => m.LiveStay),
  { loading: () => <DashboardSkeleton message="Opening your stay…" /> },
);

export function AuthenticatedHome() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage hasClerk={true} />
      </Show>
      <Show when="signed-in">
        <SyncedWorkspace />
      </Show>
    </>
  );
}

function SyncedWorkspace() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser();
  const syncCurrent = useMutation(api.users.syncCurrent);
  const syncedProfileRef = useRef<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [selectedStayId, setSelectedStayId] = useState<Id<"stays"> | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthenticated || !clerkLoaded || !clerkUser) return;
    const resolvedName =
      clerkUser?.fullName ||
      [clerkUser?.firstName, clerkUser?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      clerkUser?.username ||
      undefined;
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const profileKey = JSON.stringify([
      clerkUser.id,
      resolvedName ?? "",
      email ?? "",
      clerkUser.imageUrl ?? "",
    ]);

    if (syncedProfileRef.current === profileKey) return;
    syncedProfileRef.current = profileKey;

    void syncCurrent({
      clerkName: resolvedName,
      email,
      imageUrl: clerkUser?.imageUrl,
    })
      .then(() => setSynced(true))
      .catch((err) => {
        console.error("Workspace sync error:", err);
        setSyncError("We could not prepare your private workspace.");
      });
  }, [isAuthenticated, clerkLoaded, clerkUser, syncCurrent]);

  const stays = useQuery(api.stays.listMine, synced ? {} : "skip") as
    Array<{ stay: Doc<"stays">; membership: Doc<"memberships"> }> | undefined;

  useEffect(() => {
    if (!stays || stays.length === 0 || selectedStayId) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stayIdParam = params.get("stayId");
    if (stayIdParam) {
      const matchingStay = stays.find((item) => item.stay._id === stayIdParam);
      if (matchingStay) {
        queueMicrotask(() => {
          setSelectedStayId(matchingStay.stay._id);
        });
      }
    }
  }, [stays, selectedStayId]);

  if (syncError) {
    return (
      <main className="route-state">
        <h1>Sign-in needs a reset.</h1>
        <p className="muted">{syncError}</p>
        <button
          className="button primary"
          type="button"
          style={{ marginTop: "1rem" }}
          onClick={() => {
            syncedProfileRef.current = null;
            setSyncError("");
            const resolvedName =
              clerkUser?.fullName ||
              [clerkUser?.firstName, clerkUser?.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              clerkUser?.username ||
              undefined;
            void syncCurrent({
              clerkName: resolvedName,
              email: clerkUser?.primaryEmailAddress?.emailAddress,
              imageUrl: clerkUser?.imageUrl,
            })
              .then(() => setSynced(true))
              .catch((err) => {
                console.error("Workspace sync retry error:", err);
                setSyncError("We could not prepare your private workspace.");
              });
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  if (authLoading || !isAuthenticated || !synced || stays === undefined) {
    return <DashboardSkeleton message="Setting out the clean sheets..." />;
  }
  if (stays.length === 0) {
    return (
      <KnockGuidesProvider>
        <GetStartedHub onHostStayCreated={setSelectedStayId} />
      </KnockGuidesProvider>
    );
  }
  const selectedStay = selectedStayId
    ? stays.find((item) => item.stay._id === selectedStayId)
    : undefined;
  if (!selectedStay)
    return (
      <StayHub
        stays={stays}
        onSelectStay={setSelectedStayId}
        onHostStayCreated={setSelectedStayId}
      />
    );
  return (
    <KnockGuidesProvider
      userId={selectedStay.membership.userId}
      userProperties={{
        stayId: selectedStay.stay._id,
        role: selectedStay.membership.role,
        stayStatus: selectedStay.stay.status,
      }}
    >
      <LiveStay
        stayId={selectedStay.stay._id}
        onBackToHub={() => setSelectedStayId(null)}
      />
    </KnockGuidesProvider>
  );
}
