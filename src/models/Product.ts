import { Attribute, BelongsTo, Field, HasMany, Model } from '@utils/model.util'
import { ProductCategory, ProductLocation } from '@models'

export class Product extends Model {
    @Field(["fillable", "selectable", "searchable"])
    name!: string

    @Field(["fillable", "selectable"])
    description!: string

    @Field(["number", "fillable", "selectable"])
    product_category_id!: number

    @Field(["fillable", "selectable"])
    price!: number

    @Field(["fillable", "selectable"])
    buy_price!: number


    @BelongsTo(() => ProductCategory, "product_category_id")
    category!: ProductCategory

    @HasMany(() => ProductLocation, "product_id")
    product_locations!: ProductLocation


    @Attribute()
    profit() {
        if(!this.price || ! this.buy_price) return null;

        return this.price - this.buy_price
    }
}