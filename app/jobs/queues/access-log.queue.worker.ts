import { queue, da, AccessLog } from '@utils'

const ACCESS_LOG_QUEUE        =  process.env.ACCESS_LOG_QUEUE        || "access-log"
const ACCESS_LOG_TABLE        =  process.env.ACCESS_LOG_TABLE        || 'access_logs'
const ACCESS_LOG_CONCURRENCY  =  process.env.ACCESS_LOG_CONCURRENCY  || 500
const ACCESS_LOG_FLUSH        =  process.env.ACCESS_LOG_FLUSH        || 1000

let accessBuffer: AccessLog[] = []
let lastAccessFlush = Date.now()

export const accessLogQueueWorker = () => {
  queue.worker(ACCESS_LOG_QUEUE, async (payload) => {
      accessBuffer.push(payload as AccessLog)

      const now = Date.now()

      if (accessBuffer.length >= Number(ACCESS_LOG_CONCURRENCY) || now - lastAccessFlush >= Number(ACCESS_LOG_FLUSH)) {
        if (!accessBuffer.length) return

        const batch = accessBuffer
        accessBuffer = []
        lastAccessFlush = Date.now()

        await da.insert(ACCESS_LOG_TABLE, {
          values : batch,
          format : 'JSONEachRow'
        })
      }
    },
    { concurrency: 1, interval: 50 }
  )
}
