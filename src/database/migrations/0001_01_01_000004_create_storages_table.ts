import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('storages', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').nullable().index()
    table.string('disk').notNullable().index()
    table.string('path').notNullable().index()
    table.string('filename').nullable()
    table.string('filetype').nullable()
    table.string('filesize').nullable()
    table.timestamps(true, true)
  })

  await knex.schema.createTable('storage_permissions', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('storage_id').unsigned().notNullable().index()
    table.bigInteger('user_id').nullable().index()
    table.bigInteger('role_id').nullable().index()
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('storages')
  await knex.schema.dropTableIfExists('storage_permissions')
}
