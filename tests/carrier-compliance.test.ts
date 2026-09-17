import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Carrier 10DLC & SMS compliance rules", () => {
  const rootDir = path.resolve(__dirname, "..");
  const privacyPath = path.join(rootDir, "app/privacy/page.tsx");
  const termsPath = path.join(rootDir, "app/terms/page.tsx");
  const smsOptInPath = path.join(rootDir, "app/sms-opt-in/page.tsx");
  const smsFormComponentPath = path.join(rootDir, "components/sms/sms-opt-in-form.tsx");
  const signUpPagePath = path.join(rootDir, "app/sign-up/[[...sign-up]]/page.tsx");
  const guestOnboardingPath = path.join(rootDir, "components/onboarding/guest-onboarding-flow.tsx");
  const hostOnboardingPath = path.join(rootDir, "components/onboarding/host-onboarding-wizard.tsx");
  const landingPagePath = path.join(rootDir, "components/landing-page.tsx");

  it("ensures Privacy Policy fulfills all carrier requirements", () => {
    expect(fs.existsSync(privacyPath)).toBe(true);
    const content = fs.readFileSync(privacyPath, "utf8");

    // 1. Title must be 'Privacy Policy'
    expect(content).toMatch(/title:\s*["']Privacy Policy \| Kouchd["']/);
    expect(content).toMatch(/<h1[^>]*>\s*Privacy Policy\s*<\/h1>/);

    // 2. Must describe what data you collect and how it is used
    expect(content).toMatch(/What Data We Collect/i);
    expect(content).toMatch(/How We Use Your Data/i);

    // 3. Must contain exact statement verbatim
    const exactRequiredStatement = "We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.";
    expect(content).toContain(exactRequiredStatement);

    // 4. Must mention registered Brand name
    expect(content).toContain("Wrelik Brands LLC");
  });

  it("ensures Terms & Conditions fulfills all carrier requirements", () => {
    expect(fs.existsSync(termsPath)).toBe(true);
    const content = fs.readFileSync(termsPath, "utf8");

    // 1. Title must be 'Terms & Conditions' or 'Terms of Service'
    expect(content).toMatch(/title:\s*["']Terms & Conditions \| Kouchd["']/);
    expect(content).toMatch(/<h1[^>]*>\s*Terms &amp; Conditions\s*<\/h1>/);

    // 2. Must include an SMS Terms section
    expect(content).toMatch(/SMS Terms &amp; Conditions|SMS Terms/i);

    // 3. Must include a 'message and data rates may apply' disclosure
    expect(content.toLowerCase()).toContain("message and data rates may apply");

    // 4. Must mention registered Brand name
    expect(content).toContain("Wrelik Brands LLC");

    // 5. Must link to Privacy Policy
    expect(content).toContain('href="/privacy"');
  });

  it("ensures standalone SMS opt-in acceptance form fulfills all carrier requirements", () => {
    expect(fs.existsSync(smsOptInPath)).toBe(true);
    expect(fs.existsSync(smsFormComponentPath)).toBe(true);
    const pageContent = fs.readFileSync(smsOptInPath, "utf8");
    const formContent = fs.readFileSync(smsFormComponentPath, "utf8");

    // Title / Header
    expect(pageContent).toContain("Text Message Opt-In & Acceptance Form");

    // Brand name
    expect(pageContent).toContain("Wrelik Brands LLC");
    expect(formContent).toContain("Wrelik Brands LLC");

    // Disclosure and links
    expect(formContent.toLowerCase()).toContain("message and data rates may apply");
    expect(formContent).toContain('href="/privacy"');
    expect(formContent).toContain('href="/terms"');
    expect(formContent).toContain("We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.");
    expect(formContent).toContain("type=\"tel\"");
    expect(formContent).toContain("type=\"checkbox\"");
  });

  it("ensures user registration and onboarding flows include SMS acceptance", () => {
    const signUpContent = fs.readFileSync(signUpPagePath, "utf8");
    expect(signUpContent).toContain("Wrelik Brands LLC");
    expect(signUpContent).toContain('href="/privacy"');
    expect(signUpContent).toContain('href="/terms"');
    expect(signUpContent.toLowerCase()).toContain("message and data rates may apply");

    const guestContent = fs.readFileSync(guestOnboardingPath, "utf8");
    expect(guestContent).toContain("Wrelik Brands LLC");
    expect(guestContent).toContain('href="/privacy"');
    expect(guestContent).toContain('href="/terms"');
    expect(guestContent.toLowerCase()).toContain("message and data rates may apply");

    const hostContent = fs.readFileSync(hostOnboardingPath, "utf8");
    expect(hostContent).toContain("Wrelik Brands LLC");
    expect(hostContent).toContain('href="/privacy"');
    expect(hostContent).toContain('href="/terms"');
    expect(hostContent.toLowerCase()).toContain("message and data rates may apply");
  });

  it("ensures landing page footer links to Privacy Policy, Terms, and SMS Acceptance", () => {
    const landingContent = fs.readFileSync(landingPagePath, "utf8");
    expect(landingContent).toContain('href="/privacy"');
    expect(landingContent).toContain('href="/terms"');
    expect(landingContent).toContain('href="/sms-opt-in"');
    expect(landingContent).toContain("Wrelik Brands LLC");
  });
});
