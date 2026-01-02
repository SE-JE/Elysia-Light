import { Model } from '@utils'


export class Product extends Model {
    // =====================>
    // ## Field
    // =====================>
    @Field(["fillable","searchable","selectable"])
    name!: any

@Field(["fillable","searchable","selectable"])
    price!: any

@Field(["fillable","selectable"])
    description!: any


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