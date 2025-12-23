import { Field, Model } from '@utils'

export class User extends Model {
    @Field(["fillable", "selectable", "searchable"])
    name!: string

    @Field(["fillable", "selectable", "searchable"])
    email!: string

    @Field(["fillable"])
    password!: string
}