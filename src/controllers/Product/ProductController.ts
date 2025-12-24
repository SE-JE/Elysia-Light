import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { Product } from "@models"

export class ProductController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await Product.query().expand(["category", {"product_locations": q => q.limit(1) }, "product_locations.location", "profit"]).get()
        
        c.responseSuccess(record)
        // c.responseData(record.data, record.total)
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation({})

        const trx = await db.transaction()
        
        // const record = new Product().dumpField(c.body as Record<string, any>)

        try {
            // await new Product().pump({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Model")
        }

        await trx.commit()
        // c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        // const record = await Model.query().apply(Model.findOrNotFound(c.params.id))

        c.validation({})
        
        // const trx = await db.beginTransaction()
        
        // record.dumpField(c.body as Record<string, any>)

        try {
            // await record.save({ trx })
        } catch (err) {
            // await trx.rollback()
            c.responseError(err as Error, "Create Model")
        }
        
        // await trx.commit()
        // c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        // const record = await Model.query().apply(Model.findOrNotFound(c.params.id))
        
        try {
            // await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete Model")
        }

        // c.responseSuccess(record.toJSON())
    }
}