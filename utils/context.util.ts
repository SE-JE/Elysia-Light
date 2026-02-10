import { AsyncLocalStorage } from 'node:async_hooks'

export type AppContext = { 
  userId?: number,
}

const storage = new AsyncLocalStorage<AppContext>()

export const context = {
  run<T>(ctx: AppContext, fn: () => T) {
    return storage.run(ctx, fn)
  },

  get<K extends keyof AppContext>(key: K): AppContext[K] {
    return storage.getStore()?.[key]
  },
}
