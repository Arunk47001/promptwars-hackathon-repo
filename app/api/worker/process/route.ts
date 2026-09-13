import { getQueue } from "@/lib/queue";
import { processIntakeJob } from "@/lib/worker";

export const runtime = "nodejs";

/**
 * C7: queue-invoked async processing worker route.
 *
 * Two invocation styles are supported so this works with either a
 * push-based queue (e.g. QStash calling this URL with the job in the
 * body) or a poll/manual-trigger style (e.g. a cron hitting this route
 * with no body, which pops the next job off the Upstash Redis list queue
 * used by lib/queue.ts's default UpstashQueue/InMemoryQueue):
 *
 *   - POST with JSON body `{ "intakeId": "..." }` -> processes that job.
 *   - POST with empty body -> dequeues the next job from the queue (if any)
 *     and processes it.
 */
export async function POST(request: Request) {
  let intakeId: string | undefined;

  try {
    const body = await request.json();
    intakeId = body?.intakeId;
  } catch {
    // No/invalid JSON body - fall through to dequeue mode.
  }

  if (!intakeId) {
    const queue = getQueue();
    const job = await queue.dequeue();
    if (!job) {
      return Response.json({ status: "empty_queue" }, { status: 200 });
    }
    intakeId = job.intakeId;
  }

  const result = await processIntakeJob(intakeId);
  const httpStatus = result.status === "not_found" ? 404 : 200;
  return Response.json(result, { status: httpStatus });
}
