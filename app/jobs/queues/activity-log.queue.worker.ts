import { queue, da } from '@utils'

const ACTIVITY_LOG_QUEUE        =  process.env.ACTIVITY_LOG_QUEUE     ||'activity-log'
const ACTIVITY_LOG_CONCURRENCY  =  process.env.ACCESS_LOG_CONCURRENCY || 500
const ACTIVITY_LOG_FLUSH        =  process.env.ACCESS_LOG_FLUS        || 2000
const ACTIVITY_LOG_DA_TABLE     =  process.env.ACTIVITY_LOG_DA_TABLE  || 'activity_logs'

let buffer: any[]  =  []
let lastFlush      =  Date.now()

export const activityLogQueueWorker = () => {
  queue.worker(ACTIVITY_LOG_QUEUE, async (payload) => {
      buffer.push(payload)

      const now = Date.now()
      if (buffer.length >= Number(ACTIVITY_LOG_CONCURRENCY) || now - lastFlush >= Number(ACTIVITY_LOG_FLUSH)) {
        if (!buffer.length) return

        const batch = buffer
        buffer = []
        lastFlush = Date.now()

        await da.insert(ACTIVITY_LOG_DA_TABLE, {
          values : batch,
          format : 'JSONEachRow'
        })
      }
    },
    { concurrency: 1, interval: 50 }
  )

}
