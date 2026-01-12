import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_logs', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').nullable().index()
    table.string('feature', 100).notNullable().index()
    table.string('action', 50).notNullable().index()
    table.jsonb('changes').nullable()
    table.timestamp('at', { useTz: true }).notNullable().defaultTo(knex.fn.now()).index()
  })
}
