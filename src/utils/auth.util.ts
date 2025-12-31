import crypto from 'crypto'
import bcrypt from "bcrypt";
import { db, queue, redis } from '@utils'



// =====================================>
// ## Auth: User Access Token
// =====================================>
const TOKEN_PLAIN_LENGTH  =  20
const AUTH_CACHE          =  process.env.AUTH_CACHE  ===  "true"
const AUTH_CACHE_TTL      =  Number(process.env.AUTH_CACHE_TTL || 600)
const AUTH_PERMISSION     =  process.env.AUTH_CACHE  ===  "true"



export const Auth = {

  // =====================================>
  // ## Auth: create access token with user id
  // =====================================>
  async createAccessToken(userId: number, req: Request, permission: boolean = true) {
    const plain  =  crypto.randomBytes(TOKEN_PLAIN_LENGTH).toString("hex")
    const hash   =  await bcrypt.hash(plain, 10)
    const agent  =  generateAgentId(req)

    let permissions: string[] = []
    if (AUTH_PERMISSION && permission) {
      permissions = await getUserPermissions(userId)
    }

    const [row] = await db("user_access_tokens").insert({
      user_id      :  userId,
      token        :  hash,
      agent        :  agent,
      permissions  :  JSON.stringify(permissions),
      created_at   :  new Date(),
    }).returning(["id"])

    return {
      token    :  `${row.id}|${plain}`,
      tokenId  :  row.id,
    }
  },



  // =====================================>
  // ## Auth: delete access token with user id
  // =====================================>
  async revokeAccessToken(id: number) {
    return db.table('user_access_tokens').where("id", id).delete()
  },



  // =====================================>
  // ## Auth: verify access token
  // =====================================>
  async verifyAccessToken(token: string, req: Request) {
    if (!token.includes("|")) return null

    const [tokenId, plain]  =  token.split("|", 2)
    const agent             =  generateAgentId(req)
    const ip                =  getRequestIp(req)

    const cacheKey = `auth:token:${tokenId}`

    if (AUTH_CACHE) {
      const cached = await redis.get(cacheKey)

      if (cached) {
        const session = JSON.parse(cached)

        if (session.agent !== agent) return null

        return session
      }
    }

    const tokenRecord = await db("user_access_tokens").where("id", tokenId).first()

    if (!tokenRecord) return null
    if (tokenRecord.agent !== agent) return null

    const valid = await bcrypt.compare(plain, tokenRecord.token)
    if (!valid) return null

    await db("user_access_tokens").where("id", tokenRecord.id).update({ last_used_at: new Date(), last_used_ip: ip })

    const user = await db("users").where("id", tokenRecord.user_id).first()

    if (AUTH_CACHE) {
      await redis.setex(
        cacheKey,
        AUTH_CACHE_TTL,
        JSON.stringify({
          user         :  user,
          agent        :  tokenRecord.agent,
          permissions  :  tokenRecord.permission,
        })
      )
    }

    return { user, token: tokenRecord, permissions: tokenRecord.permission }
  },



  // =====================================>
  // ## Auth: create user mail token
  // =====================================>
  async createUserMailToken(userId: number) {
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = crypto.createHash('sha256').update(token).digest('hex')
  
    const trx = await db.transaction()

    await trx.table('user_mail_tokens').insert({
      user_id     : userId,
      token       : hash,
      created_at  : new Date(),
    })
    
    const record = await trx.table('user_mail_tokens').orderBy('id', 'desc').first()
    
    await trx.commit()

    return {
      token    : token,
      tokenId  : record.id
    }
  },



  // =====================================>
  // ## Auth: Verify user mail token
  // =====================================>
  async verifyUserMailToken(userId: number, token: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const record = await db.table("user_mail_tokens")
      .where("user_id", userId)
      .whereNull("used_at")
      .orderBy("id", "desc")
      .first();

    if (!record) return false

    if (record.token !== hashedToken) return false;

    const createdAt = new Date(record.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 10) return false;

    return true;
  },



  // =====================================>
  // ## Auth: list user sessions
  // =====================================>
  async listUserSessions(userId: number, currentTokenId?: number) {
    const rows = await db("user_access_tokens").select(["id", "agent", "created_at", "last_used_at", "last_used_ip","expired_at"]).where("user_id", userId).orderBy("last_used_at", "desc")

    return rows.map(r => ({
      ...r,
      is_active  : r.revoked_at  ===  null,
      is_current : r.id          ===  currentTokenId,
    }))
  },



  // =====================================>
  // ## Auth: revalidate user permission
  // =====================================>
  revalidateUserPermissions: revalidateUserPermissions,
  revalidateUserPermissionsByRole: revalidateUserPermissionsByRole,
}



function generateAgentId(req: Request) {
  const ua   =  req.headers.get("user-agent")  ??  ""
  const acc  =  req.headers.get("accept")      ??  ""

  return crypto.createHash("sha256").update(ua + acc).digest("hex")
}


function getRequestIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown")
}


async function getUserPermissions(userId: number): Promise<string[]> {
  const roleIds = await db("user_roles").where("user_id", userId).pluck("role_id")

  if (roleIds.length === 0) return []

  const rows = await db("permissions").whereIn("role_id", roleIds).pluck("permissions")

  return Array.from(
    new Set(
      rows.flatMap(p => p ?? [])
    )
  )
}


async function revalidateUserPermissions(userId: number) {
  const permissions = await getUserPermissions(userId)

  const tokenIds = await db("user_access_tokens").where("user_id", userId).pluck("id")

  if (tokenIds.length === 0) return

  await db("user_access_tokens").whereIn("id", tokenIds).update({
    permissions  :  JSON.stringify(permissions),
    updated_at   :  new Date(),
  })

  if (AUTH_CACHE) {
    await Promise.all(
      tokenIds.map(id => redis.del(`auth:token:${id}`))
    )
  }
}


async function revalidateUserPermissionsByRole(roleId: number) {
  const userIds = await db("user_roles").where("role_id", roleId).pluck("user_id")

  for (const userId of userIds) {
    await queue.add("auth:revalidate-permission", { userId })
  }
}