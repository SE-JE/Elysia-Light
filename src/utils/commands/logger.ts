type LogType = "start" | "info" | "error" | "warning" | "cron" | "queue" | "queueError" | "cronError" | "socket" | "socketError";

const colors: Record<LogType | "default", string> = {
  default: "\x1b[0m",      // default
  start: "\x1b[32m",       // green
  info: "\x1b[36m",        // cyan
  error: "\x1b[31m",       // red
  warning: "\x1b[33m",     // yellow
  queue: "\x1b[34m",       // blue
  queueError: "\x1b[31m",  // red
  cron: "\x1b[35m",        // magenta
  cronError: "\x1b[31m",   // red
  socket: "\x1b[35m",      // blue
  socketError: "\x1b[31m", // red
};

const prefixes: Record<LogType, string> = {
  start: "START",
  info: "INFO",
  error: "ERROR",
  warning: "WARNING",
  cron: "CRON",
  queue: "QUEUE",
  socket: "SOCKET",
  queueError: "QUEUE ERROR",
  cronError: "CRON ERROR",
  socketError: "SOCKET ERROR",
};

function log(type: LogType, ...msg: unknown[]) {
  const color = colors[type];
  const prefix = prefixes[type];
  console.log(`${color}[${prefix}]${colors.default}`, ...msg);
}

export const logger = {
  start: (...msg: unknown[]) => log("start", ...msg),
  info: (...msg: unknown[]) => log("info", ...msg),
  error: (...msg: unknown[]) => log("error", ...msg),
  warning: (...msg: unknown[]) => log("warning", ...msg),
  queue: (...msg: unknown[]) => log("queue", ...msg),
  queueError: (...msg: unknown[]) => log("queueError", ...msg),
  cron: (...msg: unknown[]) => log("cron", ...msg),
  cronError: (...msg: unknown[]) => log("cronError", ...msg),
  socket: (...msg: unknown[]) => log("socket", ...msg),
  socketError: (...msg: unknown[]) => log("socketError", ...msg),
};
