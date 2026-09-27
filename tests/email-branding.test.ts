import { describe, expect, it } from "vitest";

import { NOTIFICATION_TEMPLATES } from "../lib/templates/email-branding";

describe("Kouchd guest invitation email", () => {
  it("uses the Kouchd brand and clearly explains the private invitation", () => {
    const template = NOTIFICATION_TEMPLATES.guestInvitation;
    const html = template.generateHtml();

    expect(template.subject).toContain("{{ hostName }}");
    expect(template.subject).toContain("Kouchd");
    expect(html).toContain("https://kouchd.com/brand/kouchd-icon.png");
    expect(html).toContain(">Kouchd</td>");
    expect(html).toContain("SHARED STAY");
    expect(html).toContain("MADE CLEAR");
    expect(html).toContain("#184F3A");
    expect(html).toContain("<strong>{{ hostName }}</strong> invited you to join their household");
    expect(html).toContain("{{ expiresAt }}");
    expect(html).toContain("{{ inviteUrl }}");
    expect(html).toContain("Review invitation");
    expect(html).toContain("does not send a text");
  });
});
