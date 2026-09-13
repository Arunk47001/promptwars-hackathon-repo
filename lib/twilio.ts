import twilio from "twilio";

/**
 * Twilio webhook helpers (C5). Validates the request signature when
 * TWILIO_VALIDATE_SIGNATURE=true (production/deployed environments);
 * skipped by default in local dev so the routes can be exercised with a
 * plain curl/Postman POST per the task's acceptance criteria without a
 * real Twilio signature.
 */
export function shouldValidateSignature(): boolean {
  return process.env.TWILIO_VALIDATE_SIGNATURE === "true";
}

export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!shouldValidateSignature()) return true;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

/** Parses a Twilio webhook's application/x-www-form-urlencoded body. */
export async function parseTwilioFormBody(
  request: Request
): Promise<Record<string, string>> {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export function twimlResponse(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
        message
      )}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
