import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { Product } from '@models'

export class product.controller {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        const record = await Product.query().with([])
            .apply(Product.search(c.getQuery.search, ['name']))
            .apply(Product.filter(JSON.parse(c.getQuery.filter)))
            .apply(Product.selectableColumns())
            .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
            .paginate(1,c.getQuery.paginate)
        
        c.responseData(record.items().toJSON(), record.total())
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        c.validation<Product>({{
  "name": ["required","string","max:200","max:200"],
  "price": ["required","min:1"],
  "description": ["nullable","string","max:200","max:200"]
}})

        const trx = await db.beginTransaction()
        
        const record = new Product().dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })            
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Product")
        }

        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        const record = await Product.query().apply(Product.findOrNotFound(c.params.id))

        c.validation<Product>({{
  "name": ["required","string","max:200","max:200"],
  "price": ["required","min:1"],
  "description": ["nullable","string","max:200","max:200"]
}})
        
        const trx = await db.beginTransaction()
        
        record.dumpField(c.body as Record<string, any>)

        try {
            await record.save({ trx })
        } catch (err) {
            await trx.rollback()
            c.responseError(err as Error, "Create Product")
        }
        
        await trx.commit()
        c.responseSaved(record.toJSON())
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        const record = await Product.query().apply(Product.findOrNotFound(c.params.id))
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete Product")
        }

        c.responseSuccess(record.toJSON())
    }
}