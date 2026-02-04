/**
 * Email Service
 *
 * Sends transactional emails via Resend. If the RESEND_API_KEY
 * environment variable is not configured, all send methods log
 * a warning and return silently -- they never throw.
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const DEFAULT_BASE_URL = 'https://shared-todo-list-production.up.railway.app';
const FROM_ADDRESS = 'Bealer Agency <noreply@bealertodo.com>';

/**
 * Lazily initialised Resend client (returns null when no API key is configured).
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Resolve the public-facing base URL for links in emails.
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
}

/**
 * Send an agency invitation email.
 *
 * This function is designed to be fire-and-forget safe: it never throws.
 * If the RESEND_API_KEY is not configured it logs a warning and returns.
 *
 * @param to         Recipient email address
 * @param agencyName Display name of the inviting agency
 * @param inviteUrl  Full URL the recipient should visit to accept
 * @param role       Role being offered (e.g. "manager", "staff")
 */
export async function sendInvitationEmail(
  to: string,
  agencyName: string,
  inviteUrl: string,
  role: string,
): Promise<void> {
  const resend = getResendClient();

  if (!resend) {
    logger.warn('RESEND_API_KEY is not configured -- skipping invitation email', {
      component: 'email',
      action: 'sendInvitationEmail',
      metadata: { to, agencyName, role },
    });
    return;
  }

  try {
    const baseUrl = getBaseUrl();

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `You've been invited to join ${agencyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0033A0;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Bealer Agency Todo</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:18px;">You're invited!</h2>
            <p style="margin:0 0 16px;color:#4a4a4a;font-size:15px;line-height:1.6;">
              You've been invited to join <strong>${escapeHtml(agencyName)}</strong> as a <strong>${escapeHtml(role)}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.6;">
              Click the button below to accept the invitation and get started.
            </p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0"><tr><td style="background:#0033A0;border-radius:6px;">
              <a href="${escapeHtml(inviteUrl)}" target="_blank"
                 style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                Accept Invitation
              </a>
            </td></tr></table>
            <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${escapeHtml(inviteUrl)}" style="color:#0033A0;word-break:break-all;">${escapeHtml(inviteUrl)}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;">
              &copy; ${new Date().getFullYear()} Bealer Agency &middot;
              <a href="${escapeHtml(baseUrl)}" style="color:#999;">Visit app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    });

    logger.info('Invitation email sent', {
      component: 'email',
      action: 'sendInvitationEmail',
      metadata: { to, agencyName, role },
    });
  } catch (error) {
    logger.error('Failed to send invitation email', error, {
      component: 'email',
      action: 'sendInvitationEmail',
      metadata: { to, agencyName, role },
    });
  }
}

/**
 * Minimal HTML escaping for dynamic values injected into the email template.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
