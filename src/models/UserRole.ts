import { Model } from '@utils'
import Role from '@/models/Role'
import User from '@/models/User'


export class UserRole extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","selectable"])
    user_id!: any

@Field(["fillable","selectable"])
    role_id!: any


    // =====================>
    // ## Attribute
    // =====================>
    


    // =========================>
    // ## Relations
    // =========================>
    @BelongsTo(() => Role, "role_id", "id")
      role!: Role

@BelongsTo(() => User, "user_id", "id")
      user!: User


    // =====================>
    // ## Hook
    // =====================>
    constructor () {
        super()
        
    }
}