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
    const id = uniq ?? crypto.randomBytes(10).toString('hex')
    const payload = JSON.stringify({ id, payload: jobPayload })
    await redis.rpush(queue.key(name), payload)
    return id
  },



  // ===========================>
  // ## Queue: add new job failed
  // ===========================>
  async addFailed(name: string, job: any, error: any) {
    const store = {
      id      : job.id,
      payload : job.payload,
      error   : error?.message || String(error),
      time    : new Date().toISOString()
    }
    await redis.rpush(queue.keyFailed(name), JSON.stringify(store))
  },



  // ===========================>
  // ## Queue: pop job from redis
  // ===========================>
  async pop(name: string, timeout = 0): Promise<any | null> {
    const result = await redis.blpop(queue.key(name), timeout)
    if (!result) return null

    try {
      return JSON.parse(result[1])
    } catch {
      return null
    }
  },



  // ===========================>
  // ## Queue: job worker
  // ===========================>
  async worker(
    name: string,
    handler: (job?: Record<string, any>) => Promise<void>,
    opts?: { interval?: number }
  ) {
    const interval = opts?.interval ?? 100

    const loop = async () => {
      try {
        const job = await queue.pop(name, 1)
        if (job) {
          let jobPayload = job;

          try {
            await handler(job.payload)
            logger.queue(`${name} ${jobPayload?.id} success!`)
          } catch (err) {
            await queue.addFailed(name, jobPayload, err)
            logger.queueError(`${name} ${jobPayload?.id} failed:`, err)
          }
        }
      } catch (err) {
        logger.queueError(`${name} error:`, err)
      }

      setTimeout(loop, interval)
    }

    loop()
  },



  // ===========================>
  // ## Queue: retry job failed
  // ===========================>
  async retry(name: string) {
    const failedKey = queue.keyFailed(name)

    const jobs = await redis.lrange(failedKey, 0, -1)
    if (jobs.length === 0) return 0

    for (const j of jobs) {
      const job = JSON.parse(j)

      try {
        await queue.add(name, job.payload, job.id)
        logger.queue(`${name} ${job.payload?.id} success!`)
      } catch (err) {
        logger.queueError(`${name} ${job.payload?.id} error :`, err)
      }
    }

    await redis.del(failedKey)

    return jobs.length
  }
}
