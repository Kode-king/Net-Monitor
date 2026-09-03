// Best-effort email notifications for critical alerts.
// SMTP connection comes from env; recipients are stored in the DB (settings page).
import nodemailer from "nodemailer";
import db from "./db.js";

let transporter;
let warnedMissing = false;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT) || 25;
  const secure = process.env.SMTP_SECURE === "1"; // true for 465
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    // upgrade with STARTTLS on submission ports (needed before AUTH on Exchange)
    requireTLS: !secure && port !== 25,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
    tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== "1" },
  });
  return transporter;
}

export function getAlertRecipients() {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'alert_email_to'").get();
  const raw = row?.value || process.env.ALERT_EMAIL_TO || "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function setAlertRecipients(list) {
  const value = (Array.isArray(list) ? list.join(", ") : String(list || "")).trim();
  db.prepare(
    "INSERT INTO meta (key, value) VALUES ('alert_email_to', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(value);
}

export function mailConfigured() {
  return !!process.env.SMTP_HOST && getAlertRecipients().length > 0;
}

export async function sendAlertEmail({ subject, text, html }) {
  const tx = getTransporter();
  const to = getAlertRecipients();
  if (!tx || to.length === 0) {
    if (!warnedMissing) {
      console.warn(
        "[mailer] email not sent — set SMTP_HOST in .env.local and recipients in Settings"
      );
      warnedMissing = true;
    }
    return { sent: false, reason: "not-configured" };
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "net-monitor@localhost",
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return { sent: true };
  } catch (e) {
    console.error("[mailer] send failed:", e?.message || e);
    return { sent: false, reason: String(e?.message || e) };
  }
}

// Send a test message to confirm the SMTP + recipients config works.
export async function sendTestEmail() {
  return sendAlertEmail({
    subject: "[net-monitor] رسالة اختبار / test message",
    text: "هذه رسالة اختبار من نظام مراقبة الشبكة.\nThis is a test message from the network monitoring system.",
  });
}
