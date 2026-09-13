import { ingestSubmission } from "@/lib/intake";
import {
  parseTwilioFormBody,
  twimlResponse,
  validateTwilioSignature
} from "@/lib/twilio";

export const runtime = "nodejs";

/**
 * Twilio SMS inbound webhook (C5). Configure as the "A message comes in"
 * webhook on the Twilio SMS number. Twilio POSTs form-encoded params
 * including `Body`, `From`, `MessageSid`.
 */
export async function POST(request: Request) {
  const params = await parseTwilioFormBody(request);

  const signature = request.headers.get("X-Twilio-Signature");
  const publicUrl = `${process.env.PUBLIC_BASE_URL ?? ""}/api/webhooks/sms`;
  if (!validateTwilioSignature(signature, publicUrl, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  const phoneNumber = params.From;
  const body = params.Body;

  if (!phoneNumber || !body) {
    return twimlResponse();
  }

  try {
    await ingestSubmission({
      channel: "sms",
      phoneNumber,
      rawPayload: params,
      rawText: body
    });
  } catch (err) {
    console.error("sms webhook ingestion failed:", err);
  }

  return twimlResponse();
}
