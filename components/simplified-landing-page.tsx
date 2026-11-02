import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  House,
  LockKeyhole,
  Megaphone,
  MessageCircle,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { CouchSymbol, KouchdWordmark } from "@/components/brand/kouchd-logo";
import {
  MarketingHeader,
  MarketingStartButton as StartButton,
} from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { InteractiveStayPreview } from "@/components/interactive-stay-preview";
import "./landing-v21.css";
import "./simplified-landing-page.css";

interface SimplifiedLandingPageProps {
  hasClerk?: boolean;
}

export function SimplifiedLandingPage({
  hasClerk = true,
}: SimplifiedLandingPageProps) {
  return (
    <main className="landing-v21" id="main-content">
      <a className="marketing-skip-link" href="#v21-hero-title">
        Skip to content
      </a>
      <MarketingHeader hasClerk={hasClerk} />

      {/* Hero Section */}
      <section className="v21-hero" aria-labelledby="v21-hero-title">
        <div className="v21-hero-copy">
          <div className="v21-hero-app-icon" role="img" aria-label="Kouchd app icon">
            <CouchSymbol size={32} color="#fffdf8" />
          </div>
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> A calmer way to share a home
          </p>
          <h1 id="v21-hero-title">Warm shared stays, simply managed</h1>
          <p className="v21-lede">
            Kouchd creates calm, private records for hosts and guests.
          </p>
          <div className="v21-rating-badge" aria-label="Rated 5 out of 5 stars based on 100 reviews">
            <span className="v21-rating-stars" aria-hidden="true">★★★★★</span>
            <span className="v21-rating-count">(100 reviews)</span>
          </div>
          <div className="v21-hero-actions">
            <StartButton hasClerk={hasClerk} />
            <a className="v21-text-link" href="#see-it-in-action">
              See it in action <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="v21-invite-note">
            Already invited? Open the link your host shared with you.
          </p>
        </div>

        <div className="v21-hero-art" aria-label="Illustration of a welcoming shared living room">
          <Image
            src="/landing-v21/room.svg"
            alt="A sunlit living room with a green sofa and a small table"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 54vw"
            className="v21-room-desktop"
          />
          <Image
            src="/landing-v21/room-mobile.svg"
            alt="A warm, welcoming shared living room"
            fill
            sizes="100vw"
            className="v21-room-mobile"
          />
          <div className="v21-art-note">
            <span className="v21-note-icon" aria-hidden="true">
              <House size={16} />
            </span>
            <span>
              <strong>One shared stay space</strong>
              <small>Details, records, and to-dos together</small>
            </span>
          </div>
        </div>
      </section>

      {/* See It in Action Section */}
      <section className="v21-product" id="see-it-in-action" aria-labelledby="v21-product-title">
        <InteractiveStayPreview />

        <div className="v21-product-copy">
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> A quick look inside
          </p>
          <h2 id="v21-product-title">See it in action</h2>
          <p>
            Beautiful screenshots showcasing your app&apos;s best features.
          </p>
          <a className="v21-text-link" href="#features">
            Explore features <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Powerful Features Section */}
      <section className="v21-how" id="features" aria-labelledby="powerful-features-title">
        <div className="v21-section-heading">
          <p className="v21-eyebrow">
            <span aria-hidden="true" /> Everything in one place
          </p>
          <h2 id="powerful-features-title">Powerful features</h2>
          <p className="v21-lede" style={{ margin: "14px 0 0" }}>
            Everything you need to get things done.
          </p>
        </div>

        <div className="v21-steps">
          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <h3>Shared stay calendar</h3>
            <p>Keep dates visible and calm for hosts and guests alike.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <LockKeyhole size={18} />
            </span>
            <h3>Private shared record</h3>
            <p>One quiet space for expectations and notes, fully private.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <ReceiptText size={18} />
            </span>
            <h3>Shared contributions</h3>
            <p>Track shared costs and gifts without awkwardness or stress.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <h3>Chore flow</h3>
            <p>Agree on tasks so everyone feels respected and capable.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <Megaphone size={18} />
            </span>
            <h3>House announcements</h3>
            <p>Share updates gently in a warm, welcoming tone.</p>
          </article>

          <article>
            <span className="v21-step-icon" aria-hidden="true">
              <MessageCircle size={18} />
            </span>
            <h3>Check-ins</h3>
            <p>Stay connected with relaxed updates that ease coordination.</p>
          </article>
        </div>

        <p className="v21-feature-disclaimer">
          Contributions are shared records. Kouchd does not collect, hold, transfer, or process payments.
        </p>
      </section>

      {/* Bottom CTA Section */}
      <section className="v21-cta" aria-labelledby="v21-cta-title">
        <Sparkles size={52} className="v21-cta-sparkle" aria-hidden="true" />
        <KouchdWordmark size="md" theme="cream" />
        <h2 id="v21-cta-title">Start your next stay on the same page.</h2>
        <p>Set up a stay, share the details, and keep records and chores together.</p>
        <StartButton hasClerk={hasClerk} />
      </section>

      <MarketingFooter hasClerk={hasClerk} />
    </main>
  );
}
