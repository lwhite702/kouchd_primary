import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state">
      <p className="eyebrow">Wrong couch</p>
      <h1>That page is not here.</h1>
      <Link className="button primary button-link" href="/">Back to Kouchd</Link>
    </main>
  );
}
