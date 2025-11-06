import { Migration } from 'sutando';
import { db } from '@utils';

export default class AddUsersTable extends Migration {
  // =========================>
  // ## Run the migration
  // =========================>
  async up() {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('email').unique().notNullable()
      table.string('password')
      table.string('image')
      table.timestamp('email_verification_at')
      table.timestamps(true, true)
    });

    await db.schema.createTable('user_access_tokens', (table) => {
      table.increments('id').primary()
      table.integer("user_id").unsigned().index().notNullable()
      table.string('token').unique().notNullable()
      table.string('type')
      table.timestamp('last_used_at')
      table.timestamp('expired_at')
      table.timestamps(true, true)
    });

    await db.schema.createTable('user_mail_tokens', (table) => {
      table.increments('id').primary()
      table.integer("user_id").unsigned().index().notNullable()
      table.string('token').unique().notNullable()
      table.timestamp('used_at')
      table.timestamps(true, true)
    });
  }

  // =========================>
  // ## Reverse the migrations.
  // =========================>
  async down(schema: any) {
    await schema.dropTableIfExists('users');
  }
}