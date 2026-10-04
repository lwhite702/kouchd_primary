import { InviteAccept } from "@/components/invite-accept";
import { createHash } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  let hostName: string | undefined;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl && token.length <= 100) {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const client = new ConvexHttpClient(convexUrl);
      const preview = await client.query(api.invites.preview, { tokenHash });
      if (preview.valid && "hostName" in preview) hostName = preview.hostName;
    } catch {
      // A preview crawler must still receive useful Kouchd metadata if Convex is unavailable.
    }
  }

  const title = hostName ? `${hostName} invited you to join Kouchd` : "A private household invitation | Kouchd";
  const description = hostName
    ? `${hostName} invited you to join their household on Kouchd. Open the private link to review the invitation.`
    : "Open your private invitation to review and join a shared household on Kouchd.";
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Kouchd",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Kouchd shared household invitation" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="route-state"><h1>Invitations are not connected yet.</h1><p className="muted">Kouchd invitations are temporarily unavailable. Please ask your host to share a new link later.</p></main>;
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return <InviteAccept token={token} tokenHash={tokenHash} />;
}
