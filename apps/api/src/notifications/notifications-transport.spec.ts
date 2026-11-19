import { describe, it, expect, vi } from "vitest";
import { NotificationChannel, NotificationStatus } from "@dhruto/contracts";
import { NotificationsService } from "./notifications.service.js";

/**
 * Regression: outbox jobs can run before the producer's transaction commits.
 * transportNotification used to `return` when the row was missing, which
 * completed the job and left customer SMS PENDING forever.
 */
describe("NotificationsService transport reliability", () => {
  function make(rows: Array<Record<string, unknown>>) {
    const repo = {
      findOne: vi.fn(async ({ where: { id } }: { where: { id: string } }) => rows.find((r) => r.id === id) ?? null),
      find: vi.fn(async (_opts: { where: Record<string, { value: unknown }> }) => rows),
      save: vi.fn(async (r: unknown) => r),
    };
    const sms = { sendSms: vi.fn(async () => ({ success: true, provider: "test", providerMessageId: "p1", latencyMs: 1 })) };
    const service = new NotificationsService(repo as never, {} as never, sms as never, undefined, undefined, undefined);
    return { service, repo, sms };
  }

  it("throws (so the queue retries) when the notification row is not visible yet", async () => {
    const { service } = make([]);
    await expect(service.transportNotification("missing-id")).rejects.toThrow(/NOTIFICATION_NOT_VISIBLE/);
  });

  it("redispatches only recent stuck SMS within the sweep window", async () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const { service, repo, sms } = make([
      {
        id: "n1",
        channel: NotificationChannel.SMS,
        status: NotificationStatus.PENDING,
        recipientTarget: "01700000000",
        message: "hello",
        attemptCount: 0,
      },
    ]);
    const count = await service.redispatchStalePending(now);
    expect(count).toBe(1);
    expect(sms.sendSms).toHaveBeenCalledTimes(1);
    // The query bounds the window: >= 2 minutes old and <= 6 hours old.
    const where = repo.find.mock.calls[0]![0].where;
    const range = where.createdAt!.value as [Date, Date];
    expect(now.getTime() - range[0].getTime()).toBe(6 * 60 * 60 * 1000);
    expect(now.getTime() - range[1].getTime()).toBe(2 * 60 * 1000);
  });
});
