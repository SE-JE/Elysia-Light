import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { UserMailToken } from '@models'

export class UserMailTokenController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await UserMailToken.query().with([])
            .apply(UserMailToken.search(c.getQuery.search, ['name']))
            .apply(UserMailToken.filter(JSON.parse(c.getQuery.filter)))
            .apply(UserMailToken.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<UserMailToken>({{
  "user_id": ["nullable","number"],
  "type": ["nullable","string","max:10"],
  "token": ["nullable","string","max:200"],
  "used_at": ["nullable"],
  "expired_at": ["nullable"]
}})

        const trx = await db.beginTransaction()
        
        const record = new UserMailToken().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserMailToken")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await UserMailToken.query().apply(UserMailToken.findOrNotFound(c.params.id))

        c.validation<UserMailToken>({{
  "user_id": ["nullable","number"],
  "type": ["nullable","string","max:10"],
  "token": ["nullable","string","max:200"],
  "used_at": ["nullable"],
  "expired_at": ["nullable"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserMailToken")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await UserMailToken.query().apply(UserMailToken.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete UserMailToken")
        }

        c.responseSuccess(record.toJSON())
    }
}