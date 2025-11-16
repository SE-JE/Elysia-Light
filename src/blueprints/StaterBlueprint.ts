import { blueprint } from "@utils/commands/runner/blueprint";



// =================================>
// ## Run of stater blueprint
// =================================>
export class StarterBlueprint {
  async run() {
    await blueprint([
      {
        model: "FeatureGroup",
        schema: {
          name: "type:string,20 unique required fillable searchable selectable",
        },
        relations: {
          features: "[]Feature",
        },
        controllers: {
          "feature-groups": "Feature/FeatureGroupController",
        },
        seeders: [["Dashboard"], ["Pengguna"]],
      },
      {
        model: "Feature",
        schema: {
          feature_group_id: "type:bigInteger foreignIdFor:FeatureGroup fillable selectable index",
          code: "type:string,3 unique required fillable searchable selectable index",
          name: "type:string,20 unique required fillable searchable selectable",
          description: "type:string,255 fillable searchable selectable index",
        },
        relations: {
          accesses: "[]FeatureAccess",
          group: "FeatureGroup,feature_group_id,id",
        },
        controllers: {
          features: "Feature/FeatureController",
        },
        seeders: [
          [1, "101", "Dashboard", "Halaman Dashboard"],
          [2, "102", "Manajemen Pengguna", "Halaman Manajemen Pengguna"],
          [2, "103", "Manajemen Role", "Halaman Manajemen Role"],
        ],
      },
      {
        model: "FeatureAccess",
        schema: {
          feature_id: "type:bigInteger foreignIdFor:Feature selectable index",
          code: "type:string,2 required fillable searchable selectable index",
          name: "type:string,20 required fillable searchable selectable",
        },
        relations: {
          feature: "Feature",
        },
        controllers: {
          "feature-accesses": "Feature/FeatureAccessController",
        },
        seeders: [
          [1, "1", "Melihat"],
          [2, "1", "Melihat"],
          [2, "2", "Membuat"],
          [2, "3", "Mengubah"],
          [2, "4", "Menghapus"],
          [3, "1", "Melihat"],
          [3, "2", "Mengubah"],
        ],
      },
    ]);
  }
}
