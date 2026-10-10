import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <main className="route-state">Clerk is not connected yet.</main>;
  return <main className="clerk-page"><SignIn /></main>;
}
