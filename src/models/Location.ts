import { Field, Model } from '@utils/model.util'

export class Location extends Model {
    @Field(["fillable", "selectable", "searchable"])
    name!: string
}