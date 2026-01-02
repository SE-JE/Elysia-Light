import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { Role } from '@models'

export class role.controller {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await Role.query().with([])
            .apply(Role.search(c.getQuery.search, ['name']))
            .apply(Role.filter(JSON.parse(c.getQuery.filter)))
            .apply(Role.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<Role>({{
  "name": ["required","string","max:5","min:1","max:25"]
}})

        const trx = await db.beginTransaction()
        
        const record = new Role().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Role")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await Role.query().apply(Role.findOrNotFound(c.params.id))

        c.validation<Role>({{
  "name": ["required","string","max:5","min:1","max:25"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Role")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await Role.query().apply(Role.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete Role")
        }

        c.responseSuccess(record.toJSON())
    }
}