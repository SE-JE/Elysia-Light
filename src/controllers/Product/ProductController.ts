import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { Product } from "@models"

export class ProductController {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await Product.query().resolve(c)
        
        c.responseData(record.data, record.total)
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation({})

        const trx = await db.transaction()

        let record =  new Product()

        try {
            record = await record.pump(c.body as Product)     
        } catch (err) {
            await trx.rollback()

            c.responseError(err as Error, "Create Model")
        }

        await trx.commit()

        c.responseSaved(record)
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