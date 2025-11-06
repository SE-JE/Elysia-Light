import crypto from 'crypto'
import { db } from '@utils'
import { User } from '@models'



// =====================================>
// ## Auth: User Access Token
// =====================================>
const TOKEN_PLAIN_LENGTH = 20



export const Auth = {

  // =====================================>
  // ## Auth: create access token with user id
  // =====================================>
  async createAccessToken(userId: number) {
    const plain = crypto.randomBytes(TOKEN_PLAIN_LENGTH).toString('hex')
    const hash = crypto.createHash('sha256').update(plain).digest('hex')
  
    const trx = await db.beginTransaction()
    
    await trx.table('user_access_tokens').insert({
      user_id     : userId,
      token       : hash,
      created_at  : new Date(),
    })
    
    const record = await trx.table('user_access_tokens').orderBy('id', 'desc').first()
  
    await trx.commit()

    return {
      token    : `${record.id}|${plain}`,
      tokenId  : record.id
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
  async verifyAccessToken(token: string) {
    let idPart: string | null = null
    let plain = token
  
    if (token.includes('|')) {
      const [id, tokenPart] = token.split('|', 2)
      idPart = id
      plain = tokenPart
    }
  
    const hash = crypto.createHash('sha256').update(plain).digest('hex')
    let tokenRecord = null
  
    if (idPart) {
      tokenRecord = await db.table('user_access_tokens').where("id", idPart).where("token", hash).first()
    } else {
      tokenRecord = await db.table('user_access_tokens').where("token", hash).first()
    }
  
    if (!tokenRecord) return null
  
    await db.table('user_access_tokens').where("id", tokenRecord.id).update({ last_used_at: new Date() })
  
    const user = await User.query().find(tokenRecord.user_id)

    return { user, token: tokenRecord }
  },



  // =====================================>
  // ## Auth: create user mail token
  // =====================================>
  async createUserMailToken(userId: number) {
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = crypto.createHash('sha256').update(token).digest('hex')
  
    const trx = await db.beginTransaction()

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
  }
}