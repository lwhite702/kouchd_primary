import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { Tooltip } from "@/components/ui/tooltip";
import { APP_ORIGIN } from "@/lib/app-domain";
import { HELP_LINKS } from "@/lib/help-links";

export function MarketingStartButton({ hasClerk }: { hasClerk: boolean }) {
  return (
    <Link className="v21-button v21-button-lime" href={hasClerk ? `${APP_ORIGIN}/sign-up` : "/?preview=true"}>
      Start a stay <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}

export function MarketingHeader({ hasClerk, about = false }: { hasClerk: boolean; about?: boolean }) {
  const links = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/#privacy", label: "Privacy" },
    { href: "/#faq", label: "FAQ" },
    { href: "/about", label: "About" },
  ];
  return (
    <header className="v21-header">
      <Link href="/" aria-label="Kouchd home" className="v21-brand"><KouchdWordmark size="md" /></Link>
      <nav className="v21-nav" aria-label="Main navigation">
        {links.map(({ href, label }) => <Link key={href} href={href} aria-current={about && href === "/about" ? "page" : undefined}>{label}</Link>)}
        <Tooltip content="Explore stay guides, Ledger setup, and house rules" position="bottom">
          <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer" className="v21-nav-help"><BookOpen size={15} aria-hidden="true" /> Guides <ArrowUpRight size={13} aria-hidden="true" /></a>
        </Tooltip>
      </nav>
      <details className="v21-nav-compact">
        <summary>Menu</summary>
        <nav className="v21-nav-compact-panel" aria-label="Mobile navigation">
          {links.map(({ href, label }) => <Link key={href} href={href} aria-current={about && href === "/about" ? "page" : undefined}>{label}</Link>)}
          <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer">Guides</a>
          {hasClerk && <Link href={`${APP_ORIGIN}/sign-in`}>Sign in</Link>}
        </nav>
      </details>
      <div className="v21-header-actions">
        {hasClerk && <Link href={`${APP_ORIGIN}/sign-in`} className="v21-sign-in">Sign in</Link>}
        <MarketingStartButton hasClerk={hasClerk} />
      </div>
    </header>
  );
}
