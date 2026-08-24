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

export async function sendTransactionalEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      reason: "Missing RESEND_API_KEY or EMAIL_FROM.",
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
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
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
