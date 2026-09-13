import { ingestSubmission } from "@/lib/intake";
import {
  parseTwilioFormBody,
  twimlResponse,
  validateTwilioSignature
} from "@/lib/twilio";

export const runtime = "nodejs";

/**
 * Twilio Voice recording-complete webhook (C5). Configure this as the
 * `recordingStatusCallback` (or the action URL of a <Record> verb) on the
 * Twilio Voice number. Twilio POSTs form-encoded params including
 * `RecordingUrl`, `From`, `CallSid` once a recording is ready.
 *
 * Acks fast: persists the raw payload + audio reference to the intake
 * table and enqueues an async job; does not call Gemini synchronously.
 */
export async function POST(request: Request) {
  const params = await parseTwilioFormBody(request);

  const signature = request.headers.get("X-Twilio-Signature");
  const publicUrl = `${process.env.PUBLIC_BASE_URL ?? ""}/api/webhooks/voice`;
  if (!validateTwilioSignature(signature, publicUrl, params)) {
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  const phoneNumber = params.From;
  const recordingUrl = params.RecordingUrl;

  if (!phoneNumber || !recordingUrl) {
    return twimlResponse();
  }

  try {
    await ingestSubmission({
      channel: "voice",
      phoneNumber,
      rawPayload: params,
      audioUrl: recordingUrl
    });
  } catch (err) {
    console.error("voice webhook ingestion failed:", err);
    // Still ack Twilio - a failed ingest should not cause Twilio to retry
    // indefinitely; the failure is visible in server logs / DB status.
  }

  return twimlResponse();
}
