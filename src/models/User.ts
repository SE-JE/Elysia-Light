import { Model } from '@utils/model.util'

export class User extends Model {
    // =====================>
    // ## Fillable
    // =====================>
    public fillable    =  [
        "name",
        "email",
        "password"
    ]

    // ====================>
    // ## Selectable
    // ====================>
    public selectable  =  [
        "name",
        "id",
        "email",
        "created_at"
    ]

    // ====================>
    // ## Searchable
    // ====================>
    public searchable  =  [
        "name",
        "email"
    ]
}