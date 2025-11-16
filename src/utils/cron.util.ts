import { logger } from "@utils"



export type CronJob = {
  name       :  string
  schedule   :  string
  handler    :  () => Promise<void> | void
  last      ?:  string | null
}

const jobs: CronJob[]  =  []
const interval         =  Number(process.env.CRON_INTERVAL) || 10000



export const cron = {
  // ===========================>
  // ## Cron: add new job
  // ===========================>
  add: (
    schedule   :  string,
    handler    :  CronJob["handler"],
    jobName   ?:  string
  ) => {
    const name = jobName || `Cronjob(${jobs.length + 1})`
    jobs.push({ name, schedule, handler, last: null })
  },



  // ===========================>
  // ## Cron: job worker
  // ===========================>
  worker: () => {
    setInterval(async () => {
      const now = new Date()

      const minuteKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ` + `${now.getHours()}:${now.getMinutes()}`

      for (const job of jobs) {
        if (!cron.isScheduleMatch(job.schedule, now)) continue

        if (job.last === minuteKey) continue

        job.last = minuteKey

        try {
          await job.handler()
          logger.cron(`${job.name} at (${now}) success!`)
        } catch (err) {
          logger.cronError(`${job.name} at (${now}) error`, err)
        }
      }
    }, interval)
  },



  // ===========================>
  // ## Cron: job schedule parser
  // ===========================>
  parseSchedule(value: number, pattern: string): boolean {
    if (pattern === "*") return true

    if (pattern.includes(",")) {
      return pattern.split(",").some((p) => this.parseSchedule(value, p))
    }

    if (pattern.includes("/")) {
      const [base, step] = pattern.split("/")
      const stepNum = Number(step)
      if (base === "*") return value % stepNum === 0
    }

    if (pattern.includes("-")) {
      const [start, end] = pattern.split("-").map(Number)
      return value >= start && value <= end
    }

    return Number(pattern) === value
  },



  // ===========================>
  // ## Cron: check job schedule
  // ===========================>
  isScheduleMatch(schedule: string, date: Date): boolean {
    const [min, hour, day, month, week] = schedule.split(" ")

    return (
      this.parseSchedule(date.getMinutes(), min) &&
      this.parseSchedule(date.getHours(), hour) &&
      this.parseSchedule(date.getDate(), day) &&
      this.parseSchedule(date.getMonth() + 1, month) &&
      this.parseSchedule(date.getDay(), week)
    )
  },
}
