import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.bigIncrements('id').primary()
    table.string('title')
    table.string('body').nullable()
    table.string('type').nullable()
    table.string('redirect').nullable()
    table.json('data').nullable()
    table.timestamps(true, true)
    table.timestamp('deleted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now()).index()
  })

  await knex.schema.createTable('notification_users', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').nullable().index()
    table.bigInteger('notification_id').nullable().index()
    table.timestamps(true, true)
    table.timestamp('canceled_at', { useTz: true }).notNullable().defaultTo(knex.fn.now()).index()
    table.timestamp('deleted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now()).index()
  })
}