import crypto from 'crypto'
import { logger, redis } from "@utils"



export const queue = {
  // ===========================>
  // ## Queue: make redis key of job
  // ===========================>
  key : (name: string) => `queue:${name}`,



  // ===========================>
  // ## Queue: make redis key of job failed
  // ===========================>
  keyFailed : (name: string) => `queue-failed:${name}`,



  // ===========================>
  // ## Queue: add new job
  // ===========================>
  async add(name: string, jobPayload: any, uniq?: string) {
    const id = uniq ?? crypto.randomBytes(10).toString("hex");
    const payload = JSON.stringify({ id, payload: jobPayload });

    await redis.rpush(queue.key(name), payload);
    return id;
  },



  // ===========================>
  // ## Queue: add new job failed
  // ===========================>
  async addFailed(name: string, job: any, error: any) {
    const store = {
      id      : job.id,
      payload : job.payload,
      error   : error?.message || String(error),
      time    : new Date().toISOString(),
    };

    await redis.rpush(queue.keyFailed(name), JSON.stringify(store));
  },



  // ===========================>
  // ## Queue: pop job from redis
  // ===========================>
  async pop(name: string, direction: "front" | "back" = "front", timeout = 0) {
    const key = queue.key(name);
    const cmd = direction === "front" ? "blpop" : "brpop";

    const result = await (redis as any)[cmd](key, timeout);
    if (!result) return null;

    try {
      return JSON.parse(result[1]);
    } catch {
      return null;
    }
  },



  // ===========================>
  // ## Queue: job worker
  // ===========================>
  async worker(
    name: string,
    handler: (payload?: Record<string, any>, id?: string) => Promise<void>,
    opts?: {
      interval?: number;
      concurrency?: number;
      direction?: "front" | "back";
    }
  ) {
    const interval = opts?.interval ?? 100;
    const concurrency = opts?.concurrency ?? 1;
    const direction = opts?.direction ?? "front";

    const loop = async () => {
      try {
        const tasks: Promise<void>[] = [];

        // ambil beberapa job sekaligus
        for (let i = 0; i < concurrency; i++) {
          const job = await queue.pop(name, direction, 1);
          if (!job) break;

          const task = (async () => {
            try {
              await handler(job.payload, job.id);
              logger.queue(`${name} ${job.id} success!`);
            } catch (err) {
              await queue.addFailed(name, job, err);
              logger.queueError(`${name} ${job.id} failed:`, err);
            }
          })();

          tasks.push(task);
        }

        if (tasks.length > 0) {
          await Promise.all(tasks);
        }
      } catch (err) {
        logger.queueError(`${name} error:`, err);
      }

      setTimeout(loop, interval);
    };

    loop();
  },



  // ===========================>
  // ## Queue: retry job failed
  // ===========================>
  async retry(name: string) {
    const failedKey = queue.keyFailed(name);
    const jobs = await redis.lrange(failedKey, 0, -1);
    if (jobs.length === 0) return 0;

    for (const j of jobs) {
      const job = JSON.parse(j);
      try {
        await queue.add(name, job.payload, job.id);
        logger.queue(`${name} ${job?.id} success!`);
      } catch (err) {
        logger.queueError(`${name} ${job?.id} error :`, err);
      }
    }

    await redis.del(failedKey);

    return jobs.length;
  },
}
