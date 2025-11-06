import type { ControllerContext } from "elysia"
import { db } from '@utils'
import { User } from "@models"

export class UserController {
  // ========================================>
  // ## Display a listing of the resource.
  // ========================================>
  static async index(c: ControllerContext) {
    const users = await User.query().with(c.getQuery.expand)
        .search(c.getQuery.search, [], c.getQuery.searchable)
        .filter(c.getQuery.filter)
        .selects([], c.getQuery.selectable)
        .orderBy(c.getQuery.sortBy, c.getQuery.sortDirection)
        .paginate(1,c.getQuery.paginate)
    
    c.responseData(users.items().toJSON(), users.total())
  }


  // =============================================>
  // ## Store a newly created resource.
  // =============================================>
  static async store(c: ControllerContext) {
    c.validation({
        name   :  "required",
        email  :  "required",
    })

    const trx = await db.beginTransaction()
    let record = {};

    try {
      record = await new User().pump(c.body as Record<string, any>, { trx })            
    } catch (err) {
      await trx.rollback()
      c.responseError(err as Error, "Create User")
    }

    await trx.commit()

    c.responseSaved(record)
  }


  // ============================================>
  // ## Update the specified resource.
  // ============================================>
  static async update(c: ControllerContext) {
    let record = await User.query().findOrNotFound(c.params.id);

    c.validation({
        name   :  "required",
        email  :  "required",
    })
    
    const trx = await db.beginTransaction()

    try {
        record = await record.pump(c.body as Record<string, any>, { trx })
    } catch (err) {
        await trx.rollback()
        c.responseError(err as Error, "Create User")
    }

    await trx.commit()
    c.responseSaved(record)
  }


  // ===============================================>
  // ## Remove the specified resource.
  // ===============================================>
  static async destroy(c: ControllerContext) {
    const model = await User.query().findOrNotFound(c.params.id)
    
    try {
        await model.delete()
    } catch (err) {
        c.responseError(err as Error, "Delete User")
    }

    c.responseSuccess(model.toJSON())
  }
}