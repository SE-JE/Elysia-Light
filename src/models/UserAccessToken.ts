import { Model } from '@utils'


export class UserAccessToken extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","selectable"])
    user_id!: any

@Field(["fillable","selectable"])
    agent!: any

@Field(["fillable","selectable","hidden"])
    token!: any

@Field(["fillable","selectable"])
    permissions!: any

@Field(["fillable","selectable"])
    last_used_ip!: any

@Field(["fillable","selectable"])
    last_used_at!: any

@Field(["fillable","selectable"])
    expired_at!: any


    // =====================>
    // ## Attribute
    // =====================>
    


    // =========================>
    // ## Relations
    // =========================>
    


    // =====================>
    // ## Hook
    // =====================>
    constructor () {
        super()
        
    }
}