import { status } from "elysia"
import { Model as SutandoModel, ModelNotFoundError } from "sutando"



export interface ModelApplyOptions {
  parentTable  ?:  string;
  parentId     ?:  number | string;
  parentKey    ?:  string;
  trx          ?:  any;
}



export class Model extends SutandoModel {
  // ============================>
  // ## Model: Exception find or fail
  // ============================>
  static findOrNotFound(
    id  :  number | string                  //? id of record
  ) {
    return async (query: any) => {
      try {
        return await query.findOrFail(id)
      } catch (error: any) {
        if (error instanceof ModelNotFoundError) {
          throw status(404, {
              message  :  "Error: Record not found!",
          })
        }
        throw error;
      }
    };
  }



  // =================================>
  // ## Model: Selectable column query
  // =================================>
  static selectableColumns(
    selectableIncludes: string[]  =  [],         //? when includes custom selectable
    selectable        : string[]  =  []          //? when custom selectable
  ) {
    return (query: any) => {
      const defaultSelectable  =  (this as any).selectable || ["*"]
      query.select(selectable?.length ? selectable : [...defaultSelectable, ...selectableIncludes])
      return query
    }
  }



  // ===============================>
  // ## Model: Search query
  // ===============================>
  static search(
    keyword              :  string,             //? keyword of search
    searchableIncludes   :  string[] = [],      //? when includes custom searchable
    searchable           :  string[] = []       //? when custom searchable
  ) {
    return (query: any) => {
      const defaultSearchable  =  (this as any).searchable || []
      const mergedSearchable   =  searchable?.length ? searchable : [...defaultSearchable, ...searchableIncludes]

      if (!keyword) return query

      query.where((q: any) => {
        mergedSearchable.forEach((column) => {
          if (column.includes(".")) {
            const [relation, col]  =  column.split(".")
            q.orWhereHas(relation, (rel: any) => rel.where(col, "ILIKE", `%${keyword}%`))
          } else {
            q.orWhere(column, "ILIKE", `%${keyword}%`)
          }
        })
      })

      return query
    }
  }



  // ==============================>
  // ## Model: Filter query
  // ==============================>
  static filter(
    filters  ?:  Record<string, string>     //? rules of filter
  ) {
    return (query: any) => {
      if (!filters) return query

      for (const [field, filter] of Object.entries(filters)) {
        const [type, value]  =  filter.split(":")
        if (!type || value === undefined) continue

        if (field.includes(".")) {
          const [relation, col]  =  field.split(".")
          switch (type) {
            case "eq"  :  
              query.whereHas(relation, (q: any) => q.where(col, value))
              break
            case "ne"  :  
              query.whereHas(relation, (q: any) => q.where(col, "!=", value))
              break
            case "in"  :  
              query.whereHas(relation, (q: any) => q.whereIn(col, value.split(",")))
              break
            case "ni"  :  
              query.whereHas(relation, (q: any) => q.whereNotIn(col, value.split(",")))
              break
            case "bw": {
              const [min, max]  =  value.split(",")
              query.whereHas(relation, (q: any) => q.whereBetween(col, [min, max]))
              break
            }
          }
        } else {
          switch (type) {
            case "eq"  :  
              query.where(field, value)
              break
            case "ne"  :  
              query.where(field, "!=", value)
              break
            case "in"  :  
              query.whereIn(field, value.split(","))
              break
            case "ni"  :  
              query.whereNotIn(field, value.split(",")) 
              break
            case "bw": {
              const [min, max]  =  value.split(",")
              query.whereBetween(field, [min, max])
              break
            }
          }
        }
      }

      return query
    }
  }



  // ===============================>
  // ## Model: Move payload to fillable
  // ===============================>
  pumpFillable(
    payload  :  Record<string, any>       //? payload body
  ) {
    const fillable = (this as any).fillable || []
    console.log((this as any).fillable);
    const filtered: Record<string, any>  =  {}

    for (const key of fillable) {
      if (payload[key] !== undefined) {
        filtered[key]  =  payload[key]
      }
    }
    
    this.fill(filtered)
    return this
  }



  // ===============================>
  // ## Model: Saved payload to database
  // ===============================>
  async pump(
    payload: Record<string, any>,                    //? payload body
    options: { trx?: any, isRoot?: boolean } = {}    //? pump options
  ): Promise<this> {
    const { trx: externalTrx } = options
    const isRoot = !externalTrx
    const trx = externalTrx || (await (this as any).getConnection().transaction())

    try {
      const fillable = (this as any).fillable || []
      const flatData: Record<string, any> = {}
      const nestedData: Record<string, any> = {}


      // ## saved from fillable
      for (const [key, value] of Object.entries(payload)) {
        if (fillable.includes(key)) {
          flatData[key] = value
        } else if (typeof value === 'object' && value !== null) {
          nestedData[key] = value
        }
      }

      this.fill(flatData)
      await (this as any).save({ client: trx })


      // ## relational handler
      for (const [key, value] of Object.entries(nestedData)) {
        const relation = (this as any).related?.(key)
        if (!relation) continue

        if (Array.isArray(value)) {
          const existing = await relation.query(trx).get()
          const existingIds = existing.map((e: any) => e.id)
          const payloadIds: number[] = []

          for (const item of value) {
            if (item.id) {
              const child = await relation.relatedModel().query(trx).find(item.id)
              if (child) {
                await child.dump(item, { trx })
                payloadIds.push(child.id)
              }
            } else {
              const child = new (relation.relatedModel())()
              await child.dump(item, { trx })
              payloadIds.push(child.id)
            }
          }

          const toDelete = existingIds.filter((id: number) => !payloadIds.includes(id))
          if (toDelete.length) await relation.relatedModel().query(trx).whereIn('id', toDelete).delete()
        } else {
          const relatedInstance = new (relation.relatedModel())()
          await relatedInstance.dump(value, { trx })
          await relation.save(relatedInstance)
        }
      }

      if (isRoot) await trx.commit()
      return this
    } catch (err) {
      if (isRoot) await trx.rollback()
      throw err
    }
  }
}



// ==============================>
// ## Model: Query
// ==============================>
const origQuery = SutandoModel.query

SutandoModel.query = function (...args: any) {

  const query = origQuery.apply(this, args)



  // =================================>
  // ## Model: findOrNotFound()
  // =================================>
  if (!(query as any).findOrNotFound) {
    ;(query as any).findOrNotFound = async function (
      id  :  number | string                               //? id of record
    ) {
      try {
        return await this.findOrFail(id)
      } catch (error: any) {
        if (error instanceof ModelNotFoundError) {
          throw status(404, { message: "Error: Record not found!" })
        }
        throw error
      }
    }
  }



  // =================================>
  // ## Model: search()
  // =================================>
  if (!(query as any).search) {
    ;(query as any).search = function (
      keyword             :  string,                      //? keyword of record
      includes            :  string[] = [],               //? searchable includes
      searchable          :  string[] = []                //? custom searchable 
    ) {
      const model              =  (this as any).$model
      const instance           =  new model()
      const defaultSearchable  =  instance.searchable || []
      const mergedSearchable   =  searchable?.length ? searchable : [...defaultSearchable, ...includes]

      if (!keyword) return this

      this.where((q: any) => {
        mergedSearchable.forEach((column) => {
          if (column.includes(".")) {
            const [relation, col] = column.split(".")
            q.orWhereHas(relation, (rel: any) =>
              rel.where(col, "ILIKE", `%${keyword}%`)
            )
          } else {
            q.orWhere(column, "ILIKE", `%${keyword}%`)
          }
        })
      })

      return this
    }
  }



  // =================================>
  // ## Model: filter()
  // =================================>
  if (!(query as any).filter) {
    ;(query as any).filter = function (filters?: Record<string, string>) {
      if (!filters) return this

      for (const [field, filter] of Object.entries(filters)) {
        const [type, value] = filter.split(":")
        if (!type || value === undefined) continue

        const applyWhere = (q: any, col: string) => {
          switch (type) {
            case "eq": q.where(col, value); break
            case "ne": q.where(col, "!=", value); break
            case "in": q.whereIn(col, value.split(",")); break
            case "ni": q.whereNotIn(col, value.split(",")); break
            case "bw": {
              const [min, max] = value.split(",")
              q.whereBetween(col, [min, max])
              break
            }
          }
        }

        if (field.includes(".")) {
          const [relation, col] = field.split(".")
          this.whereHas(relation, (q: any) => applyWhere(q, col))
        } else {
          applyWhere(this, field)
        }
      }

      return this
    }
  }



  // =================================>
  // ## Model: selects()
  // =================================>
  if (!(query as any).selects) {
    ;(query as any).selects = function (
      selectableIncludes: string[] = [],
      selectable: string[] = []
    ) {
      const model = (this as any).$model
      const instance = new model()
      const defaultSelectable = instance.selectable || ["*"]
      this.select(
        selectable?.length ? selectable : [...defaultSelectable, ...selectableIncludes]
      )
      return this
    }
  }

  return query
}