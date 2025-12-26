import { db, logger, queue, redis } from '@utils'



export type HandlerActivityAction  =  'create' | 'update' | 'delete' | string


type ActivityOptions = {
  action      :  HandlerActivityAction
  feature     :  string
  picks      ?:  string[]
  ignores    ?:  string[]
  getUserId  ?:  (ctx: any) => number | string | undefined
}



const  ACTIVITY_DRIVER             =  process.env.ACTIVITY_LOG_DRIVER   || 'DB'
const  ACTIVITY_DB_TABLE           =  process.env.ACTIVITY_LOG_DB_TABLE || 'activity_logs'
const  ACTIVITY_LOG_QUEUE          =  process.env.ACTIVITY_LOG_QUEUE    ||'activity-log'



export function activityLogger(base?: {
  feature?: string
  getUserId?: (c: any) => number | string | undefined
}) {
  const ctx: ActivityOptions = {
    feature    :  base?.feature || "",
    action     :  "",
    picks      :  undefined as string[] | undefined,
    ignores    :  undefined as string[] | undefined,
    getUserId  :  base?.getUserId,
  }

  return {
    feature(name: string) {
      ctx.feature = name
      return this
    },

    action(name: HandlerActivityAction) {
      ctx.action = name
      return this
    },

    pick(fields: string[]) {
      ctx.picks = fields
      return this
    },

    ignore(fields: string[]) {
      ctx.ignores = fields
      return this
    },

    track() {
      return createActivityMiddleware(ctx)
    }
  }
}

async function emitActivity(payload: {
  action      :  string
  feature     :  string
  user_id    ?:  number | string
  changes    ?:  {
    initial  ?:  Record<string, any>,
    final    ?:  Record<string, any>,
  }
}) {
  const activityPayload = { ...payload, at: new Date().toISOString() }

  if(ACTIVITY_DRIVER == "DA") {
    try {
      await queue.add(ACTIVITY_LOG_QUEUE, activityPayload)
    } catch (err) {
      const em = err instanceof Error ? err.message : String(err)
      logger.error(`Activity log error: ${em}`)
    }
  } else {
    try {
      await db.table(ACTIVITY_DB_TABLE).insert(activityPayload)
    } catch (err) {
      const em = err instanceof Error ? err.message : String(err)
      logger.error(`Activity log error: ${em}`)
    }
  }
}



function filterObject(
  obj: any,
  pick?: string[],
  ignore?: string[]
) {
  if (!obj || typeof obj !== 'object') return obj

  const result: any = {}
  const pickSet   = pick ? new Set(pick) : null
  const ignoreSet = new Set(ignore || [])

  for (const key of Object.keys(obj)) {
    if (ignoreSet.has(key)) continue
    if (pickSet && !pickSet.has(key)) continue
    result[key] = obj[key]
  }

  return Object.keys(result).length ? result : undefined
}


function createActivityMiddleware(config: ActivityOptions) {
  return async function (c: any, next: () => Promise<any>) {
    const reqBody = c.body
    const res     = await next()

    emitActivity({
      action     :  config.action,
      feature    :  config.feature,
      user_id    :  c.user?.id,
      changes    :  {
        initial  :  filterObject(reqBody, config.picks, config.ignores),
        final    :  filterObject(res, config.picks, config.ignores),
      },
    })

    return res
  }
}


