import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { Permission } from '@models'

export class PermissionController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await Permission.query().with([])
            .apply(Permission.search(c.getQuery.search, ['name']))
            .apply(Permission.filter(JSON.parse(c.getQuery.filter)))
            .apply(Permission.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<Permission>({{
  "user_id": ["nullable","number"],
  "role_id": ["nullable","number"],
  "permissions": ["nullable"]
}})

        const trx = await db.beginTransaction()
        
        const record = new Permission().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Permission")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await Permission.query().apply(Permission.findOrNotFound(c.params.id))

        c.validation<Permission>({{
  "user_id": ["nullable","number"],
  "role_id": ["nullable","number"],
  "permissions": ["nullable"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Permission")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await Permission.query().apply(Permission.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete Permission")
        }

        c.responseSuccess(record.toJSON())
    }
}