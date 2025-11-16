import { Elysia, status } from 'elysia'
import { Auth, logger } from '@utils'



export const Middleware = {
  // =============================>
  // ## Middleware: Auth hand;er
  // =============================>
  Auth: (app: Elysia) => app.derive(async ({ request }) => {
      const authHeader = request.headers.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw status(401, {
              message: "Unauthorized!"
          })
      }

      const bearer = authHeader.substring(7).trim()
      const result = await Auth.verifyAccessToken(bearer)

      if (!result || !result.user) {
          throw status(401, {
              message: "Unauthorized!"
          })
      }

      return {
          user: result.user
      }
  }),

  // =============================>
  // ## Middleware: Cors handler
  // =============================>
  Cors: (app: Elysia) => app.onRequest(({ request, set }) => {
      const origin                       = request.headers.get('origin') ?? ''
      let allowedOrigin: string          = '*'

      const originsConf = process.env.CORS_ORIGINS || '*'

      if (originsConf !== '*') {
          try {
              const allowedOrigins = JSON.parse(originsConf)

              if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
                  allowedOrigin = origin || ""
              }
          } catch (e) {
              logger.error('Error: Failed to parse CORS_ORIGINS, fallback to "*"')
              allowedOrigin = ''
          }
      }
      
      set.headers['Access-Control-Allow-Origin']      = allowedOrigin
      set.headers['Access-Control-Allow-Methods']     = process.env.CORS_METHODS || 'GET, POST, PUT, DELETE, OPTIONS'
      set.headers['Access-Control-Allow-Headers']     = 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      set.headers['Access-Control-Allow-Credentials'] = 'true'

      if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, })
      }
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
        for (const [key, value] of params.entries()) {
          bodyParseNestedSet(rawBody, key, value);
        }
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.clone().formData();
        for (const [key, value] of formData.entries()) {
          bodyParseNestedSet(rawBody, key, value);
        }
      } else {
        rawBody = {};
      }
    } catch (e) {
      logger.error("Body parse error:", e)
      rawBody = {};
    }

    store.rawBody = rawBody;
  })
  .derive(({ store }) => {
    const body = bodyParseKeyFormat(store.rawBody || {});
    return { body };
  })
}



// =============================>
// ## Middleware: Body parse helpers
// =============================>
function bodyParseKeyFormat(input: any): any {
  if (typeof input !== "object" || input === null) return input;

  if (Array.isArray(input)) return input.map(bodyParseKeyFormat);

  const result: any = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.includes(".") || key.includes("[")) {
      bodyParseNestedSet(result, key, bodyParseKeyFormat(value));
    } else {
      result[key] = bodyParseKeyFormat(value);
    }
  }
  return result;
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