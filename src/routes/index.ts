import {
Elysia } from 'elysia'
import { api, Middleware } from '@utils'

import { 
    AuthController, 
    BaseController, 
    UserController
} from '@controllers'

export const routes = (app: Elysia) => app.group('/api', (route) => {
    route.get('/', BaseController.index)
    route.get('/features', BaseController.feature)
    route.get('/accesses', BaseController.access)
    
    route.post('/login', AuthController.login)
    route.post('/register', AuthController.register)

    route.use(Middleware.Private)
    
    route.post('/verify', AuthController.verify)
    route.get('/me', AuthController.me)
    route.post('/me/update', AuthController.update)

    api(route, "/users", UserController);
    return route;
})