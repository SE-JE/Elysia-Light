import { Model } from '@utils'
import Role from '@/models/Role'
import Permission from '@/models/Permission'


export class User extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","searchable","selectable"])
    name!: any

@Field(["fillable","searchable","selectable"])
    email!: any

@Field(["fillable","hidden"])
    password!: any

@Field(["fillable","selectable"])
    image!: any

email_verification_at!: any


    // =====================>
    // ## Attribute
    // =====================>
    


    // =========================>
    // ## Relations
    // =========================>
    @BelongsToMany(() => Role, "roles_id", "id")
      roles!: Role[]

@HasOne(() => Permission, "permission_id", "id")
      permission!: Permission


    // =====================>
    // ## Hook
    // =====================>
    constructor () {
        super()
        
    }
}