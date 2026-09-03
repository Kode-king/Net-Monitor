import { withUser, withAdmin, ok } from "@/lib/api";
import {
  getAlertRecipients,
  setAlertRecipients,
  sendTestEmail,
} from "@/lib/mailer";

export async function GET() {
  return withUser(() =>
    ok({
      recipients: getAlertRecipients(),
      smtpHost: process.env.SMTP_HOST || null,
    })
  );
}

export async function PUT(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    setAlertRecipients(b.recipients ?? "");
    return ok({ ok: true, recipients: getAlertRecipients() });
  });
}

// POST = send a test email to the configured recipients
export async function POST() {
  return withAdmin(async () => {
    const res = await sendTestEmail();
    return ok(res);
  });
}
