import { beforeEach, describe, expect, it } from "vitest";
import { resolveJobsQueue, sendToCfQueue, setJobsQueueBinding } from "./cf-queues";
import { QUEUES } from "./queues";

describe("sendToCfQueue job id generation", () => {
  beforeEach(() => {
    setJobsQueueBinding(null);
  });

  it("generates unpredictable, non-colliding job ids", async () => {
    const sent: unknown[] = [];
    setJobsQueueBinding({
      send: async (body) => {
        sent.push(body);
      },
    });

    const idA = await sendToCfQueue(QUEUES.contentPublish, {
      contentPieceId: 1,
      userId: 1,
    } as never);
    const idB = await sendToCfQueue(QUEUES.contentPublish, {
      contentPieceId: 1,
      userId: 1,
    } as never);

    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    // Two job ids for the same queue, issued back to back, must differ: a
    // predictable id (e.g. queue name + millisecond timestamp) is the root
    // cause of the cross-tenant job-status leak this test guards against.
    expect(idA).not.toBe(idB);
    expect(idA).toMatch(/^cf:content-publish:[0-9a-f-]{36}$/);
    expect(idB).toMatch(/^cf:content-publish:[0-9a-f-]{36}$/);
  });

  it("throws when no queue binding is configured", async () => {
    setJobsQueueBinding(null);
    expect(resolveJobsQueue()).toBeNull();
    await expect(
      sendToCfQueue(QUEUES.contentPublish, { contentPieceId: 1, userId: 1 } as never),
    ).rejects.toThrow(/JOBS_QUEUE binding/);
  });
});
