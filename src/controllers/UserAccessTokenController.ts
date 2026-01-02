import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { UserAccessToken } from '@models'

export class UserAccessTokenController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await UserAccessToken.query().with([])
            .apply(UserAccessToken.search(c.getQuery.search, ['name']))
            .apply(UserAccessToken.filter(JSON.parse(c.getQuery.filter)))
            .apply(UserAccessToken.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<UserAccessToken>({{
  "user_id": ["nullable","number"],
  "agent": ["nullable","string","max:100"],
  "token": ["nullable","string","max:200"],
  "permissions": ["nullable"],
  "last_used_ip": ["nullable","string","max:100"],
  "last_used_at": ["nullable"],
  "expired_at": ["nullable"]
}})

        const trx = await db.beginTransaction()
        
        const record = new UserAccessToken().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserAccessToken")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await UserAccessToken.query().apply(UserAccessToken.findOrNotFound(c.params.id))

        c.validation<UserAccessToken>({{
  "user_id": ["nullable","number"],
  "agent": ["nullable","string","max:100"],
  "token": ["nullable","string","max:200"],
  "permissions": ["nullable"],
  "last_used_ip": ["nullable","string","max:100"],
  "last_used_at": ["nullable"],
  "expired_at": ["nullable"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserAccessToken")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await UserAccessToken.query().apply(UserAccessToken.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete UserAccessToken")
        }

        c.responseSuccess(record.toJSON())
    }
}