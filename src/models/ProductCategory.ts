import { Field, Model } from '@utils/model.util'

export class ProductCategory extends Model {
    @Field(["fillable", "selectable", "searchable"])
    name!: string
}