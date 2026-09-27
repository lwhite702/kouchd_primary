import Link from "next/link";
import { BookOpen, Compass, Home } from "lucide-react";
import { KouchdWordmark, CouchSymbol } from "@/components/brand/kouchd-logo";

export const metadata = {
  title: "404 - Page Not Found | Kouchd",
  description: "The page you are looking for does not exist or has moved.",
};

export default function NotFound() {
  return (
    <div className="not-found-shell">
      {/* Brand Header */}
      <header className="not-found-header">
        <Link href="/" className="brand" aria-label="Kouchd home">
          <KouchdWordmark size="md" />
        </Link>
        <a
          href="https://help.kouchd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="button ghost compact not-found-docs-link"
          title="Guides & Documentation"
        >
          <BookOpen size={15} /> Docs
        </a>
      </header>

      {/* Main 404 Canvas */}
      <main className="not-found-main">
        <div className="not-found-card screen-transition">
          {/* Visual Brand Art */}
          <div className="not-found-art-wrap" aria-hidden="true">
            <div className="not-found-art-backdrop" />
            <CouchSymbol size={76} color="var(--kouchd-forest, #184f3a)" accentColor="var(--kouchd-lime, #dff25e)" />
            <span className="not-found-badge">404</span>
          </div>

          <div className="not-found-content">
            <p className="eyebrow not-found-eyebrow">
              <Compass size={14} className="inline-icon" /> Wrong couch
            </p>
            <h1 className="not-found-title">That page isn&apos;t here.</h1>
            <p className="not-found-desc">
              The spot you&apos;re looking for might have been moved, closed, or never fluffed in the first place. Your shared record is safe and intact.
            </p>

            <div className="not-found-actions">
              <Link className="button primary button-link" href="/">
                <Home size={18} /> Back to Kouchd
              </Link>
              <a
                className="button soft button-link"
                href="https://help.kouchd.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpen size={18} /> Help &amp; Guides
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="not-found-footer">
        <p>
          Need assistance? Explore the{" "}
          <a href="https://help.kouchd.com" target="_blank" rel="noopener noreferrer">
            Kouchd documentation
          </a>{" "}
          or review our{" "}
          <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </footer>
    </div>
  );
}
