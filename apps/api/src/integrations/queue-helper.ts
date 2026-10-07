import { Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { getErrorMessage } from "../common/utils/error.util.js";

const logger = new Logger("QueueHelper");

/**
 * Enqueues a BullMQ job, falling back to inline execution when Redis is
 * unreachable (the local memory-fallback cache mode).
 *
 * The outbox remains the source of truth either way: the fan-out rows are
 * already persisted before this runs, so inline execution only affects
 * transport timing, never business correctness.
 */
export async function enqueueOrInline<T>(
  queue: Queue,
  name: string,
  data: T,
  jobOpts: { jobId?: string; attempts?: number; backoff?: { type: string; delay: number } },
  inlineFn: () => Promise<void>,
): Promise<{ mode: "queued" | "inline" }> {
  try {
    await queue.add(name, data, {
      attempts: jobOpts.attempts ?? 3,
      backoff: jobOpts.backoff ?? { type: "exponential", delay: 15000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
      ...(jobOpts.jobId ? { jobId: jobOpts.jobId } : {}),
    });
    return { mode: "queued" };
  } catch (error) {
    logger.warn(`Queue unavailable, executing inline: ${getErrorMessage(error, "queue error")}`);
    await inlineFn();
    return { mode: "inline" };
  }
}

/** Real BullMQ queue counters with a graceful degraded shape when Redis is down. */
export async function queueCounts(queue: Queue): Promise<{
  reachable: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
    return {
      reachable: true,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  } catch {
    return { reachable: false, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
}
