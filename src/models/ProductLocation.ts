import { BelongsTo, Field, Model } from '@utils/model.util'
import { Location } from '@models'

export class ProductLocation extends Model {
    @Field(["fillable", "selectable"])
    product_id!: number

    @Field(["fillable", "selectable"])
    location_id!: number

    @BelongsTo(() => Location, "location_id")
    location!: Location
}