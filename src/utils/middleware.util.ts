import { Elysia, status } from 'elysia'
import { Auth, context, logger } from '@utils'

declare module "elysia" {
  interface Elysia {
    api(
      basePath: string,
      controller: {
        index    ?:  any
        store    ?:  any
        show     ?:  any
        update   ?:  any
        destroy  ?:  any
      }
    ): this
  }
}


const errors = {
  unauthorized: {
    status: 401,
    message: "Unauthorized!"
  },
  ratelimited: {
    status: 429,
    message: "Too many requests!"
  },
  notfound: {
    status: 404,
    message: "Endpoint not found!"
  },
  request: {
    status: 400,
    message: "Bad Request!"
  },
  error: {
    status: 500,
    message: "Endpoint not found!"
  }
} 


export const Middleware = {
  // =============================>
  // ## Middleware: Auth hand;er
  // =============================>
  Auth: (app: Elysia) => app.derive(async ({ request }) => {
      const authHeader = request.headers.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) return { user: null, permissions: [], token: null }

      const bearer = authHeader.substring(7).trim()
      const result = await Auth.verifyAccessToken(bearer, request)

      if (!result) return { user: null, permissions: [], token: null };

      return {
        user: result.user,
        permissions: result.permissions,
        token: result.token,
      }
  }),


  // =============================>
  // ## Middleware: Private hand;er
  // =============================>
  Private: (app: Elysia) => app.derive(async ({ user }: Record<string, any> | any) => {
      if (!user) {
        throw status(errors.unauthorized.status, { message: errors.unauthorized.message })
      }
  }),


  // =============================>
  // ## Middleware: Cors handler
  // =============================>
  Cors: (app: Elysia) => app.onRequest(({ request, set }) => {
      const origin                       = request.headers.get('origin') ?? ''
      let allowedOrigin: string          = '*'

      const originsConf = process.env.APP_CORS_ORIGINS || '*'

      if (originsConf !== '*') {
        try {
          const allowedOrigins = JSON.parse(originsConf)
          if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
              allowedOrigin = origin || ""
          }
        } catch (e) {
          const em = 'Cors Error: Failed to parse APP_CORS_ORIGINS, fallback to "*"'
          logger.error(em, { error: em })
          allowedOrigin = ''
        }
      }
      
      set.headers['Access-Control-Allow-Origin']      = allowedOrigin
      set.headers['Access-Control-Allow-Methods']     = process.env.APP_CORS_METHODS || 'GET, POST, PUT, DELETE, OPTIONS'
      set.headers['Access-Control-Allow-Headers']     = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-OPTIONS'
      set.headers['Access-Control-Allow-Credentials'] = 'true'

      if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, })
      }
  }),


  // =============================>
  // ## Middleware: Rate limiter handler
  // =============================>
  RateLimiter: (app: Elysia, options?: { windowMs?: number, max?: number }) => app.onRequest(({ request, set, store }) => {
    const max       =  options?.max      || ( process.env.APP_RATELIMIT_COUNTDOWN ? Number(process.env.APP_RATE_LIMIT)          :  60 )
    const windowMs  =  options?.windowMs || ( process.env.APP_RATELIMIT_COUNTDOWN ? Number(process.env.APP_RATELIMIT_COUNTDOWN) :  60_000 )

    const user    =  (store as any)?.user
    const key     =  getClientKey(request, user?.id)

    const now     =  Date.now()
    let   record  =  rateLimitStore.get(key)

    if (!record || record.expiresAt < now) {
      record = { count: 1, expiresAt: now + windowMs }
      rateLimitStore.set(key, record)
    } else {
      record.count++
    }

    set.headers['X-RateLimit-Limit']      =  String(max)
    set.headers['X-RateLimit-Remaining']  =  String(Math.max(0, max - record.count))
    set.headers['X-RateLimit-Reset']      =  String(record.expiresAt)

    if (record.count > max) throw status(errors.ratelimited.status, { message: errors.ratelimited.message });
  }),


  // =============================>
  // ## Middleware: Body parse handler
  // =============================>
  BodyParse: (app: Elysia) => app.state<{ rawBody?: any }>({}).onRequest(async ({ request, store }) => {
    const text = await request.clone().text();

    const contentType = request.headers.get("content-type") || "";
    let rawBody: any = {};

    try {
      if (contentType.includes("application/json")) {
        rawBody = text ? JSON.parse(text) : {};
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) bodyParseNestedSet(rawBody, key, value);
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.clone().formData();
        for (const [key, value] of formData.entries()) bodyParseNestedSet(rawBody, key, value);
      } else {
        rawBody = {};
      }
    } catch (e) {
      const em = e instanceof Error ? e.message : String(e)
      logger.error(`Body parse error: ${em}`, { error: em })
      rawBody = {};
      throw status(errors.request.status, { message: errors.request.message })
    }

    store.rawBody = rawBody;
  }).derive(({ store }) => {
    const payload = bodyParseKeyFormat(store.rawBody || {});
    return { payload };
  }),


  AccessLog: (app: Elysia) => app.state<{ startedAt?: number }>({}).onRequest(({ store }) => { store.startedAt = Date.now() }).onAfterResponse(({ request, set, store }) => {
      const method   =  request.method
      const url      =  new URL(request.url)
      const path     =  url.pathname
      const status   =  Number(set.status) ?? 200
      const latency  =  Date.now() - (store.startedAt ?? Date.now())
      const agent    =  request.headers.get("user-agent") || 'unknown'
      const ip       =  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip') || 'unknown'

      logger.info(`${method} : ${path} - ${status} - ${latency}ms - ${ip}]`)
      logger.access({ method, path, status, latency, ip, agent })
    }),


  // =============================>
  // ## Middleware: Error handler
  // =============================>
  ErrorHandler: (app: Elysia) => app.onError(({ code, set, error, request }) => {
    if (code === 'NOT_FOUND') {
      set.status = errors.notfound.status
      return { message:  errors.notfound.message }
    }

    if (code === 'INTERNAL_SERVER_ERROR') {
      set.status = errors.error.status
      const em = error.message
      const url = new URL(request.url)
      const path = url.pathname

      logger.error(`error: ${em}`, { error: em, reference: path })
      return { message: em }
    }
  }),

  Context: (app: Elysia) => app.derive(async ({ store }) => {
    const userId = (store as any)?.user?.id

    return context.run({
        userId,
      },() => ({})
    )
  }),
}



// =============================>
// ## Middleware: Body parse helpers
// =============================>
function bodyParseKeyFormat(input: any): any {
  if ( typeof input !== "object" || input === null || input instanceof File ) return input;

  if (Array.isArray(input)) return input.map(bodyParseKeyFormat)

  const result: any = {}
  for (const [key, value] of Object.entries(input)) {
    if (key.includes(".") || key.includes("[")) {
      bodyParseNestedSet(result, key, bodyParseKeyFormat(value))
    } else {
      result[key] = bodyParseKeyFormat(value)
    }
  }
  return result
}


function bodyParseNestedSet(obj: any, path: string, value: any) {
  const parts = bodyParsePathFormat(path);
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLast = i === parts.length - 1;

    if (isLast) {
      current[key] = bodyParseValueFormat(value);
    } else {
      if (!(key in current)) {
        const nextKey = parts[i + 1];
        current[key] = isNaN(Number(nextKey)) ? {} : [];
      }
      current = current[key];
    }
  }
}

function bodyParsePathFormat(path: string): string[] {
  return path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "").split(".");
}

function bodyParseValueFormat(value: any) {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(Number(value))) return Number(value);
  return value;
}



// =============================>
// ## Middleware: Rate Limiter Helpers
// =============================>
type RateLimitRecord = {
  count: number
  expiresAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

function getClientKey(request: Request, userId?: string | number) {
  if (userId) return `user:${userId}`

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip') || 'unknown'

  return `ip:${ip}`
}