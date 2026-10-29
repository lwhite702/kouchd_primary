import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { HELP_LINKS } from "@/lib/help-links";
import { appVersion } from "@/lib/version";

interface MarketingFooterProps {
  hasClerk?: boolean;
}

export function MarketingFooter({ hasClerk }: MarketingFooterProps = {}) {
  void hasClerk;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="v21-footer" aria-label="Site footer">
      <div className="v21-footer-top">
        <div className="v21-footer-brand-col">
          <Link href="/" className="v21-footer-brand" aria-label="Kouchd home">
            <KouchdWordmark size="sm" />
          </Link>
          <p className="v21-footer-tagline">
            Your space. Your people. Everyone on the same page.
          </p>
          <p className="v21-footer-subtext">
            Private shared living made easier to coordinate. Stay agreements, house details, contribution records, and chores.
          </p>
        </div>

        <nav className="v21-footer-nav-col" aria-label="Product and support">
          <strong className="v21-footer-col-title">Product</strong>
          <ul>
            <li><Link href="/about">About Kouchd</Link></li>
            <li><Link href="/#how-it-works">How it works</Link></li>
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
            <li>
              <a href={HELP_LINKS.home} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                Help center <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </nav>

        <nav className="v21-footer-nav-col" aria-label="Media and company">
          <strong className="v21-footer-col-title">Company & Media</strong>
          <ul>
            <li><Link href="/brand">Brand & Press Kit</Link></li>
            <li><a href="mailto:support@kouchd.com">Email support</a></li>
            <li><Link href="/sms-opt-in">SMS updates</Link></li>
          </ul>
        </nav>

        <nav className="v21-footer-nav-col" aria-label="Legal and privacy">
          <strong className="v21-footer-col-title">Trust & Legal</strong>
          <ul>
            <li><Link href="/privacy">Privacy policy</Link></li>
            <li><Link href="/terms">Terms of service</Link></li>
            <li><Link href="/acceptable-use">Acceptable use</Link></li>
            <li><Link href="/cookies">Cookie policy</Link></li>
          </ul>
        </nav>
      </div>

      <div className="v21-footer-bottom">
        <small className="v21-footer-legal">
          © {currentYear} Wrelik Brands LLC. Kouchd records shared expectations; it does not replace applicable housing rights.
        </small>
        <span className="v21-footer-version">v{appVersion}</span>
      </div>
    </footer>
  );
}
