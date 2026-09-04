import { InviteAccept } from "@/components/invite-accept";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="route-state"><h1>Invitations are not connected yet.</h1><p className="muted">The Wrelik Apps environment still needs Clerk and Convex credentials.</p></main>;
  }
  return <InviteAccept token={token} />;
}
