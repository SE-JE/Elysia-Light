import { Model } from '@utils'


export class Permission extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","selectable"])
    user_id!: any

@Field(["fillable","selectable"])
    role_id!: any

@Field(["fillable","selectable"])
    permissions!: any


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