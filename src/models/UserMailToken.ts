import { Model } from '@utils'


export class UserMailToken extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","selectable"])
    user_id!: any

@Field(["fillable","selectable","hidden"])
    type!: any

@Field(["fillable","selectable","hidden"])
    token!: any

@Field(["fillable","selectable"])
    used_at!: any

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