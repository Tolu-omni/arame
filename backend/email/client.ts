import nodemailer from "nodemailer";

type EmailPayload = {
  html: string;
  subject: string;
  text?: string;
  to: string | string[];
};

type EmailResult = {
  id?: string;
  reason?: string;
  sent: boolean;
};

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  if (configuredUrl.startsWith("http://") || configuredUrl.startsWith("https://")) {
    return configuredUrl.replace(/\/$/, "");
  }

  return `https://${configuredUrl.replace(/\/$/, "")}`;
}

function normalizeRecipients(to: string | string[]) {
  return Array.isArray(to) ? to : [to];
}

async function sendWithGmail(payload: EmailPayload, from: string): Promise<EmailResult> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    return {
      reason: "Missing GMAIL_USER or GMAIL_APP_PASSWORD.",
      sent: false,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      auth: {
        pass,
        user,
      },
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
    });

    const result = await transporter.sendMail({
      from,
      html: payload.html,
      subject: payload.subject,
      text: payload.text,
      to: normalizeRecipients(payload.to),
    });

    return { id: result.messageId, sent: true };
  } catch (error) {
    return {
      reason: error instanceof Error ? error.message : "Unable to send with Gmail SMTP.",
      sent: false,
    };
  }
}

async function sendWithResend(payload: EmailPayload, from: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      reason: "Missing RESEND_API_KEY.",
      sent: false,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: payload.html,
        subject: payload.subject,
        text: payload.text,
        to: normalizeRecipients(payload.to),
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!response.ok) {
      return {
        reason: data.message || `Resend returned HTTP ${response.status}.`,
        sent: false,
      };
    }

    return { id: data.id, sent: true };
  } catch (error) {
    return {
      reason: error instanceof Error ? error.message : "Unable to reach Resend.",
      sent: false,
    };
  }
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<EmailResult> {
  const gmailUser = process.env.GMAIL_USER;
  const from = process.env.EMAIL_FROM || (gmailUser ? `Arame <${gmailUser}>` : "");

  if (!from) {
    return {
      reason: "Missing EMAIL_FROM.",
      sent: false,
    };
  }

  if (gmailUser && process.env.GMAIL_APP_PASSWORD) {
    return sendWithGmail(payload, from);
  }

  if (process.env.RESEND_API_KEY) {
    return sendWithResend(payload, from);
  }

  return {
    reason: "Missing Gmail SMTP credentials or RESEND_API_KEY.",
    sent: false,
  };
}
