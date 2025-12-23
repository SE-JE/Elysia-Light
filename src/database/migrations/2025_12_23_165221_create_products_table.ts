import type { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("products", (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('product_category_id').unsigned().notNullable().index()
    table.string('name')
    table.string('description').nullable()
    table.float('price')
    table.float('buy_price')
    table.timestamps(true, true)
  })

  await knex.schema.createTable("product_categories", (table) => {
    table.bigIncrements('id').primary()
    table.string('name')
    table.timestamps(true, true)
  })

  await knex.schema.createTable("product_locations", (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('product_id').unsigned().notNullable().index()
    table.bigInteger('location_id').unsigned().notNullable().index()
    table.timestamps(true, true)
  })

  await knex.schema.createTable("locations", (table) => {
    table.bigIncrements('id').primary()
    table.string('name')
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("products")
  await knex.schema.dropTableIfExists("product_categories")
  await knex.schema.dropTableIfExists("product_locations")
  await knex.schema.dropTableIfExists("locations")
}