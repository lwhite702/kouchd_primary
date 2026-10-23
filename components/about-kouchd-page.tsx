import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, House, Users } from "lucide-react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import { MarketingHeader, MarketingStartButton } from "@/components/marketing/marketing-header";
import "./landing-v21.css";
import "./about-kouchd-page.css";

const values = [
  ["Your home, your boundaries.", "Hosts can explain what matters in their home, and guests can understand the expectations before they agree."],
  ["Fair doesn’t always mean equal.", "People may contribute in different ways. Clarity and mutual understanding matter."],
  ["Clear expectations make hard conversations easier.", "Writing down the details gives everyone a place to start."],
  ["Respect goes both ways.", "Hosts deserve comfort at home. Guests deserve to feel welcome and informed."],
  ["Shared living takes many forms.", "A short stay, a family arrangement, and a longer shared home can all need thoughtful coordination."],
  ["Keep it practical.", "Tools for home life should make everyday coordination simpler, not turn it into another job."],
];

const people = [
  { icon: House, title: "Hosts opening their doors", body: "Set out the stay details, share house information, and keep agreements, contribution records, and chores together." },
  { icon: HeartHandshake, title: "Guests finding their footing", body: "Understand the current expectations, find the details you need, and keep track of your own contribution records and responsibilities." },
  { icon: Users, title: "People sharing a home", body: "Keep the everyday parts of a stay easier to revisit, from house rules to chores and contribution records." },
];

export function AboutKouchdPage({ hasClerk }: { hasClerk: boolean }) {
  return (
    <main className="landing-v21 about-kouchd">
      <a className="marketing-skip-link" href="#about-story">Skip to our story</a>
      <MarketingHeader hasClerk={hasClerk} about />
      <section className="about-hero about-wrap" aria-labelledby="about-title">
        <div>
          <p className="v21-eyebrow">About Kouchd</p>
          <h1 id="about-title">Sharing a home should be easier.</h1>
          <p className="about-lede">Your space. Your people. Everyone on the same page.</p>
          <nav className="about-jump-links" aria-label="On this page"><a href="#about-mission">Our mission</a><a href="#about-values">What we believe</a></nav>
        </div>
        <div className="about-hero-art"><Image src="/landing-v21/room.svg" alt="A welcoming living room with a green sofa, a plant, and room to settle in" width={648} height={516} priority sizes="(max-width: 760px) 100vw, 45vw" /></div>
      </section>

      <section className="about-story about-section" id="about-story" aria-labelledby="about-story-title">
        <div className="about-wrap about-editorial">
          <p className="v21-eyebrow">About us</p>
          <div><h2 id="about-story-title">For the living arrangements that don’t fit neatly in a box.</h2>
            <p>Not every stay comes with a lease, a property manager, or a plan that covers every detail. A friend may need a place for a few weeks. A family member may need somewhere to land. Someone may be between homes or figuring out what comes next.</p>
            <p>Kouchd is built for these shared stays—and for the everyday details that come with them. Hosts and guests can review stay agreements, find house information, keep contribution records, and coordinate chores in one place.</p>
            <p>Sharing a home asks people to work through real questions: What did we agree to? Who is taking care of what? How should we record a contribution? Kouchd gives everyone a place to return to those details.</p>
            <p className="about-emphasis">We don’t tell people how to run their homes. We make practical tools for keeping a shared stay clear and manageable.</p>
          </div>
        </div>
      </section>

      <section className="about-why about-section" aria-labelledby="about-why-title">
        <div className="about-wrap"><p className="v21-eyebrow">Why we exist</p><h2 id="about-why-title">Because “make yourself at home” can get complicated.</h2>
          <div className="about-why-grid"><div className="about-everyday-words"><p>“Stay as long as you need.”</p><p>“Help out around the house.”</p><p>“We’ll work out the details later.”</p></div>
            <div><p>Those words can come from a generous place and still leave people unsure. What dates did we settle on? Which chores need doing? What contribution did we agree to? Is the stay changing?</p><p>Kouchd exists to make those details easier to talk through and keep in view. A shared record can help hosts and guests understand the arrangement and revisit it when plans change.</p><p>A home should still feel like a home. Clear expectations can help people share one with more confidence and consideration.</p></div>
          </div>
        </div>
      </section>

      <section className="about-mission about-section" id="about-mission" aria-labelledby="about-mission-title">
        <div className="about-wrap"><p className="v21-eyebrow">Our mission</p><h2 id="about-mission-title">Making shared living work better for everyone.</h2>
          <p className="about-mission-lede">Our mission is to make sharing a home easier, fairer, and less stressful for the people opening their doors and the people staying with them.</p>
          <div className="about-mission-detail"><p>We believe hosts deserve to feel comfortable in their homes, and guests deserve to feel welcome, respected, and informed. Kouchd helps both sides keep stay expectations, house details, contribution records, and responsibilities clear.</p><p>Helping someone out shouldn’t mean giving up your boundaries. Needing a place to stay shouldn’t mean being left to guess. Everyone deserves to know where they stand.</p></div>
        </div>
      </section>

      <section className="about-values about-section" id="about-values" aria-labelledby="about-values-title">
        <div className="about-wrap"><p className="v21-eyebrow">What we believe</p><h2 id="about-values-title">A few principles guide how we build.</h2>
          <ol className="about-values-grid">{values.map(([title, body], i) => <li key={title}><span className="about-value-number" aria-hidden="true">0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
        </div>
      </section>

      <section className="about-people about-section" aria-labelledby="about-people-title">
        <div className="about-wrap"><p className="v21-eyebrow">Who Kouchd is for</p><h2 id="about-people-title">Different situations. Same need for clarity.</h2>
          <div className="about-people-grid">{people.map(({ icon: Icon, title, body }) => <article key={title}><span className="about-person-icon"><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{body}</p></article>)}</div>
        </div>
      </section>

      <section className="about-vision about-section" aria-labelledby="about-vision-title">
        <div className="about-wrap about-editorial"><p className="v21-eyebrow">Our vision</p><div><h2 id="about-vision-title">A world where sharing space doesn’t mean sacrificing peace of mind.</h2>
          <p>We imagine a future where opening your home feels more manageable, temporary stays come with clearer expectations, and people can work through contributions and responsibilities with less confusion.</p><p>Hospitality and accountability can exist together. Guests can feel welcome while hosts keep the boundaries that make home feel like home.</p><p className="about-emphasis">Shared living works better when everyone knows where they stand.</p>
        </div></div>
      </section>

      <section className="v21-cta"><KouchdWordmark size="md" theme="cream" /><h2>Make sharing a home a little easier.</h2><p>Bring stay details, expectations, contributions, and chores together.</p><MarketingStartButton hasClerk={hasClerk} /></section>
      <footer className="v21-footer"><Link href="/" className="v21-footer-brand" aria-label="Kouchd home"><KouchdWordmark size="sm" /></Link><p>Your space. Your people. Everyone on the same page.</p><div><Link href="/">Home</Link><a href="https://help.kouchd.com" target="_blank" rel="noreferrer">Help center</a><a href="mailto:support@kouchd.com">Email support</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><small>© {new Date().getFullYear()} Wrelik Brands LLC · Kouchd records shared expectations; it does not replace applicable housing rights.</small></footer>
    </main>
  );
}
