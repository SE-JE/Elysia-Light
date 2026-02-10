import { queue, da, ErrorLog } from '@utils'

const ERROR_LOG_QUEUE        =  process.env.ERROR_LOG_QUEUE        || "error-log"
const ACCESS_LOG_TABLE        =  process.env.ACCESS_LOG_TABLE      || 'error_logs'
const ERROR_LOG_CONCURRENCY  =  process.env.ERROR_LOG_CONCURRENCY  || 10
const ERROR_LOG_FLUSH        =  process.env.ERROR_LOG_FLUSH        || 200

let errorBuffer: ErrorLog[] = []
let lastErrorFlush = Date.now()

export const errorLogQueueWorker = () => {
  queue.worker(ERROR_LOG_QUEUE, async (payload) => {
      errorBuffer.push(payload as ErrorLog)

      const now = Date.now()

      if (errorBuffer.length >= Number(ERROR_LOG_CONCURRENCY) || now - lastErrorFlush >= Number(ERROR_LOG_FLUSH)) {
        if (!errorBuffer.length) return

        const batch = errorBuffer
        errorBuffer = []
        lastErrorFlush = Date.now()

        await da.insert(ACCESS_LOG_TABLE, {
          values : batch,
          format : 'JSONEachRow'
        })
      }
    },
    { concurrency: 1, interval: 50 }
  )
}
