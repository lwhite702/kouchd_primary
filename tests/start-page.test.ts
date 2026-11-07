import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StartPage } from "@/components/start/start-page";
import { HELP_LINKS } from "@/lib/help-links";
import { guestJoinSignUpHref, JOIN_CODE_PARAM, readJoinCodeParam } from "@/lib/start/join-code";

const rootDir = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(rootDir, file), "utf8");

describe("signed-out Start page", () => {
  const html = renderToStaticMarkup(createElement(StartPage));

  it("renders one H1 with the Start page headline and both choices", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain("Your stay, in one place.");
    expect(html).toContain("Hosting someone?");
    expect(html).toContain("Invited to a stay?");
    expect(html).toContain("Start free as a host");
    expect(html).toContain("Kouchd records contributions. It never handles payments.");
  });

  it("links to sign-in, host sign-up, legal pages, SMS preferences, and the help center", () => {
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain('href="/sign-up"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/cookies"');
    expect(html).toContain('href="/sms-opt-in"');
    expect(html).toContain(`href="${HELP_LINKS.home}"`);
    expect(html).toContain("© 2026 Wrelik Brands LLC");
  });

  it("labels the invite code field and hides the illustrations from assistive technology", () => {
    const inputId = html.match(/<input[^>]*id="([^"]+)"/)?.[1];
    expect(inputId).toBeTruthy();
    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain(">Invite code</label>");
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("is the signed-out view of the client home shell", () => {
    const home = read("components/authenticated-home.tsx");
    expect(home).toContain('import { StartPage } from "@/components/start/start-page";');
    expect(home).toMatch(/<Show when="signed-out">\s*<StartPage \/>/);
    expect(home).not.toContain("LandingPage");
  });
});

describe("Start page invite code hand-off", () => {
  it("sends a valid code through sign-up back to the workspace join step", () => {
    const href = guestJoinSignUpHref(" kch-ab12cd ");
    expect(href).toBe(`/sign-up?redirect_url=${encodeURIComponent(`/?${JOIN_CODE_PARAM}=KCH-AB12CD`)}`);
  });

  it("keeps Clerk's fallback redirect without overriding an invite return URL", () => {
    const signUpPage = read("app/sign-up/[[...sign-up]]/page.tsx");
    expect(signUpPage).toContain('fallbackRedirectUrl="/"');
    expect(signUpPage).not.toContain("forceRedirectUrl=");
  });

  it("rejects codes that are not household codes", () => {
    expect(guestJoinSignUpHref("")).toBeNull();
    expect(guestJoinSignUpHref("ab")).toBeNull();
    expect(guestJoinSignUpHref("KCH-!!")).toBeNull();
  });

  it("reads only valid codes back from the return URL", () => {
    expect(readJoinCodeParam("?join=KCH-AB12CD")).toBe("KCH-AB12CD");
    expect(readJoinCodeParam("?join=kchab12cd")).toBe("KCH-AB12CD");
    expect(readJoinCodeParam("?join=x")).toBeNull();
    expect(readJoinCodeParam("?stayId=abc")).toBeNull();
  });

  it("pre-fills the existing joinWithCode card instead of adding a new join path", () => {
    const shell = read("components/workspace/account-shell.tsx");
    expect(shell).toContain("readJoinCodeParam(window.location.search)");
    expect(shell).toContain("initialCode={startJoinCode ?? undefined}");

    const card = read("components/referral/join-household.tsx");
    expect(card).toContain("useMutation(api.referral.joinWithCode)");
    expect(card).toContain('useState(initialCode ?? "")');

    const form = read("components/start/guest-join-form.tsx");
    expect(form).toContain("guestJoinSignUpHref(code)");
    expect(form).not.toMatch(/useMutation|fetch\(/);
  });
});
