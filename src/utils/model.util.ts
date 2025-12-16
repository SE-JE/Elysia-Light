import { status } from "elysia"
import { Model as SutandoModel, ModelNotFoundError } from "sutando"


export interface ModelApplyOptions {
  parentTable  ?:  string;
  parentId     ?:  number | string;
  parentKey    ?:  string;
  trx          ?:  any;
}



export class Model extends SutandoModel {
  // ===============================>
  // ## Model: Move payload to fillable
  // ===============================>
  pumpFillable(
    payload  :  Record<string, any>       //? payload body
  ) {
    const fillable = (this as any).fillable || []
    
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
  const modelClass = this

  const query = origQuery.apply(modelClass, args)
  ;(query as any).$model = modelClass


  // =================================>
  // ## findOrNotFound()
  // =================================>
  if (!(query as any).findOrNotFound) {
    ;(query as any).findOrNotFound = async function (id: number | string) {
      try {
        return await this.findOrFail(id)
      } catch (error: any) {

        if (error instanceof ModelNotFoundError) throw status(404, { message: "Error: Record not found!" });

        throw error
      }
    }
  }


  // =================================>
  // ## firstOrNotFound()
  // =================================>
  if (!(query as any).firstOrNotFound) {
    ;(query as any).firstOrNotFound = async function () {
      try {
        const record = await this.first()

        if (!record) throw status(404, { message: "Error: Record not found!" });

        return record
      } catch (error: any) {
        throw error
      }
    }
  }


  // =================================>
  // ## search()
  // =================================>
  if (!(query as any).search) {
    ;(query as any).search = function (
      keyword     :  string,
      includes    :  string[] = [],
      searchable  :  string[] = []
    ) {
      const model = (this as any).$model
      if (!model) return this

      const instance           =  new model()
      const defaultSearchable  =  instance.searchable || []
      const mergedSearchable   =  searchable?.length ? searchable : [...defaultSearchable, ...includes]

      if (!keyword) return this

      this.where((q: any) => {
        mergedSearchable.forEach((column) => {
          if (column.includes(".")) {
            const [relation, col] = column.split(".")
            q.orWhereHas(relation, (rel: any) => rel.where(col, "ILIKE", `%${keyword}%`))
          } else {
            q.orWhere(column, "ILIKE", `%${keyword}%`)
          }
        })
      })

      return this
    }
  }


  // =================================>
  // ## filter()
  // =================================>
  if (!(query as any).filter) {
    ;(query as any).filter = function (filters?: Record<string, string>) {
      if (!filters) return this

      for (const [field, filter] of Object.entries(filters)) {
        const [type, value] = filter.split(":")
        if (!type || value === undefined) continue

        const applyWhere = (q: any, col: string) => {
          switch (type) {
            case "li": q.where(col, "ILIKE", `%${value}%`); break
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
  // ## selects()
  // =================================>
  if (!(query as any).selects) {
    ;(query as any).selects = function (
      selectableIncludes: string[]  =  [],
      selectable        : string[]  =  []
    ) {
      const model = (this as any).$model
      if (!model) return this

      const instance = new model()
      const defaultSelectable = instance.selectable || ["*"]

      this.select(selectable?.length ? selectable : [...defaultSelectable, ...selectableIncludes])

      return this
    }
  }


  // =================================>
  // ## sorts()
  // =================================>
  if (!(query as any).sorts) {
    ;(query as any).sorts = function (sorts?: string[]) {
      if (!Array.isArray(sorts) || sorts.length === 0) return this;

      sorts.forEach((sortExpr) => {
        if (typeof sortExpr !== "string") return;

        const parts = sortExpr.trim().split(/\s+/);
        const column = parts[0];
        const direction = (parts[1] || "asc").toLowerCase();

        if (!["asc", "desc"].includes(direction)) {
          this.orderBy(column, "asc");
        } else {
          this.orderBy(column, direction);
        }
      });

      return this;
    };
  }


  // =================================>
  // ## expand()
  // =================================>
  if (!(query as any).expand) {
    ;(query as any).expand = function (relations: string[] = []) {
      if (!Array.isArray(relations) || relations.length === 0) return this

      relations.forEach((entry) => {
        const [relation, cols] = entry.split(":")
        const columns = cols?.split(",").map((c) => c.trim())

        if (columns && columns.length > 0) {
          this.with(relation, (q: any) => q.select(columns))
        } else {
          this.with(relation)
        }
      })

      return this
    }
  }


  // =================================>
  // ## option()
  // =================================>
  if (!(query as any).option) {
    ;(query as any).option = async function (selectableOption?: string[]) {
      const modelClass = (this as any).$model;
      const q = this.clone();

      let defaultSelectable: string[] = [];
      if (modelClass) {
        const instance = new modelClass();
        defaultSelectable = instance.selectable || [];
      }

      let processedCols: string[] = [];

      if (!Array.isArray(selectableOption) || selectableOption.length === 0) {
        const labelCol = defaultSelectable.length > 0 ? defaultSelectable[0] : "name";

        processedCols = [`id as value`, `${labelCol} as label`];
      } else {
        processedCols = selectableOption.map((col, index) => {
          const hasAlias = /\s+as\s+/i.test(col);
          if (!hasAlias) {
            if (index === 0) return `${col} as value`;
            if (index === 1) return `${col} as label`;
          }
          return col;
        });
      }

      q.select(processedCols);

      return await q.get();
    };
  }


  // =================================>
  // ## paginateOrOption()
  // =================================>
  if (!(query as any).paginateOrOption) {
    ;(query as any).paginateOrOption = async function (
      page                =  1,
      limit               =  10,
      option                      ?:  string | boolean,
      selectableOption            ?:  string[],
    ) {
      const isOption = ["true", "1", "yes"].includes(String(option).toLowerCase());

      if (isOption) {
        const data = await this.option(selectableOption);
        return { data, total: data.length };
      }

      const result = await this.paginate(page, limit);
      return { data: result.items().toJSON(), total: result.total() };
    };
  }



  // =================================>
  // ## resolve()
  // =================================>
  if (!(query as any).resolve) {
    ;(query as any).resolve = async function (input: any = {}) {
      const gq = input?.getQuery ? input.getQuery : input
      const isOption = input?.headers?.["X-OPTIONS"] || gq?.isOption || false
      
      try {
        this.expand?.(gq.expand).search?.(gq.search, [], gq.searchable).filter?.(gq.filter).selects?.([], gq.selectable).sorts?.(gq.sort)

        if (isOption || gq.paginate) return await this.paginateOrOption?.(gq.page, gq.paginate, isOption, gq.selectableOption)

        const data = await this.get()
        return { data, total: data.length }
      } catch (error: any) {
        if (error instanceof ModelNotFoundError) throw status(404, { message: "Error: Record not found!", data: [] });

        throw status(500, { message: "Error: " + error })
      }
      
    }
  }


  return query
}