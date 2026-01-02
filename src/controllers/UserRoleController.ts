import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { UserRole } from '@models'

export class UserRoleController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await UserRole.query().with(['role', 'user'])
            .apply(UserRole.search(c.getQuery.search, ['name']))
            .apply(UserRole.filter(JSON.parse(c.getQuery.filter)))
            .apply(UserRole.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<UserRole>({{
  "user_id": ["required","number"],
  "role_id": ["required","number"]
}})

        const trx = await db.beginTransaction()
        
        const record = new UserRole().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserRole")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await UserRole.query().apply(UserRole.findOrNotFound(c.params.id))

        c.validation<UserRole>({{
  "user_id": ["required","number"],
  "role_id": ["required","number"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create UserRole")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await UserRole.query().apply(UserRole.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete UserRole")
        }

        c.responseSuccess(record.toJSON())
    }
}