import { ingestSubmission } from "@/lib/intake";
import {
  parseTwilioFormBody,
  twimlResponse,
  validateTwilioSignature
} from "@/lib/twilio";

export const runtime = "nodejs";

/**
 * Twilio WhatsApp inbound webhook (C5). Configure as the "When a message
 * comes in" webhook for the WhatsApp sandbox/number. Twilio POSTs
 * form-encoded params including `Body`, `From` (format `whatsapp:+91...`),
 * `MessageSid`, and - if the citizen shares a location pin -
 * `Latitude`/`Longitude`.
 */
export async function POST(request: Request) {
  const params = await parseTwilioFormBody(request);

  const signature = request.headers.get("X-Twilio-Signature");
  const publicUrl = `${process.env.PUBLIC_BASE_URL ?? ""}/api/webhooks/whatsapp`;
  if (!validateTwilioSignature(signature, publicUrl, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  const phoneNumber = params.From;
  const body = params.Body;

  if (!phoneNumber) {
    return twimlResponse();
  }

  const preciseLat = params.Latitude ? Number(params.Latitude) : undefined;
  const preciseLng = params.Longitude ? Number(params.Longitude) : undefined;

  try {
    await ingestSubmission({
      channel: "whatsapp",
      phoneNumber,
      rawPayload: params,
      rawText: body,
      preciseLat,
      preciseLng
    });
  } catch (err) {
    console.error("whatsapp webhook ingestion failed:", err);
  }

  return twimlResponse();
}
