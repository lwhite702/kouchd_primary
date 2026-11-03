import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { GuestJoinForm } from "@/components/start/guest-join-form";
import { AgreementIllustration, HouseGuideIllustration } from "@/components/start/start-illustrations";
import { HELP_LINKS } from "@/lib/help-links";

import "./start-page.css";

export const START_ROUTES = {
  signIn: "/sign-in",
  hostSignUp: "/sign-up",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  smsPreferences: "/sms-opt-in",
} as const;

const trustItems = [
  "Free for guests, always",
  "Private, by invitation only",
  "Kouchd records contributions. It never handles payments.",
];

/** Signed-out Start page for app.kouchd.com: pick hosting or joining a stay. */
export function StartPage() {
  return (
    <div className="kd-start">
      <header className="kd-start-topbar">
        <Link className="kd-start-brand" href="/" aria-label="Kouchd home">
          <KouchdWordmark size="md" />
        </Link>
        <p className="kd-start-signin">
          <span className="kd-start-signin-prompt">Already have an account?</span>{" "}
          <Link href={START_ROUTES.signIn}>Sign in</Link>
        </p>
      </header>

      <main className="kd-start-main" id="main-content">
        <section className="kd-start-hero" aria-labelledby="kd-start-title">
          <h1 id="kd-start-title">Your stay, in one place.</h1>
          <p className="kd-start-subcopy">
            House notes, agreements, chores, and contributions, shared with the people in your home.
          </p>
        </section>

        <div className="kd-start-choices">
          <section className="kd-start-card kd-start-card--host" aria-labelledby="kd-start-host-title">
            <AgreementIllustration className="kd-start-art" />
            <p className="kd-start-eyebrow">For hosts</p>
            <h2 id="kd-start-host-title">Hosting someone?</h2>
            <p className="kd-start-card-body">
              Set up the stay, add house notes, and invite your people. Start free with one guest.
            </p>
            <Link className="kd-start-primary" href={START_ROUTES.hostSignUp}>
              Start free as a host <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </section>

          <section className="kd-start-card kd-start-card--guest" aria-labelledby="kd-start-guest-title">
            <HouseGuideIllustration className="kd-start-art" />
            <p className="kd-start-eyebrow">For guests</p>
            <h2 id="kd-start-guest-title">Invited to a stay?</h2>
            <p className="kd-start-card-body">
              Enter the invite code your host shared. Guests always join free.
            </p>
            <GuestJoinForm />
          </section>
        </div>

        <ul className="kd-start-trust" aria-label="About Kouchd">
          {trustItems.map((item) => (
            <li key={item}>
              <span className="kd-start-dot" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </main>

      <footer className="kd-start-footer">
        <p>© 2026 Wrelik Brands LLC</p>
        <nav aria-label="Legal and help">
          <ul>
            <li><Link href={START_ROUTES.privacy}>Privacy</Link></li>
            <li><Link href={START_ROUTES.terms}>Terms</Link></li>
            <li><Link href={START_ROUTES.cookies}>Cookies</Link></li>
            <li><Link href={START_ROUTES.smsPreferences}>SMS preferences</Link></li>
            <li>
              <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer">
                Help center
              </a>
            </li>
          </ul>
        </nav>
      </footer>
    </div>
  );
}
