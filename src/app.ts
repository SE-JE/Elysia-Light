import os from 'os'
import { Elysia } from 'elysia'
import { Controller, db, logger, Middleware, redis, storage } from "@utils"
import { routes } from '@routes/.'


// =====================================>
// ## Init: middleware & router app
// =====================================>
export const app  =  new Elysia()
  .use(Middleware.Cors)
  .use(Middleware.BodyParse)
  .use(Controller)
  .use(storage)
  .use(routes)



// =====================================>
// ## Init: database
// =====================================>
db.schema
logger.start(`Database connected ${process.env.DB_DATABASE}!`)



// =====================================>
// ## Init: redis
// =====================================>
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  redis.on("connect", () => {
    logger.start(`Redis connected ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}!`)
  })

  redis.on("error", (err) => {
    logger.error("Redis error:", err)
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




