import { redis } from "@utils";

export const cache = {
  // =============================>
  // ## Cache: Make key of cache database
  // =============================>
  makeKey(type: string, prefix: string, query: any): string {
    const keyParts = typeof query === "object" ? JSON.stringify(query) : String(query);
    return `${type}:${prefix}:${Buffer.from(keyParts).toString("base64")}`;
  },



  // =============================>
  // ## Cache: Get cache with key
  // =============================>
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  },



  // =============================>
  // ## Cache: Set cache record
  // =============================>
  async set(key: string, value: any, expired: number): Promise<void> {
    const ttl = expired ?? 60; 
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  },



  // =============================>
  // ## Cache: Set cache record
  // =============================>
  async clear(type: string, prefix: string) {
    const keyPrefix = `${type}:${prefix}:*`
    const keys = await redis.keys(keyPrefix)
    if (keys.length) await redis.del(keys)
  }
}