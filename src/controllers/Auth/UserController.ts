import type { ControllerContext } from "elysia"
import { db, permission } from '@utils'
import { User } from "@models"

export const UserPermission = permission.register({
  "100": {
    name: "User Management",
    accesses: {
      "01": "View",
      "02": "create",
      "03": "update",
      "04": "delete",
    }
  },
})

export class UserController {
  // ========================================>
  // ## Display a listing of the resource.
  // ========================================>
  static async index(c: ControllerContext) {    
    // const record = await User.query().search("sadsa");
    const users = await User.query().resolve(c);
    // const q = User.query();

    // console.log(q.toQuery()); // DEBUG SQL

    // const records = await q; // EKSEKUSI
    // return records;
    // return record;
    // c.responseSuccess(record)
    // c.responseData(record)
    c.responseData(users.data, users.total)
  }

  // =============================================>
  // ## Store a newly created resource.
  // =============================================>
  static async store(c: ControllerContext) {
    
    c.validation({
        name   :  "required",
        email  :  "required",
    })

    // const trx = await db.beginTransaction()
    let record = new User();
    
    try {
      // record = await new User().pump(c.body as Record<string, any>, { trx })            
    } catch (err) {
      // await trx.rollback()
      c.responseError(err as Error, "Create User")
    }

    // await trx.commit()

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
    
    // const trx = await db.transaction()

    try {
        // record = await record.pump(c.body as Record<string, any>, { trx })
    } catch (err) {
        // await trx.rollback()
        c.responseError(err as Error, "Create User")
    }

    // await trx.commit()
    c.responseSaved(record)
  }


  // ===============================================>
  // ## Remove the specified resource.
  // ===============================================>
  static async destroy(c: ControllerContext) {
    let record = await User.query().findOrNotFound(c.params.id)
    
    try {
        record = await record.delete()
    } catch (err) {
        c.responseError(err as Error, "Delete User")
    }

    c.responseSuccess(record)
  }
}