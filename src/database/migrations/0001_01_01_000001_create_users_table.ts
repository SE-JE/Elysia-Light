import type { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.bigIncrements("id").primary()
    table.string("name").notNullable()
    table.string("email").unique().notNullable()
    table.string("password")
    table.string("image")
    table.timestamp("email_verification_at")
    table.timestamps(true, true)
  })

  await knex.schema.createTable("roles", (table) => {
    table.bigIncrements("id").primary()
    table.string("name").notNullable()
  })

  await knex.schema.createTable("user_roles", (table) => {
    table.bigIncrements("id").primary()
    table.bigInteger("user_id").unsigned().index().notNullable()
    table.bigInteger("role_id").unsigned().index().notNullable()
  })

  await knex.schema.createTable("user_access_tokens", (table) => {
    table.bigIncrements("id").primary()
    table.bigInteger("user_id").unsigned().index().notNullable()
    table.string("agent").index().notNullable()
    table.string("token").unique().index().notNullable()
    table.json("permissions").defaultTo(knex.raw(`'[]'::json`))
    table.string("last_used_ip").nullable()
    table.timestamp("last_used_at")
    table.timestamp("expired_at")
    table.timestamps(true, true)
  })

  await knex.schema.createTable("user_mail_tokens", (table) => {
    table.bigIncrements("id").primary()
    table.bigInteger("user_id").unsigned().index().notNullable()
    table.string("token").unique().notNullable()
    table.timestamp("used_at")
    table.timestamps(true, true)
  })

  await knex.schema.createTable("permissions", (table) => {
    table.bigIncrements("id").primary()
    table.bigInteger("user_id").unsigned().index().notNullable()
    table.bigInteger("role_id").unsigned().index().notNullable()
    table.json("permissions").defaultTo(knex.raw(`'[]'::json`))
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_mail_tokens")
  await knex.schema.dropTableIfExists("user_access_tokens")
  await knex.schema.dropTableIfExists("users")
  await knex.schema.dropTableIfExists("roles")
  await knex.schema.dropTableIfExists("user_roles")
  await knex.schema.dropTableIfExists("permissions")
}