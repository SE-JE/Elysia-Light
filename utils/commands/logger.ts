import fs from 'fs';
import path from 'path';
import { daClient, queue, redis } from '@utils';



type LogType = "start" | "info" | "error" | "warning" | "cron" | "queue" | "queueError" | "cronError" | "socket" | "socketError";

export interface AccessLog {
  method    :  string
  path      :  string
  status    :  number
  latency   :  number
  ip       ?:  string | null
  agent    ?:  string | null
  at       ?:  string
}

export interface ErrorLog {
  service    ?:  string
  key        ?:  string
  feature    ?:  string
  error       :  string | null
  reference  ?:  string | null
  at         ?:  string
}




const colors: Record<LogType | "default", string> = {
  default      :  "\x1b[0m",      // default
  start        :  "\x1b[32m",     // green
  info         :  "\x1b[36m",     // cyan
  error        :  "\x1b[31m",     // red
  warning      :  "\x1b[33m",     // yellow
  queue        :  "\x1b[34m",     // blue
  queueError   :  "\x1b[31m",     // red
  cron         :  "\x1b[35m",     // magenta
  cronError    :  "\x1b[31m",     // red
  socket       :  "\x1b[35m",     // blue
  socketError  :  "\x1b[31m",     // red
};

const prefixes: Record<LogType, string> = {
  start        :  "START",
  info         :  "INFO",
  error        :  "ERROR",
  warning      :  "WARNING",
  cron         :  "CRON",
  queue        :  "QUEUE",
  socket       :  "SOCKET",
  queueError   :  "QUEUE ERROR",
  cronError    :  "CRON ERROR",
  socketError  :  "SOCKET ERROR",
};

function log(type: LogType, msg: string) {
  const color = colors[type];
  const prefix = prefixes[type];
  // eslint-disable-next-line no-console
  console.log(`${color}[${prefix}]${colors.default}`, msg);
}

export const logger = {
  start    :  (msg: string) => log("start", msg),
  info     :  (msg: string) => log("info", msg),
  warning  :  (msg: string) => log("warning", msg),
  queue    :  (msg: string) => log("queue", msg),
  cron     :  (msg: string) => log("cron", msg),
  socket   :  (msg: string) => log("socket", msg),

  access   :  (msg: AccessLog) => logAccess(msg),

  error: (msg: string, payload?: ErrorLog) => {
    log("error", msg)
    payload && logError({...payload, service: payload.service || 'app'})
  },
  queueError: (msg: string, payload?: ErrorLog) => {
    log("queueError", msg)
    payload && logError({...payload, service: payload.service || 'queue'})
  },
  cronError: (msg: string, payload?: ErrorLog) => {
    log("cronError", msg)
    payload && logError({...payload, service: payload.service || 'cron'})
  },
  socketError: (msg: string, payload?: ErrorLog) => {
    log("socketError", msg)
    payload && logError({...payload, service: payload.service || 'socket'})
  },
};





type DriverName = "file" | "da"


const ACCESS_LOG_DRIVER        =  process.env.ACCESS_LOG_DRIVER || "file"
const ACCESS_LOG_LOG_DIR       =  process.env.ACCESS_LOG_DIR || "storage/logs/access"
const ACCESS_LOG_QUEUE         =  process.env.ACCESS_LOG_QUEUE || "access-log"


const ERROR_LOG_DRIVER        = process.env.ERROR_LOG_DRIVER || "file"
const ERROR_LOG_LOG_DIR       = process.env.ERROR_LOG_DIR || "storage/logs/error"
const ERROR_LOG_QUEUE         = process.env.ERROR_LOG_QUEUE_PREFIX || "error-log"



// =====================
// ## Access Log Drivers
// =====================
const filePath = () => {
  const d = new Date().toISOString().slice(0, 10)
  return path.resolve( ACCESS_LOG_LOG_DIR, `access-${d}.log`)
}

const handlers: Record<DriverName, (log: AccessLog) => Promise<void>> = {
  file: async (log) => {
    const dir = path.resolve(ACCESS_LOG_LOG_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.appendFile(filePath(), JSON.stringify(log) + "\n", () => {})
  },
  da: async (log) => {
    try {
      await queue.add(ACCESS_LOG_QUEUE, log)
    } catch {}
  }
}

const activeDrivers: DriverName[] = (ACCESS_LOG_DRIVER).split(",").map(v => v.trim()).filter((v): v is DriverName => v in handlers)

function logAccess(payload: AccessLog) {
  for (const d of activeDrivers) {
    handlers[d](payload)
  }
}



// =====================
// ## Error Log Drivers
// =====================
const errorFilePath = () => {
  const d = new Date().toISOString().slice(0, 10)
  return path.resolve(ERROR_LOG_LOG_DIR, `error-${d}.log`)
}

const errorHandlers: Record<DriverName, (log: ErrorLog) => Promise<void>> = {
  file: async (log) => {
    const dir = path.resolve(ERROR_LOG_LOG_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.appendFile(errorFilePath(), JSON.stringify(log) + "\n", () => {});
  },
  da: async (log) => {
    try {
      await queue.add(ERROR_LOG_QUEUE, log)
    } catch {}
  }
}

const activeErrorDrivers: DriverName[] = ERROR_LOG_DRIVER.split(",").map(v => v.trim()).filter((v): v is DriverName => v in errorHandlers)

function logError(payload: ErrorLog) {
  for (const d of activeErrorDrivers) {
    errorHandlers[d](payload)
  }
}