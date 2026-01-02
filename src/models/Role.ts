import { Model } from '@utils'


export class Role extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","searchable","selectable"])
    name!: any


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