import { Field, Model } from '@utils'

export class User extends Model {
    @Field(["fillable", "selectable", "searchable"])
    name!: string

    @Field(["fillable", "selectable", "searchable"])
    email!: string

    @Field(["fillable"])
    password!: string

    @Field(["fillable", "selectable"])
    image!: string

    @Field(["fillable", "selectable", "searchable"])
    email_verification_at!: Date
}