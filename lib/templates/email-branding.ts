/**
 * Kouchd Brand Design System & Notification Email Templates
 *
 * Core brand palette:
 * - Forest Green: #184F3A (Primary brand tone, headings, buttons)
 * - Lime:         #DFF25E (High-energy accent, badge highlights)
 * - Paper:        #F5F0E8 (Warm canvas background)
 * - Surface:      #FFFDF8 (Pure card surfaces)
 * - Ink:          #17251F (High-contrast typography)
 * - Muted:        #59675F (Secondary body text and labels)
 * - Line:         #DED8CE (Subtle border dividers)
 * - Sage:         #E5EDDE (Soft highlight containers)
 */

export const BRAND_CONFIG = {
  name: "Kouchd",
  tagline: "A shared stay without the awkward spreadsheet.",
  websiteUrl: "https://kouchd.com",
  supportEmail: "hello@kouchd.com",
  colors: {
    forest: "#184F3A",
    lime: "#DFF25E",
    paper: "#F5F0E8",
    surface: "#FFFDF8",
    ink: "#17251F",
    muted: "#59675F",
    line: "#DED8CE",
    sage: "#E5EDDE",
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
};

/**
 * Base email layout wrapper matching Kouchd's brand identity.
 */
export function renderEmailLayout({
  preheader,
  eyebrow,
  title,
  bodyContent,
  ctaText,
  ctaUrl,
  footnote,
}: {
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const { forest, paper, surface, ink, muted, line } = BRAND_CONFIG.colors;
  const font = BRAND_CONFIG.typography.fontFamily;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${paper};font-family:${font};color:${ink};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Container Card -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${surface};border-radius:24px;border:1px solid ${line};box-shadow:0 12px 40px rgba(23,37,31,0.06);overflow:hidden;">
          <!-- Brand Header -->
          <tr>
            <td style="padding:32px 32px 24px 32px;border-bottom:1px solid ${line};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;">
                      <span style="font-size:24px;font-weight:800;letter-spacing:-0.04em;color:${forest};">kouchd</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              ${eyebrow ? `<div style="font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${muted};margin-bottom:8px;">${eyebrow}</div>` : ""}
              <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;line-height:1.25;letter-spacing:-0.03em;color:${forest};">${title}</h1>
              <div style="font-size:15px;line-height:1.6;color:${ink};margin-bottom:28px;">
                ${bodyContent}
              </div>

              ${ctaText && ctaUrl ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:14px;background-color:${forest};">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#faf7f0;border-top:1px solid ${line};font-size:12px;color:${muted};line-height:1.5;">
              ${footnote ? `<p style="margin:0 0 8px 0;">${footnote}</p>` : ""}
              <p style="margin:0;">
                Sent via <strong>Kouchd</strong> &middot; The shared living platform.
                <br>Adjust your reminder notifications anytime in your account settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Pre-compiled HTML Templates for Knock Workflows
 */
export const NOTIFICATION_TEMPLATES = {
  // 1. Guest Invitation
  guestInvitation: {
    workflowKey: "guest-invitation",
    subject: "{{ hostName }} invited you to join {{ stayName }} on Kouchd",
    generateHtml: () =>
      renderEmailLayout({
        preheader: "You have been invited to join a shared stay.",
        eyebrow: "Private Household Invitation",
        title: "You're invited to join {{ stayName }}",
        bodyContent: `
          <p style="margin:0 0 14px 0;"><strong>{{ hostName }}</strong> has created a shared household on Kouchd and sent you an invitation to join.</p>
          <p style="margin:0 0 14px 0;">On Kouchd, expectations, living boundaries, chore rotations, and ledger contributions are clear from day one—no awkward conversations or messy spreadsheets.</p>
          <div style="background-color:#f5f0e8;border-radius:14px;padding:14px 18px;margin:18px 0;border:1px dashed #ded8ce;">
            <p style="margin:0;font-size:13px;color:#59675f;"><strong>Important:</strong> This invitation link expires on {{ expiresAt }}.</p>
          </div>
        `,
        ctaText: "Review and Join Household",
        ctaUrl: "{{ inviteUrl }}",
        footnote: "If you weren't expecting this invitation, you can safely ignore this email.",
      }),
  },

  // 2. Payment Due Reminder
  paymentDueReminder: {
    workflowKey: "payment-due-reminder",
    subject: "Upcoming stay contribution due tomorrow ({{ stayName }})",
    generateHtml: () =>
      renderEmailLayout({
        preheader: "Your scheduled stay contribution is due tomorrow.",
        eyebrow: "Ledger Reminder",
        title: "Contribution due: {{ periodLabel }}",
        bodyContent: `
          <p style="margin:0 0 14px 0;">This is a friendly reminder that your scheduled contribution for <strong>{{ stayName }}</strong> is due tomorrow ({{ dueDate }}).</p>
          <div style="background-color:#eef6f0;border-radius:16px;padding:18px 20px;margin:18px 0;border:1px solid #b8d2c1;">
            <div style="font-size:12px;font-weight:700;color:#59675f;text-transform:uppercase;">Scheduled Obligation</div>
            <div style="font-size:26px;font-weight:800;color:#184F3A;margin:4px 0;">\${{ amountDue | divided_by: 100 }}</div>
            <div style="font-size:13px;color:#59675f;">Due date: {{ dueDate }}</div>
          </div>
          <p style="margin:0;">Have you completed any household chores or contributions? You can redeem your earned contribution points for instant credit toward your stay balance.</p>
        `,
        ctaText: "View Your Ledger",
        ctaUrl: "https://kouchd.com",
      }),
  },

  // 3. Ad-hoc Fee Posted
  adhocFeePosted: {
    workflowKey: "adhoc-fee-posted",
    subject: "New charge added for {{ feeTitle }} ({{ stayName }})",
    generateHtml: () =>
      renderEmailLayout({
        preheader: "A new expense has been recorded on your ledger.",
        eyebrow: "Household Expense",
        title: "New charge: {{ feeTitle }}",
        bodyContent: `
          <p style="margin:0 0 14px 0;"><strong>{{ hostName }}</strong> recorded a one-off charge to your private stay ledger for <strong>{{ feeTitle }}</strong>.</p>
          <div style="background-color:#f5f0e8;border-radius:16px;padding:18px 20px;margin:18px 0;border:1px solid #ded8ce;">
            <div style="font-size:12px;font-weight:700;color:#59675f;text-transform:uppercase;">Charge Amount</div>
            <div style="font-size:26px;font-weight:800;color:#184F3A;margin:4px 0;">\${{ amount | divided_by: 100 }}</div>
            <div style="font-size:13px;color:#59675f;">Due date: {{ dueDate }}</div>
          </div>
          <p style="margin:0;">Your stay record and ledger history remain completely private between you and your host.</p>
        `,
        ctaText: "View Charge Details",
        ctaUrl: "https://kouchd.com",
      }),
  },

  // 4. Check-in Reminder
  checkInReminder: {
    workflowKey: "check-in-reminder",
    subject: "Check-in reminder: {{ stayName }} is tomorrow",
    generateHtml: () =>
      renderEmailLayout({
        preheader: "Your scheduled check-in is tomorrow.",
        eyebrow: "Arrival Update",
        title: "Check-in scheduled for tomorrow",
        bodyContent: `
          <p style="margin:0 0 14px 0;">Your check-in date for <strong>{{ stayName }}</strong> with <strong>{{ hostName }}</strong> is tomorrow, <strong>{{ checkInDate }}</strong>.</p>
          <p style="margin:0;">Please review the agreed house rules, quiet hours, and check-in expectations beforehand so everyone is on the same page.</p>
        `,
        ctaText: "Open Household Agreement",
        ctaUrl: "https://kouchd.com",
      }),
  },

  // 5. Chore Reminder
  choreReminder: {
    workflowKey: "chore-reminder",
    subject: "Chore reminder: {{ choreTitle }} due today",
    generateHtml: () =>
      renderEmailLayout({
        preheader: "You have a chore scheduled for today.",
        eyebrow: "Household Coordination",
        title: "Chore due: {{ choreTitle }}",
        bodyContent: `
          <p style="margin:0 0 14px 0;">This is a quick reminder that <strong>{{ choreTitle }}</strong> is on the chore board for today ({{ dueDate }}).</p>
          <p style="margin:0;">Once completed, check it off on Kouchd to keep the household up to date.</p>
        `,
        ctaText: "Open Chore Board",
        ctaUrl: "https://kouchd.com",
      }),
  },
};
