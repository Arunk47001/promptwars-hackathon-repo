/**
 * Async processing queue (C5, C7). Backed by Upstash Redis (a simple list
 * used as a FIFO queue via RPUSH/LPOP), accessed over Upstash's HTTP REST
 * API so it works from Vercel serverless functions and from local dev
 * without a persistent TCP connection.
 *
 * NOT exercised against a real Upstash instance in this build session (no
 * UPSTASH_REDIS_REST_URL/TOKEN was provisioned in this environment) -
 * code-complete but unverified against the live service. The interface
 * below is deliberately small so tests and any Vercel-preview verification
 * can swap in a fake in-memory implementation (see tests/) without
 * changing caller code.
 */
import { Redis } from "@upstash/redis";

export interface IntakeJob {
  intakeId: string;
  channel: "voice" | "sms" | "whatsapp";
}

export interface Queue {
  enqueue(job: IntakeJob): Promise<string>;
  dequeue(): Promise<IntakeJob | null>;
  size(): Promise<number>;
}

const QUEUE_KEY = process.env.UPSTASH_QUEUE_NAME || "brics-intake-jobs";

export class UpstashQueue implements Queue {
  private redis: Redis;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
          "Copy .env.example to .env.local and set them (see README)."
      );
    }
    this.redis = new Redis({ url, token });
  }

  async enqueue(job: IntakeJob): Promise<string> {
    const jobId = `${job.intakeId}:${Date.now()}`;
    await this.redis.rpush(QUEUE_KEY, JSON.stringify({ ...job, jobId }));
    return jobId;
  }

  async dequeue(): Promise<IntakeJob | null> {
    const raw = await this.redis.lpop<string>(QUEUE_KEY);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as IntakeJob);
  }

  async size(): Promise<number> {
    return this.redis.llen(QUEUE_KEY);
  }
}

/** In-memory fake, used by tests and available for local dev without a real Upstash account. */
export class InMemoryQueue implements Queue {
  private items: Array<IntakeJob & { jobId: string }> = [];

  async enqueue(job: IntakeJob): Promise<string> {
    const jobId = `${job.intakeId}:${Date.now()}`;
    this.items.push({ ...job, jobId });
    return jobId;
  }

  async dequeue(): Promise<IntakeJob | null> {
    return this.items.shift() ?? null;
  }

  async size(): Promise<number> {
    return this.items.length;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __bricsQueue: Queue | undefined;
}

/**
 * Returns the shared queue instance. Uses the real Upstash-backed queue if
 * UPSTASH_REDIS_REST_URL/TOKEN are configured; otherwise falls back to the
 * in-memory queue so `next dev` still runs end-to-end locally without a
 * live Upstash account (useful for exercising the webhook/worker routes
 * before signing up for Upstash - the real instance is still required for
 * the "fully testable locally against a real free-tier instance" bar the
 * plan sets for D1/D3).
 */
export function getQueue(): Queue {
  if (!global.__bricsQueue) {
    const hasUpstashConfig =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    global.__bricsQueue = hasUpstashConfig ? new UpstashQueue() : new InMemoryQueue();
  }
  return global.__bricsQueue;
}
