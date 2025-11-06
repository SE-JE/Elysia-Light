import { sutando } from 'sutando'



// ==============================>
// ## DB: Database supported
// ==============================>
const database = process.env.DB_CONNECTION ? (['pgsql', 'pg'].includes(process.env.DB_CONNECTION) ? "pg" : ['mysql', 'mysql2'].includes(process.env.DB_CONNECTION) ? "mysql2" : "pg") : "pg"



// ==============================>
// ## DB: Init database connection
// ==============================>
sutando.addConnection({
  client      :  database,
  connection  :  {
    host      :  process.env.DB_HOST          ||  '127.0.0.1',
    port      :  Number(process.env.DB_PORT)  ||  5432,
    user      :  process.env.DB_USERNAME      ||  'postgres',
    password  :  process.env.DB_PASSWORD      ||  'password',
    database  :  process.env.DB_DATABASE      ||  'db_elysia_light',
  },
  migrations: {
    directory: "./database/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./database/seeders",
    extension: "ts",
  },
})

export const db  =  sutando.connection()