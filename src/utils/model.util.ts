import { status } from 'elysia'
import type { Knex } from 'knex'
import { conversion, db } from '@utils'



// ==========================
// ## Decorator Type
// ==========================
export const PRIMARY_KEY_META  =  Symbol('primary-key-meta')
export const FIELD_META        =  Symbol('field-meta')
export const RELATION_META     =  Symbol('relation-meta')
export const SOFT_DELETE_META  =  Symbol('soft-delete')
export const ATTRIBUTE_META    =  Symbol('attribute-meta')
export const FORMATTER_META    =  Symbol('formatter-meta')
export const SCOPE_META        =  Symbol('scope-meta')


// ==========================
// ## Field Decorator Type
// ==========================
export type FieldFlag = 'fillable' | 'selectable' | 'searchable' | 'hidden'
export type FieldMeta = {
  cast        ?:  ModelCastType
  fillable    ?:  boolean
  selectable  ?:  boolean
  searchable  ?:  boolean
  hidden      ?:  boolean
}


// ==========================
// ## Payload Type
// ==========================
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

type DataShape<T> = Pick<T, NonFunctionKeys<T>>

type ModelPayload<T> = Partial<DataShape<T>>


// ==========================
// ## Cast Type
// ==========================
export type ModelCastType = 'string' | 'number' | 'boolean' | 'date' | 'json'
const Casts               = {
  string    : {
    fromDB  :  (v: any) => v == null ? v  :  String(v),
    toDB    :  (v: any) => v,
  },
  number    : {
    fromDB  :  (v: any) => v == null ? v  :  Number(v),
    toDB    :  (v: any) => v,
  },
  boolean   : {
    fromDB  : (v: any) => Boolean(v),
    toDB    :   (v: any) => v ? 1 : 0,
  },
  date      : {
    fromDB  :  (v: any) => v ? new Date(v)                      :  null,
    toDB    :  (v: any) => v instanceof Date ? v.toISOString()  :  v,
  },
  json      : {
    fromDB: (v: any) => {
      if (typeof v !== 'string') return v

      try {
        return JSON.parse(v)
      } catch {
        return null
      }
    },
    toDB    :  (v: any) => JSON.stringify(v),
  },
}


// ==========================
// ## Relation Type
// ==========================
export type ModelRelationType        =  'hasMany' | 'hasOne' | 'belongsTo' | 'belongsToMany'
export type ModelRelationDescriptor  =  {
  type           :  ModelRelationType
  model          :  () => typeof Model
  foreignKey     :  string
  localKey       :  string
  pivotTable    ?:  string
  pivotLocal    ?:  string
  pivotForeign  ?:  string
  callback      ?:  (q: any) => void
}


// ==========================
// ## Hook type
// ==========================
export type ModelHookEventType    =  "before-create" | "after-create" | "before-update" | "after-update" | "before-delete" | "after-delete"
export type ModelHookFn           =  (ctx: ModelHookContextType) => any
export type ModelHookContextType<T extends Model = Model>  =  {
  model      :  T
  trx       ?:  any
  snapshot  ?:  any
}


// ==========================
// ## Aggregate type
// ==========================
type AggregateType = 'count' | 'sum' | 'avg' | 'min' | 'max'


// ==========================
// ## Scope type
// ==========================
export type ScopeType = {
  fn: Function
  mode: 'global' | 'internal'
}


// ==========================
// ## Override knex Query builder interface
// ==========================
declare module 'knex' {
  namespace Knex {
    interface QueryBuilder<TRecord = any, TResult = any> {
      $model?: any
      _withTree?: Record<string, any>
      _formatter?: ((item: any) => any) | null

      _softDeleteScope?: 'default' | 'with' | 'only'

      _withAggregates?: Array<{
        relation: string
        alias: string
        fn: 'count' | 'sum' | 'avg' | 'min' | 'max'
        column: string
        callback?: (q: any) => void
      }>

      _orderByAggregates?: Array<{
        relation: string
        alias?: string
        fn: 'count' | 'sum' | 'avg' | 'min' | 'max'
        column: string
        direction: 'asc' | 'desc'
        callback?: (q: any) => void
      }>
    }
  }
}

export interface ModelQueryBuilder<T extends Record<string, any> = Record<string, any> > extends Knex.QueryBuilder<T, T[]> {
  _withTree?: Record<string, any>
  _formatter?: ((item: T) => any) | null
  _softDeleteScope?: 'default' | 'with' | 'only'

  findOrNotFound(id: string | number): Promise<T>
  firstOrNotFound(): Promise<T>

  search(
    keyword?: string,
    options?: {
      includes?: string[]
      searchable?: string[]
    }
  ): this
  filter(filters?: Record<string, string>): this
  selects(options?: {
    includes?: string[]
    selectable?: string[]
  }): this
  sorts(sorts?: string[]): this

  with(relation: string, callback?: any): this
  expand(relations?: Array<string | Record<string, (q: any) => void>>): this

  whereHas(
    relation: string,
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this
  orWhereHas(
    relation: string,
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this
  whereDoesntHave(
    relation: string,
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this
  orWhereDoesntHave(
    relation: string,
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this

  withAggregate(
    expr: string,
    fn: 'count' | 'sum' | 'avg' | 'min' | 'max',
    column?: string,
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this
  orderByAggregate(
    expr: string,
    fn: 'count' | 'sum' | 'avg' | 'min' | 'max',
    column?: string,
    direction?: 'asc' | 'desc',
    callback?: (q: ModelQueryBuilder<any>) => void
  ): this


  get(): Promise<T[]>
  paginate(
    page?: number,
    limit?: number
  ): Promise<{ data: T[]; total: number }>
  option(selectableOption?: string[]): Promise<Array<{ value: any; label: any }>>
  paginateOrOption(
    page?: number,
    limit?: number,
    option?: string | boolean,
    selectableOption?: string[]
  ): Promise<{ data: any[]; total: number }>
  resolve(input?: any): Promise<{ data: T[]; total: number }>

  format(formatter: string | ((item: T) => any)): this

  withTrashed(): this
  onlyTrashed(): this
}



export abstract class Model {
  static table             :  string                           =  ""
  static primaryKey        :  string                           =  'id'
  static softDelete        :  boolean                          =  false
  static deletedAtColumn   :  string                           =  'deleted_at'
  
  protected _original      :  Record<string, any>              = {}
  protected _exists        :  boolean                          = false
  protected _trx          ?:  Knex.Transaction                 = undefined

  private static _hooks    :  Record<string,  ModelHookFn[]>   =  {}
  private _instanceHooks   :  Record<string, ModelHookFn[]>    =  {}
  private _disabledHooks                                       =  new Set<string>()


  // ==========================
  // ## Constructor model
  // ==========================
  constructor(data: Record<string, any> = {}) {
    Object.assign(this, data)

    if ((this as any)[(this.constructor as typeof Model).primaryKey]) this._exists = true
  }

  protected static newInstance<T extends typeof Model>(this: T): InstanceType<T> & Model {
    return new (this as any)()
  }


  // ==========================
  // ## Field
  // ==========================
  static [FIELD_META]     ?:  Record<string, any>

  static getDefaultFields(): Record<string, FieldMeta> {
    const pk = (this as any)[PRIMARY_KEY_META] ?? this.primaryKey ?? 'id'

    return {
      [pk]: {
        cast: 'number',
        selectable: true,
      },
      created_at: { cast: 'date' },
      updated_at: { cast: 'date' },
      deleted_at: { cast: 'date' },
    }
  }

  static get fields(): Record<string, FieldMeta> {
    const defaults = this.getDefaultFields?.() ?? {};

    return {...defaults,...(this[FIELD_META] ?? {})}
  }

  static get fillable() {
    return Object.entries(this.fields).filter(([, v]) => v.fillable).map(([k]) => k)
  }

  static get selectable() {
    return Object.entries(this.fields).filter(([, v]) => v.selectable).map(([k]) => k)
  }

  static get searchable() {
    return Object.entries(this.fields).filter(([, v]) => v.searchable).map(([k]) => k)
  }


  // ==========================
  // ## Table
  // ==========================
  static getTable(): string {
    if (this.table) return this.table

    return conversion.strPlural(conversion.strSnake(this.name))
  }


  // ==========================
  // ## Primary key
  // ==========================
  static getPrimaryKey(): string {
    return (this as any)[PRIMARY_KEY_META] ?? this.primaryKey ?? 'id'
  }


  // ==========================
  // ## Relation
  // ==========================
  static [RELATION_META]  ?:  Record<string, any>

  static get relations() {
    return this[RELATION_META] ?? {}
  }


  // ==========================
  // ## Attribute
  // ==========================
  static get attributes(): Record<string, Function> {
    return (this as any)[ATTRIBUTE_META] ?? {}
  }


  // ==========================
  // ## Formatter
  // ==========================
  static get formatters(): Record<string, Function> {
    return (this as any)[FORMATTER_META] ?? {}
  }


  // ==========================
  // ## Scope
  // ==========================
  static get scopes(): Record<string, ScopeType> {
    return (this as any)[SCOPE_META] ?? {}
  }


  // ==========================
  // ## Getter attribute
  // ==========================
  getOriginal(key?: string) {
    if (!key) return { ...this._original }

    return this._original[key]
  }

  getChanges() {
    const changes: Record<string, any> = {}
    for (const key in this._original) {
      if ((this as any)[key] != this._original[key]) {
        changes[key] = (this as any)[key]
      }
    }

    return changes
  }

  getPrevious() {
    const prev: Record<string, any> = {}
    for (const key in this._original) {
      if ((this as any)[key] != this._original[key]) {
        prev[key] = this._original[key]
      }
    }

    return prev
  }


  // ==========================
  // ## Query builder
  // ==========================
  static query<T extends Record<string, any> = Record<string, any>>(trx?: Knex | Knex.Transaction): ModelQueryBuilder<T> {
    const qb = (trx ?? db)(this.getTable())

    return extendModelQuery(qb, this) as ModelQueryBuilder<T>
  }


  // ==========================
  // ## Casting
  // ==========================
  castFromDB(row: Record<string, any>): this {
    const ctor = this.constructor as typeof Model
    const fields = ctor.fields

    for (const [key, value] of Object.entries(row)) {
      if (!fields[key]) continue
      const meta = fields[key]
      ;(this as any)[key] = meta.cast ? Casts[meta.cast].fromDB(value) : value
    }

    this._original = {}
    for (const key of Object.keys(fields)) {
      this._original[key] = (this as any)[key]
    }

    const attrs = ctor.attributes
    for (const [name, fn] of Object.entries(attrs)) {
      Object.defineProperty(this, name, {
        get: () => fn.call(this),
        enumerable: true,
      })
    }

    this._exists = true
    return this
  }


  castToDB() {
    const fields = (this.constructor as typeof Model).fields
    const data: Record<string, any> = {}

    for (const [key, meta] of Object.entries(fields)) {
      if (!meta.fillable) continue

      const val   =  (this as any)[key]

      if (val === undefined) continue

      data [key]  =  meta.cast ? Casts[meta.cast].toDB(val): val
    }

    return data
  }


  // ==========================
  // ## Dirty Field
  // ==========================
  getDirty(): Record<string, any> {
    const dirty: any = {}
    for (const key in this._original) {
      if (Object.is((this as any)[key], this._original[key])) continue
      dirty[key] = (this as any)[key]
    }

    return dirty
  }


  // ==========================
  // ## Hydration
  // ==========================
  static hydrate<T extends typeof Model>(
    this: T,
    rows: any[] | null | undefined
  ): InstanceType<T>[] {
    if (!rows || !Array.isArray(rows)) return []

    return rows.map(row => {
      if (row instanceof this) return row as InstanceType<T>

      const instance = this.newInstance()

      return instance.castFromDB(row) as InstanceType<T>
    })
  }


  // ==========================
  // ## Fill model from payload
  // ==========================
  fill<T extends this>(this: T, payload: ModelPayload<T>): T {
    const ctor = this.constructor as typeof Model
    const fields = ctor.fields

    for (const [key, value] of Object.entries(payload)) {
      const meta = fields[key]
      if (!meta || !meta.fillable) continue
      ;(this as any)[key] = value
    }

    return this
  }

  // ==========================
  // ## Create from fillable
  // ==========================
  static async create<T extends typeof Model>(
    this: T,
    payload: ModelPayload<InstanceType<T>>,
    trx?: Knex.Transaction
  ): Promise<InstanceType<T>> {

    const instance = this.newInstance() as InstanceType<T>

    instance.fill(payload)

    const data = instance.castToDB()

    await instance.runHook('before-create', { model: instance, trx })

    const conn = trx ?? db
    const [row] = await conn(this.getTable()).insert(data).returning('*')

    await instance.runHook('after-create', { model: instance, trx })

    return instance.castFromDB(row)
  }




  // ==========================
  // ## update from fillable
  // ==========================
  static async update<T extends typeof Model>(
    this: T,
    payload: ModelPayload<InstanceType<T>>,
    uniqueKeys: (keyof InstanceType<T> & string)[],
    trx?: Knex.Transaction
  ): Promise<InstanceType<T>> {

    if (!uniqueKeys.length) {
      throw new Error('updateByUnique requires uniqueKeys')
    }

    const instance = this.newInstance() as InstanceType<T>
    instance.fill(payload)

    const data = instance.castToDB()
    const where: Record<string, any> = {}

    for (const key of uniqueKeys) {
      if ((payload as any)[key] === undefined) {
        throw new Error(`Missing unique key: ${key}`)
      }
      where[key] = (payload as any)[key]
    }

    const conn = trx ?? db
    const [row] = await conn(this.getTable()).where(where).update(data).returning('*')

    if (!row) throw status(404, { message: 'Record not found' })

    return instance.castFromDB(row)
  }




  // ==========================
  // ## Update or insert from fillable
  // ==========================
  static async upsert<T extends typeof Model>(
    this: T,
    payload: ModelPayload<InstanceType<T>>,
    uniqueKeys: (keyof InstanceType<T> & string)[],
    trx?: Knex.Transaction
  ): Promise<InstanceType<T>> {

    const instance = this.newInstance() as InstanceType<T>

    instance.fill(payload)

    const data = instance.castToDB()
    const conn = trx ?? db

    const [row] = await conn(this.getTable())
      .insert(data)
      .onConflict(uniqueKeys)
      .merge()
      .returning('*')

    return instance.castFromDB(row)
  }




  // ==========================
  // ## Save (insert / update)
  // ==========================
  async save() {
    const model    =  this.constructor as typeof Model
    const table    =  model.getTable()
    const pk       =  model.primaryKey
    const conn     =  this._trx ?? db
    const hookCtx  =  { model: this, trx: this._trx }
    
    if (!this._exists) {
      const data = this.castToDB()
      
      await this.runHook(`before-create` as ModelHookEventType, hookCtx)

      const [row] = await conn(table).insert(data).returning('*')

      this.castFromDB(row)

      await this.runHook(`after-create` as ModelHookEventType, hookCtx)

      return this
    }

    const dirty = this.getDirty()
    if (Object.keys(dirty).length === 0) return this

    await this.runHook(`before-update` as ModelHookEventType, hookCtx)

    const fields = model.fields
    const updateData: Record<string, any> = {}

    for (const [key, meta] of Object.entries(fields)) {
      if (!meta.fillable) continue
      if (!(key in dirty)) continue

      const val = dirty[key]
      updateData[key] = meta.cast ? Casts[meta.cast].toDB(val) : val
    }

    if (Object.keys(updateData).length === 0) return this

    await conn(table).where(pk, (this as any)[pk]).update(updateData)

    Object.assign(this._original, dirty)

    await this.runHook(`after-update` as ModelHookEventType, hookCtx)

    return this
  }



  // ==========================
  // ## Save with relation
  // ==========================
  async pump<T extends this>(
    this: T,
    payload: ModelPayload<T>,
    options: { trx?: Knex.Transaction } = {}
  ): Promise<T> {

    const isRoot = !options.trx
    const trx = options.trx ?? await db.transaction()

    try {
      const ctor = this.constructor as typeof Model
      const fields = ctor.fields
      const relations = ctor.relations ?? {}

      const flat: ModelPayload<T> = {}
      const nested: Record<string, any> = {}

      for (const key of Object.keys(payload) as Array<keyof DataShape<T>>) {
        const value = payload[key]

        if (fields[key as string]?.fillable) {
          flat[key] = value
        } else if (relations[key as string] && value !== null) {
          nested[key as string] = value
        }
      }

      this.fill(flat)
      await this.useTransaction(trx).save()

      // 3️⃣ Simpan relasi
      for (const [name, value] of Object.entries(nested)) {
        const relDef = relations[name]
        if (!relDef) continue

        const desc = relDef()
        const Related = desc.model()

        // ===== hasMany / belongsToMany =====
        if (Array.isArray(value)) {
          const existing = await Related.query(trx).where(desc.foreignKey, (this as any)[desc.localKey]).get()

          const existingIds = existing.map((r: Model) => (r as any)[Related.primaryKey])
          const incomingIds: any[] = []

          for (const item of value) {
            if ((item as any)[Related.primaryKey]) {
              const child = await Related.query(trx).where(Related.primaryKey, (item as any)[Related.primaryKey]).first()

              if (child) {
                await child.pump(item as any, { trx })
                incomingIds.push(child[Related.primaryKey])
              }
            } else {
              const child = Related.newInstance()
              ;(child as any)[desc.foreignKey] = (this as any)[desc.localKey]
              await child.pump(item as any, { trx })
              incomingIds.push(child[Related.primaryKey])
            }
          }

          const toDelete = existingIds.filter((id: number) => !incomingIds.includes(id))
          if (toDelete.length) {
            await Related.query(trx).whereIn(Related.primaryKey, toDelete).delete()
          }

          continue
        }

        const child = Related.newInstance()
        if (desc.type !== 'belongsTo') {
          ;(child as any)[desc.foreignKey] = (this as any)[desc.localKey]
        }

        await child.pump(value as any, { trx })
      }

      if (isRoot) await trx.commit()
      return this

    } catch (err) {
      if (isRoot) await trx.rollback()
      throw err
    }
  }



  // ==========================
  // ## Soft Delete
  // ==========================
  static getSoftDeleteConfig() {
    return (this as any)[SOFT_DELETE_META] ?? null
  }

  static isSoftDelete(): boolean {
    return !!this.getSoftDeleteConfig()
  }

  static getDeletedAtColumn(): string | null {
    return this.getSoftDeleteConfig()?.column ?? null
  }


  // ==========================
  // ## Delete (with or without soft delete)
  // ==========================
  async delete(): Promise<Record<string, any> | null> {
    const model  =  this.constructor as typeof Model
    const soft   =  model.getSoftDeleteConfig?.()

    if (!this._exists) return null

    if (!soft) return await this.forceDelete()

    const trx = this._trx ?? await db.transaction()

    try {
      await this.runHook(`before-delete` as ModelHookEventType, { model: this, trx })

      await trx(model.getTable()).where(model.primaryKey, (this as any)[model.primaryKey]).update({ [soft.column]: new Date() })
      
      await this.runHook(`after-delete` as ModelHookEventType, { model: this, trx })

      if (!this._trx) await trx.commit()

      const snapshot =  await (this._trx ?? db)(model.getTable()).where(model.primaryKey, (this as any)[model.primaryKey]).first()

      this._exists = false

      return snapshot
    } catch (err) {
      if (!this._trx) await trx.rollback()

      throw err
    }
  }


  // ==========================
  // ## Delete without soft delete
  // ==========================
  async forceDelete() {
    const model = this.constructor as typeof Model
    const pk = model.primaryKey

    if (!this._exists) return

    const snapshot = await (this._trx ?? db)(model.getTable()).where(pk, (this as any)[pk]).first()

    if (!snapshot) return null

    await (this._trx ?? db)(model.getTable()).where(pk, (this as any)[pk]).delete()

    this._exists = false

    return snapshot
  }

  async restore(): Promise<this> {
    const model = this.constructor as typeof Model
    const soft = model.getSoftDeleteConfig?.()

    if (!soft) return this

    await this.runHook(`before-update` as ModelHookEventType, { model: this, trx: this._trx })

    await (this._trx ?? db)(model.getTable()).where(model.primaryKey, (this as any)[model.primaryKey]).update({ [soft.column]: null })

    await this.runHook(`after-update` as ModelHookEventType, { model: this, trx: this._trx })

    this._exists = true

    return this
  }



  // ==========================
  // ## Model Hook
  // ==========================
  on<T extends this>(event: ModelHookEventType, fn: (ctx: ModelHookContextType<T>) => any) {
    if (!this._instanceHooks[event]) this._instanceHooks[event] = []

    this._instanceHooks[event].push(fn as ModelHookFn)

    return this
  }

  off(event: ModelHookEventType) {
    this._disabledHooks.add(event)

    return this
  }

  protected async runHook(event: ModelHookEventType, ctx: ModelHookContextType) {
    if (this._disabledHooks.has(event)) return

    const ctor = this.constructor as typeof Model

    const globals = ctor._hooks?.[event] ?? []
    for (const fn of globals) await fn(ctx)

    const locals = this._instanceHooks[event] ?? []
    for (const fn of locals) await fn(ctx)
  }



  // ==========================
  // ## To response data 
  // ==========================
  toJSON() {
    const data: Record<string, any> = {}
    const ctor = this.constructor as typeof Model
    const fields = ctor.fields ?? {}
    const relations = ctor.relations ?? {}
    const attributes = ctor.attributes ?? {}

    for (const key of Object.keys(fields)) {
      if ((fields[key] as any)?.hidden) continue
      data[key] = (this as any)[key]
    }

    const expanded = (this as any).__expandedAttributes ?? []
    for (const key of expanded) {
      if (attributes[key]) {
        data[key] = (this as any)[key]
      }
    }

    for (const key of Object.keys(relations)) {
      if ((this as any)[key] !== undefined) {
        data[key] = (this as any)[key]
      }
    }

    return data
  }




  // ==========================
  // ## Transaction binding
  // ==========================
  useTransaction(trx: Knex.Transaction) {
    this._trx = trx

    return this
  }
}



// ==========================
// ## Model query builder (extend from knex query builder)
// ==========================
export function extendModelQuery(
  query: Knex.QueryBuilder,
  Model: any
) {
  ;(query as any).$model = Model
  ;(query as any)._withTree = {}
  ;(query as any)._softDeleteScope = 'default'      //? default | with | only
  ;(query as any)._formatter = null
  ;(query as any)._disabledScopes = new Set<string>()


  // =========================
  // ## Soft delete query
  // =========================
  ;(query as any).withTrashed = function () {
    this._softDeleteScope = 'with'
    return this
  }

  ;(query as any).onlyTrashed = function () {
    this._softDeleteScope = 'only'
    return this
  }


  // ==========================
  // ## find or not found 
  // ==========================
  if (!(query as any).findOrNotFound) {
    ;(query as any).findOrNotFound = async function (id: any) {
      applyGlobalScopes(this)

      const pk   =  Model.primaryKey ?? 'id'
      const row  =  await this.where(pk, id).first()

      if (!row) throw status(404, { message: "Error: Record not found!" });

      return Model.hydrate([row])[0]
    }
  }


  // ==========================
  // ## first or not found 
  // ==========================
  if (!(query as any).firstOrNotFound) {
    ;(query as any).firstOrNotFound = async function () {
      applyGlobalScopes(this)

      const row = await this.first()

      if (!row) throw status(404, { message: "Error: Record not found!" });

      return Model.hydrate([row])[0]
    }
  }


  // ==========================
  // ## find
  // ==========================
  if (!(query as any).find) {
    ;(query as any).find = async function (id: any) {
      applyGlobalScopes(this)

      const pk   =  Model.primaryKey ?? 'id'
      const row  =  await this.where(pk, id).first()

      if (!row) return null;

      return Model.hydrate([row])[0]
    }
  }


  // ==========================
  // ## Search query
  // ==========================
  if (!(query as any).search) {
    ;(query as any).search = function (
      keyword                            :  string,
      { includes = [], searchable = [] } : { includes?: string[], searchable?: string[] } = {}
    ) {
      const model = (this as any).$model
      if (!model) return this

      const defaultSearchable  =  Model.searchable || []
      const mergedSearchable   =  searchable?.length ? searchable : [...defaultSearchable, ...includes]

      if (!keyword || !mergedSearchable.length) return this
      

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


  // ==========================
  // ## Filer query
  // ==========================
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


  // ==========================
  // ## Select query
  // ==========================
  if (!(query as any).selects) {
    ;(query as any).selects = function ({ includes = [], selectable = [] } : { includes?: string[], selectable?: string[] } = {}) {
      const model = (this as any).$model
      if (!model) return this

      const defaultSelectable = Model.selectable || ["*"]

      this.select(selectable?.length ? selectable : [...defaultSelectable, ...includes])

      return this
    }
  }


  // ==========================
  // ## Sort query
  // ==========================
  if (!(query as any).sorts) {
    ;(query as any).sorts = function (sorts?: string[]) {
      if (!Array.isArray(sorts) || sorts.length === 0) return this;

      sorts.forEach((sortExpr) => {
        if (typeof sortExpr !== "string") return;

        const parts      =  sortExpr.trim().split(/\s+/);
        const column     =  parts[0];
        const direction  =  (parts[1] || "asc").toLowerCase();

        if (!["asc", "desc"].includes(direction)) {
          this.orderBy(column, "asc");
        } else {
          this.orderBy(column, direction);
        }
      });

      return this;
    };
  }



  // ==========================
  // ## Get query
  // ==========================
  ;(query as any).get = async function () {
    applyGlobalScopes(this)
    applyWithAggregates(this)
    applyOrderByAggregates(this)

    const rows = await this
    let result = this.$model.hydrate(rows)

    if (this._withTree && Object.keys(this._withTree).length) {
      await loadRelations(result, this.$model, this._withTree)
    }

    result.forEach((item: any) => {
      item.__expandedAttributes = Object.keys(this._withTree || {})
        .filter(k => this._withTree[k]?.__attribute)
    })

    if (this._formatter) {
      result = result.map(this._formatter)
    }

    return result
  }


  // ==========================
  // ## Paginate query
  // ==========================
  if (!(query as any).paginate) {
    ;(query as any).paginate = async function (page = 1, limit = 10) {
      applyGlobalScopes(this)
      applyWithAggregates(this)
      applyOrderByAggregates(this)

      const offset  =  (page - 1) * limit

      const raw     =  await this.clone().limit(limit).offset(offset)
      let   data    =  Model.hydrate(raw)

      const [{ count }]  =  await this.clone().clearSelect().clearOrder().count('* as count')
      const total        =  Number(count)

      if(!total) return { data: [], total: 0 }

      if (this._withTree && Object.keys(this._withTree).length) {
        await loadRelations(data, this.$model, this._withTree)
      }

      data.forEach((item: any) => {
        item.__expandedAttributes = Object.keys(this._withTree || {})
          .filter(k => this._withTree[k]?.__attribute)
      })

      if (this._formatter) {
        data = data.map(this._formatter)
      }

      return { data, total }
    }
  }

  // =================================>
  // ## Expand query (Eager loading)
  // =================================>
  ;(query as any).expand = function (entries: Array<string | Record<string, (q: any) => void>> = []) {
    if (!Array.isArray(entries) || !entries.length) return this

    if (!this._withTree) this._withTree = {}

    const applyPath = (
      path: string,
      callback?: (q: any) => void
    ) => {
      const parts = path.split('.')
      let cur = this._withTree
      let node: any

      for (const part of parts) {
        cur[part] ??= { __children: {} }
        node = cur[part]
        cur = node.__children
      }

      if (callback && node) {
        node.__callback = callback
      }
    }

    for (const entry of entries) {
      if (typeof entry === 'string') {
        applyPath(entry)
        continue
      }

      if (typeof entry === 'object') {
        for (const [path, cb] of Object.entries(entry)) {
          applyPath(path, cb)
        }
      }
    }

    return this
  }




  // ==========================
  // ## Where has query
  // ==========================
  if (!(query as any).whereHas) {
    ;(query as any).whereHas = function (path: string, callback?: (q: any) => void) {
      const Model = this.$model
      if (!Model) return this

      const relations = path.split('.')

      whereHasSubquery(this, Model, relations, callback, false)

      return this
    }
  }


  // ==========================
  // ## Or where has query
  // ==========================
  if (!(query as any).orWhereHas) {
    ;(query as any).orWhereHas = function (path: string, callback?: (q: any) => void) {
      const Model = this.$model
      if (!Model) return this

      this.orWhere(() => {
        const relations = path.split('.')
        whereHasSubquery(this, Model, relations, callback, false)
      })

      return this
    }
  }


  // ==========================
  // ## Where doesn't have has query
  // ==========================
  if (!(query as any).whereDoesntHave) {
    ;(query as any).whereDoesntHave = function (path: string, callback?: (q: any) => void) {
      const Model = this.$model
      if (!Model) return this

      const relations = path.split('.')

      whereHasSubquery(this, Model, relations, callback, true)

      return this
    }
  }


  // ==========================
  // ## Or where doesn't have has query
  // ==========================
  if (!(query as any).orWhereDoesntHave) {
    ;(query as any).orWhereDoesntHave = function (path: string, callback?: (q: any) => void) {
      const Model = this.$model
      if (!Model) return this

      this.orWhere(() => {
        const relations = path.split('.')
        whereHasSubquery(this, Model, relations, callback, true)
      })

      return this
    }
  }


  // ==========================
  // ## Scope query
  // =========================
  if (!(query as any).scope) {
    ;(query as any).scope = function (name: string, ...args: any[]) {
      const Model = this.$model
      if (!Model) return this

      const meta = Model.scopes?.[name]
      if (!meta) {
        throw new Error(`Scope "${name}" not found`)
      }

      if (meta.mode !== 'internal') {
        throw new Error(`Scope "${name}" is global and cannot be called manually`)
      }

      meta.fn.apply(this, args)

      return this
    }
  }

  if (!(query as any).withoutScope) {
    ;(query as any).withoutScope = function (...names: string[]) {
      for (const name of names) {
        this._disabledScopes.add(name)
      }
      return this
    }
  }



  // ==========================
  // ## with aggregate query
  // ==========================
  if (!(query as any).withAggregate) {
    ;(query as any).withAggregate = function (expr: string, fn: 'count' | 'sum' | 'avg' | 'min' | 'max', column: string = '*', callback?: (q: any) => void) {
      if (!this._withAggregates) this._withAggregates = []

      const [rel, aliasRaw] = expr.split(/\s+as\s+/i)

      this._withAggregates.push({
        relation : rel.trim(),
        alias    : aliasRaw?.trim() || `${rel}_${fn}`,
        fn,
        column,
        callback,
      })

      return this
    }
  }


  // ==========================
  // ## Order by aggregate query
  // ==========================
  if (!(query as any).orderByAggregate) {
    ;(query as any).orderByAggregate = function (expr: string, fn: 'count' | 'sum' | 'avg' | 'min' | 'max', column: string = '*', direction: 'asc' | 'desc' = 'asc', callback?: (q: any) => void) {
      if (!this._orderByAggregates) this._orderByAggregates = []

      const [rel, aliasRaw] = expr.split(/\s+as\s+/i)

      this._orderByAggregates.push({
        relation : rel.trim(),
        alias    : aliasRaw?.trim(),
        fn,
        column,
        direction,
        callback,
      })

      return this
    }
  }




  // =================================>
  // ## Get option query
  // =================================>
  if (!(query as any).option) {
    ;(query as any).option = async function (selectableOption?: string[]) {
      applyGlobalScopes(this)

      const model                        =  (this as any).$model;
      const q                            =  this.clone();
      let   defaultSelectable: string[]  =  [];

      if (model) {
        defaultSelectable        =  model.selectable || [];
      }

      let processedCols: string[] = [];

      if (!Array.isArray(selectableOption) || selectableOption.length === 0) {
        const valueCol = defaultSelectable.length > 0 ? defaultSelectable[0] : model.primaryKey;
        const labelCol = defaultSelectable.length > 0 ? defaultSelectable[1] : defaultSelectable[0] ?? model.primaryKey;

        processedCols = [`${valueCol} as value`, `${labelCol} as label`];
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
      
      q.clearSelect().select(processedCols);

      return await q;
    };
  }


  // ==========================
  // ## Paginate or option query
  // ==========================
  if (!(query as any).paginateOrOption) {
    ;(query as any).paginateOrOption = async function (
      page               :  number              =  1,
      limit              :  number              =  10,
      option            ?:  string | boolean,
      selectableOption  ?:  string[],
    ) {
      const isOption = ["true", "1", "yes"].includes(String(option).toLowerCase());

      if (isOption) {
        const data = await this.option(selectableOption);

        return { data, total: data.length };
      }

      const result = await this.paginate(page, limit);

      return result;
    };
  }


  // ==========================
  // ## Resolve query
  // ==========================
  if (!(query as any).resolve) {
    ;(query as any).resolve = async function (input: any = {}) {
      const gq = input?.getQuery ? input.getQuery : input
      const isOption = input?.headers?.["x-option"] || gq?.isOption || false

      this.
        expand?.(gq.expand).
        search?.(gq.search, {
          includes: [],
          searchable: gq.searchable
        }).
        filter?.(gq.filter).
        selects?.({
          includes: [],
          selectable: gq.selectable
        }).
        sorts?.(gq.sort)

      if (isOption || gq.paginate) return await this.paginateOrOption?.(gq.page, gq.paginate, isOption, gq.selectableOption)

      const data = await this.query().get()

      return { data, total: data.length }
    }
  }


  // ==========================
  // ## format result query
  // ==========================
  if (!(query as any).format) {
    ;(query as any).format = function (formatter: string | ((item: any) => any)) {
      const Model = this.$model

      if (typeof formatter === 'string') {
        const fn = Model?.formatters?.[formatter]
        if (!fn) throw new Error(`Formatter "${formatter}" not found on model ${Model?.name}`)

        this._formatter = fn
        return this
      }

      if (typeof formatter === 'function') {
        this._formatter = formatter
        return this
      }

      throw new Error('format() only accepts string or function')
    }
  }



  return query
}




// ?? Public model helpers


// =================================>
// ## Primary key decorator model helpers
// =================================>
export function PrimaryKey() {
  return function (target: any, key: string) {
    const ctor = target.constructor

    ctor.primaryKey = key

    if (!ctor[FIELD_META]) ctor[FIELD_META] = {}

    ctor[FIELD_META][key] = {
      cast: 'number',
      selectable: true,
    }

    ctor[PRIMARY_KEY_META] = key
  }
}


// =================================>
// ## Field decorator model helpers
// =================================>
export function Field(defs: string[]) {
  return function (target: any, key: string) {
    const ctor = target.constructor
    if (!ctor[FIELD_META]) ctor[FIELD_META] = {}

    const meta: FieldMeta = {}

    const [first, ...rest] = defs
    if (['string','number','boolean','date','json'].includes(first)) {
      meta.cast = first as ModelCastType
    } else {
      rest.unshift(first)
    }

    for (const flag of rest) {
      if (flag === 'fillable') meta.fillable      =  true
      if (flag === 'selectable') meta.selectable  =  true
      if (flag === 'searchable') meta.searchable  =  true
    }

    ctor[FIELD_META][key] = meta
  }
}



// =================================>
// ## Relation decorator model helpers
// =================================>
export function HasMany(
  model     :  () => typeof Model,
  options  ?:  { 
    foreignKey  ?:  string
    localKey    ?:  string
    callback    ?:  (q: any) => void }
) {
  return (target: any, key: string) => {
    const parent      =  target.constructor
    const parentKey   =  options?.localKey ?? 'id'
    const foreignKey  =  options?.foreignKey ?? `${conversion.strSnake(parent.name)}_id`

    pushRelation(target, key, { type: 'hasMany', model, foreignKey, localKey: parentKey, callback: options?.callback })
  }
}


export function HasOne(
  model     :  () => typeof Model,
  options  ?:  {
    foreignKey  ?:  string
    localKey    ?:  string
    callback    ?:  (q: any) => void
  }
) {
  return (target: any, key: string) => {
    const parent      =  target.constructor
    const parentKey   =  options?.localKey ?? 'id'
    const foreignKey  =  options?.foreignKey ?? `${conversion.strSnake(parent.name)}_id`

    pushRelation(target, key, { type: 'hasOne', model, foreignKey, localKey: parentKey, callback: options?.callback })
  }
}


export function BelongsTo(
  model     :  () => typeof Model,
  options  ?:  {
    foreignKey  ?:  string
    ownerKey    ?:  string
    callback    ?:  (q: any) => void
  }
) {
  return (target: any, key: string) => {
    const ctor        =  target.constructor
    const foreignKey  =  options?.foreignKey ?? `${conversion.strSnake(key)}_id`
    const ownerKey    =  options?.ownerKey ?? 'id'

    pushRelation(target, key, { type: 'belongsTo', model, foreignKey, localKey: ownerKey, callback: options?.callback })

    if (!ctor[FIELD_META]) ctor[FIELD_META] = {}

    if (!ctor[FIELD_META][foreignKey]) {
      ctor[FIELD_META][foreignKey] = {
        cast: 'number',
        fillable: true,
        selectable: true,
      }
    }
  }
}


// export function BelongsToMany(
//   model     :  () => typeof Model,
//   options  ?:  {
//     pivotTable    ?:  string
//     pivotLocal    ?:  string
//     pivotForeign  ?:  string
//     localKey      ?:  string
//     callback      ?:  (q: any) => void
//   }
// ) {
//   return (target: any, key: string) => {
//     const parent        =  target.constructor
//     const parentName    =  conversion.strSnake(parent.name)
//     const relatedName   =  conversion.strSnake(model().name)
//     const pivotTable    =  options?.pivotTable ?? conversion.strPlural(`${parentName}_${relatedName}`)
//     const localKey      =  options?.localKey ?? 'id'
//     const pivotLocal    =  options?.pivotLocal ?? `${parentName}_id`
//     const pivotForeign  =  options?.pivotForeign ?? `${relatedName}_id`

//     pushRelation(target, key, { type: 'belongsToMany', model, localKey, foreignKey: localKey, pivotTable, pivotLocal, pivotForeign, callback: options?.callback })
//   }
// }
export function BelongsToMany(
  model     : () => typeof Model,
  options  ?: {
    pivotTable    ?: string
    pivotLocal    ?: string
    pivotForeign  ?: string
    localKey      ?: string
    callback      ?: (q: any) => void
  }
) {
  return (target: any, key: string) => {
    const localKey = options?.localKey ?? 'id'

    pushRelation(target, key, {
      type: 'belongsToMany',
      model,
      localKey,
      foreignKey: localKey,
      pivotTable: options?.pivotTable,
      pivotLocal: options?.pivotLocal,
      pivotForeign: options?.pivotForeign,
      callback: options?.callback,
    })
  }
}



// =================================>
// ## Soft delete decorator model helpers
// =================================>
export function SoftDelete() {
  return function (target: any, propertyKey: string) {
    const ctor = target.constructor

    ctor[SOFT_DELETE_META] = { enabled: true, column: propertyKey }
  }
}



// =================================>
// ## Attribute decorator model helpers
// =================================>
export function Attribute() {
  return function (
    target: any,
    key: string,
    descriptor: PropertyDescriptor
  ) {
    const ctor = target.constructor
    if (!ctor[ATTRIBUTE_META]) ctor[ATTRIBUTE_META] = {}
    ctor[ATTRIBUTE_META][key] = descriptor.value
  }
}



// =================================>
// ## Formatter decorator model helpers
// =================================>
export function Formatter() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const ctor = target
    if (!ctor[FORMATTER_META]) {
      ctor[FORMATTER_META] = {}
    }

    ctor[FORMATTER_META][propertyKey] = descriptor.value
  }
}



// =================================>
// ## Scope decorator model helpers
// =================================>
export function Scope(
  mode: 'global' | 'internal' = 'internal'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const ctor = target.constructor
    if (!ctor[SCOPE_META]) ctor[SCOPE_META] = {}

    ctor[SCOPE_META][propertyKey] = {
      fn: descriptor.value,
      mode,
    } satisfies ScopeType
  }
}


// =================================>
// ## Hook
// =================================>
export function On(event: ModelHookEventType) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const ctor = target.constructor

    if (!ctor._hooks) {
      ctor._hooks = {}
    }

    if (!ctor._hooks[event]) {
      ctor._hooks[event] = []
    }

    ctor._hooks[event].push(
      async ({ model, trx }: ModelHookContextType) => {
        return descriptor.value.call(model, { trx })
      }
    )
  }
}





// ?? Private model helpers


// =================================>
// ## Global scope model helpers
// =================================>
function applyGlobalScopes(query: any) {
  const Model = query.$model
  if (!Model) return

  applyScopes(query)

  if (Model.isSoftDelete?.()) {
    const col   =  Model.getDeletedAtColumn()
    const mode  =  query._softDeleteScope ?? 'default'

    if (mode === 'with') return
    if (mode === 'default') query.whereNull(col)
    if (mode === 'only') query.whereNotNull(col)
  }
}



// =================================>
// ## Load relation model helpers
// =================================>
async function loadRelations(
  rows   :  any[],
  Model  :  any,
  tree   :  Record<string, any>
) {
  if (!rows.length) return

  for (const [name, node] of Object.entries(tree)) {
    const rel = Model.relations[name]
    if (!rel) continue

    const desc = rel()
    let related: any[] = []

    if (desc.type === 'belongsTo') {
      related = await loadBelongsTo(rows, desc, name, node.__callback)
    }

    if (desc.type === 'belongsToMany') {
      related = await loadBelongsToMany(rows, desc, name, node.__callback)
    }

    if (desc.type === 'hasMany') {
      related = await loadHasMany(rows, desc, name, node.__callback)
    }

    if (desc.type === 'hasOne') {
      related = await loadHasOne(rows, desc, name, node.__callback)
    }

    if (
      node.__children &&
      Object.keys(node.__children).length &&
      related.length
    ) {
      await loadRelations(related, desc.model(), node.__children)
    }
  }
}

async function loadBelongsTo(
  rows: any[],
  rel: any,
  name: string,
  callback?: (q: any) => void
) {
  const ids = [...new Set(rows.map(r => r[rel.foreignKey]).filter(Boolean))]
  if (!ids.length) {
    rows.forEach(r => (r[name] = null))

    return []
  }

  const q = rel.model().query().whereIn(rel.localKey, ids)

  rel.callback?.(q)
  callback?.(q)

  const related = rel.model().hydrate(await q)
  const map = new Map(related.map((r: any) => [String(r[rel.localKey]), r]))

  rows.forEach(r => (r[name] = map.get(String(r[rel.foreignKey])) ?? null))

  return related
}


async function loadBelongsToMany(
  rows: any[],
  rel: any,
  name: string,
  callback?: (q: any) => void
) {
  const ids = rows.map(r => r[rel.localKey])
  if (!ids.length) {
    rows.forEach(r => (r[name] = []))
    return []
  }

  const Parent       =  rows[0].constructor
  const Related      =  rel.model()
  const parentName   =  conversion.strSnake(Parent.name)
  const relatedName  =  conversion.strSnake(Related.name)

  const pivotTable    =  rel.pivotTable ?? conversion.strPlural(`${parentName}_${relatedName}`)
  const pivotLocal    =  rel.pivotLocal ?? `${parentName}_id`
  const pivotForeign  =  rel.pivotForeign ?? `${relatedName}_id`
  const relatedTable  =  Related.getTable()

  const q = Related.query().join(pivotTable, `${relatedTable}.${Related.primaryKey}`, '=', `${pivotTable}.${pivotForeign}`).whereIn(`${pivotTable}.${pivotLocal}`, ids)

  rel.callback?.(q)
  callback?.(q)

  const related = Related.hydrate(await q)

  const grouped: Record<string, any[]> = {}

  for (const r of related) {
    const pivotValue = (r as any)[pivotLocal]
    ;(grouped[pivotValue] ??= []).push(r)
  }

  rows.forEach(r => { r[name] = grouped[r[rel.localKey]] ?? [] })

  return related
}



async function loadHasMany(rows: any[], rel: any, name: string, callback?: (q: any) => void) {
  const ids = rows.map(r => r[rel.localKey])
  if (!ids.length) {
    rows.forEach(r => (r[name] = []))

    return []
  }

  const q = rel.model().query().whereIn(rel.foreignKey, ids)

  rel.callback?.(q)
  callback?.(q)

  const related = rel.model().hydrate(await q)
  const grouped: Record<string, any[]> = {}

  for (const r of related) {
    ;(grouped[String(r[rel.foreignKey])] ??= []).push(r)
  }

  rows.forEach(r => (r[name] = grouped[String(r[rel.localKey])] ?? []))

  return related
}


async function loadHasOne(
  rows: any[],
  rel: any,
  name: string,
  callback?: (q: any) => void
) {
  const ids = rows.map(r => r[rel.localKey])
  if (!ids.length) {
    rows.forEach(r => (r[name] = null))
    return []
  }

  const q = rel.model().query().whereIn(rel.foreignKey, ids)

  rel.callback?.(q)
  callback?.(q)

  const related = rel.model().hydrate(await q)
  const map = new Map(
    related.map((r: any) => [String(r[rel.foreignKey]), r])
  )

  rows.forEach(r => r[name] = map.get(String(r[rel.localKey])) ?? null)

  return related
}



// =================================>
// ## Add relation model helpers
// =================================>
function pushRelation(
  target  :  any,
  key     :  string,
  desc    :  ModelRelationDescriptor
) {
  const ctor = target.constructor
  if (!ctor[RELATION_META]) ctor[RELATION_META] = {}

  ctor[RELATION_META][key] = () => desc
}



// =================================>
// ## Where has model helpers
// =================================>
function whereHasSubquery(
  parentQuery: any,
  Model: any,
  relations: string[],
  callback?: (q: any) => void,
  negate: boolean = false
) {
  const relation = relations[0]
  const relDef = Model.relations?.[relation]
  if (!relDef) return

  const desc = relDef()
  const Related = desc.model()

  const parentTable = Model.getTable()
  const relatedTable = Related.getTable()

  const method = negate ? 'whereNotExists' : 'whereExists'

  parentQuery[method](function (this: Knex.QueryBuilder) {
    this.select(1).from(relatedTable)

    if (desc.type === 'hasMany' || desc.type === 'hasOne') {
      this.whereRaw(`${relatedTable}.${desc.foreignKey} = ${parentTable}.${desc.localKey}`)
    }

    if (desc.type === 'belongsTo') {
      this.whereRaw(`${relatedTable}.${desc.localKey} = ${parentTable}.${desc.foreignKey}`)
    }

    if (desc.type === 'belongsToMany') {
      const pivot = desc.pivotTable

      this.join(pivot, `${pivot}.${desc.pivotForeign}`, '=', `${relatedTable}.${Related.primaryKey}`)

      this.whereRaw(`${pivot}.${desc.pivotLocal} = ${parentTable}.${desc.localKey}`)
    }

    if (relations.length > 1) {
      whereHasSubquery(this, Related, relations.slice(1), callback, negate)
      return
    }

    if (callback) {
      const qb = Related.query().from(relatedTable)

      desc.callback?.(qb)
      callback(qb)

      this.whereExists(qb)
    }
  })
}



// =================================>
// ## Add aggregate model helpers
// =================================>
function applyWithAggregates(query: any) {
  const Model = query.$model
  if (!Model || !query._withAggregates?.length) return

  const parentTable = Model.getTable()

  for (const item of query._withAggregates) {
    const relDef = Model.relations?.[item.relation]
    if (!relDef) continue

    const desc = relDef()
    const Related = desc.model()
    const relatedTable = Related.getTable()

    const fn = item.fn as AggregateType
    const sub = (db(Related.getTable()) as any)[fn](item.column)

    if (desc.type === 'hasMany' || desc.type === 'hasOne') {
      sub.whereRaw(`${relatedTable}.${desc.foreignKey} = ${parentTable}.${desc.localKey}`)
    }

    if (desc.type === 'belongsTo') {
      sub.whereRaw(`${relatedTable}.${desc.localKey} = ${parentTable}.${desc.foreignKey}`)
    }

    if (desc.type === 'belongsToMany') {
      const pivot = desc.pivotTable

      sub.join(pivot, `${pivot}.${desc.pivotForeign}`, '=', `${relatedTable}.${Related.primaryKey}`)

      sub.whereRaw(`${pivot}.${desc.pivotLocal} = ${parentTable}.${desc.localKey}`)
    }

    desc.callback?.(sub)
    item.callback?.(sub)

    query.select(query.client.raw(`(${sub.toQuery()}) as ${item.alias}`))
  }
}



// =================================>
// ## Add order by aggregate model helpers
// =================================>
function applyOrderByAggregates(query: any) {
  const Model = query.$model
  if (!Model || !query._orderByAggregates?.length) return

  const parentTable = Model.getTable()

  for (const item of query._orderByAggregates) {
    const relDef = Model.relations?.[item.relation]
    if (!relDef) continue

    const desc = relDef()
    const Related = desc.model()
    const relatedTable = Related.getTable()

    const fn = item.fn as AggregateType
    const sub = (db(Related.getTable()) as any)[fn](item.column)

    if (desc.type === 'hasMany') {
      sub.whereRaw(
        `${relatedTable}.${desc.foreignKey} = ${parentTable}.${desc.localKey}`
      )
    }

    if (desc.type === 'belongsTo') {
      sub.whereRaw(
        `${relatedTable}.${desc.localKey} = ${parentTable}.${desc.foreignKey}`
      )
    }

    if (Related.isSoftDelete?.()) {
      sub.whereNull(Related.getDeletedAtColumn())
    }

    desc.callback?.(sub)
    item.callback?.(sub)

    query.orderByRaw(`(${sub.toQuery()}) ${item.direction}`)
  }
}


// =================================>
// ## Add scope model helpers
// =================================>
function applyScopes(query: any) {
  const Model = query.$model
  if (!Model) return

  const scopes = Model.scopes ?? {}
  const disabled = query._disabledScopes ?? new Set<string>()

  for (const [name, meta] of Object.entries(scopes) as [string, ScopeType][]) {
    if (meta.mode !== 'global') continue
    if (disabled.has(name)) continue

    meta.fn.call(Model, query)
  }
}