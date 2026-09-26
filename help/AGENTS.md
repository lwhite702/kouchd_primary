# Kouchd Help Center instructions

Read the repository-root `AGENTS.md` first. These instructions apply to the public Mintlify pages in this directory.

## Source and configuration

- Write public pages as MDX in `help/` with YAML frontmatter.
- The Mintlify site is configured by the repository-root `docs.json`. Keep navigation identifiers aligned with the page paths under `help/`.
- The root `.mintignore` keeps application code and `docs/` internal. Do not add internal notes, issue identifiers, commit hashes, provider setup instructions, private household data, or unverified operational details to public pages.
- `help/docs.json` is a legacy ignored file; do not treat it as the live configuration.
- Use the Mintlify MCP for read/search or content edits when an authenticated write operation is available. If no write operation is available, edit the checked-in source and validate locally. Do not publish from the Mintlify dashboard as a substitute.

## Kouchd terms and voice

- Use **host** for the person managing a stay, **guest** for the person joining it, **stay** for the shared living arrangement, and **contribution** for a payment or other agreed credit recorded in Kouchd.
- Call the financial record **Contributions** when referring to the current app label; use “record” or “ledger” in explanatory text as needed.
- Use active voice, second person, sentence-case headings, and concise steps. Keep the voice warm, clear, and plainspoken. Explain unfamiliar terms in everyday language.
- Keep the brand welcoming and homey while explaining the product directly. Use Manrope in brand/web design; use platform-native navigation and controls in iOS/Android concepts. Visual direction should favor soft curves, lived-in warmth, cream, forest green, and restrained lime.
- Avoid hype, pressure, corporate jargon, shame, fabricated testimonials, and debt-collection language. Respect guests as people sharing a home, not as balances to collect.
- Bold exact UI labels. Use code formatting only for literal codes or technical values the reader must enter.

## Accuracy and privacy

- Verify UI labels and behavior in current source before writing a step. Distinguish committed code from branch-only work and shipped behavior.
- Kouchd records agreements and contributions. It does not collect, hold, transfer, process, or enforce payments.
- Do not say that a contribution entry proves a payment cleared. Hosts can review records for their stays; guests see their own individual financial details.
- SMS is optional and requires explicit opt-in. Preserve required consent, rates, frequency, STOP, HELP, and privacy disclosures.
- Do not invent testimonials, prices, availability, delivery guarantees, legal advice, or release dates. Mark approved but unreleased features as in development on the roadmap, not as current help instructions.
- Use synthetic examples only. Do not expose real names, phone numbers, invitation links, balances, or household details.

## Product updates

- Keep the public changelog limited to verified releases. Do not list branch-only work as shipped.
- Keep the roadmap honest: state only approved or demonstrably active work, avoid dates unless explicitly approved, and note that plans can change.
- Maintain the internal change log and handoff under `docs/internal/`; do not expose these in public navigation.
- Validate navigation and links after editing. Prefer `mintlify validate` and `mintlify broken-links` when the CLI is available, then run appropriate repository checks.
- Treat checked-in `help/` pages and root `docs.json` as the editing source. Review page paths, frontmatter, internal/external links, and preview output before requesting a public publish.
- Keep the repository-root `index.mdx` populated with the content for the actual Mintlify root route; do not leave the starter Introduction template as the help center homepage.
- In handoff notes, record the exact commit, validation results, preview URL if available, pages changed, remaining caveats, and publish status. Never imply a local edit changed the live help center.
