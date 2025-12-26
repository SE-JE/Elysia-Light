import os from 'os'
import { Elysia } from 'elysia'
import { Controller, daClient, db, logger, Middleware, redis, storage } from "@utils"
import { routes } from '@routes/.'


// =====================================>
// ## Init: middleware & router app
// =====================================>
export const app  =  new Elysia()
  .use(Middleware.AccessLog)
  .use(Middleware.Cors)
  .use(Middleware.BodyParse)
  .use(Controller)
  .use(storage)
  .use(routes)
  .use(Middleware.ErrorHandler)



// =====================================>
// ## Init: database
// =====================================>
if (process.env.DB_HOST && process.env.DB_PORT && process.env.DB_USERNAME && process.env.DB_PASSWORD && process.env.DB_DATABASE) {
  db.schema
  logger.start(`Database connected ${process.env.DB_DATABASE}!`)
}


// =====================================>
// ## Init: database olap
// =====================================>
if (process.env.DA_HOST && process.env.DA_PORT && process.env.DA_USERNAME && process.env.DA_PASSWORD && process.env.DA_DATABASE) {
  daClient.ping();
  logger.start(`Database (OLAP) connected ${process.env.DA_DATABASE}!`)
}


// =====================================>
// ## Init: redis
// =====================================>
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  redis.on("connect", () => {
    logger.start(`Redis connected ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}!`)
  })

  redis.on("error", (err) => {
    const em = err instanceof Error ? err.message : String(err)
    logger.error(`Redis error: ${em}`, { error: em })
  })
}



// =====================================>
// ## Init: running server
// =====================================>
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
}

app.listen({ port: process.env.APP_PORT, hostname: '0.0.0.0' })
setTimeout(() => logger.start(`Server is running at \n        [LOCAL]    http://localhost:${process.env.APP_PORT || 4000} \n        [NETWORK]  http://${getLocalIP()}:${process.env.APP_PORT || 4000}!`), 200)




