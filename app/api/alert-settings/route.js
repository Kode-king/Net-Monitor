import { withUser, withAdmin, ok } from "@/lib/api";
import {
  getAlertRecipients,
  setAlertRecipients,
  sendTestEmail,
} from "@/lib/mailer";
import { getReportConfig, setReportConfig, sendReportNow } from "@/lib/report";

export async function GET() {
  return withUser(() =>
    ok({
      recipients: getAlertRecipients(),
      smtpHost: process.env.SMTP_HOST || null,
      report: getReportConfig(),
    })
  );
}

export async function PUT(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (b.recipients !== undefined) setAlertRecipients(b.recipients);
    if (b.report && typeof b.report === "object") setReportConfig(b.report);
    return ok({
      ok: true,
      recipients: getAlertRecipients(),
      report: getReportConfig(),
    });
  });
}

// POST { action: "test-email" | "send-report" }  (default: test-email)
export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    const res =
      b.action === "send-report" ? await sendReportNow() : await sendTestEmail();
    return ok(res);
  });
}
