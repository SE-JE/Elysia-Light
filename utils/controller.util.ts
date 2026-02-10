import fs from "fs";
import path from "path";
import "elysia";
import { Elysia, Context } from "elysia";
import { validate, logger, KeyPermission, db, ValidationRules, ValidationRule } from "@utils";



declare module "elysia" {
  interface ControllerContext extends Context {
    getQuery                :  {
      paginate            :  number;
      page                :  number;
      sort                :  string[];
      filter              :  Record<string, string>;
      search              :  string;
      searchable          :  string[];
      selectable          :  string[];
      selectableOption    :  string[];
      expand              :  string[];
    };

    responseData            :  (
      data                :  any[],
      totalRow           ?:  number,
      message            ?:  string,
      columns            ?:  string[],
      access             ?:  string[]
    ) => { 
      status                : number; 
      body                  : any 
    };

    validation              :  <T extends object>(rules: Partial<Record<keyof T | string, ValidationRule[] | string>>) => any;
    responseError           :  (error: any, section?: string, message?: string, debug?: boolean) => any;
    responseErrorValidation :  (errors: Record<string, string[]>) => any;
    responseSaved           :  (data: any, message?: string) => any;
    responseSuccess         :  (data: any, message?: string) => any;
    responseForbidden       :  (message?: string) => any;
    uploadFile              :  (file: File, folder?: string) => Promise<string>;
    deleteFile              :  (filePath: string) => void;
    user                   ?:  any
    permissions            ?:  KeyPermission[],
    payload                 :  Record<string, any>
  }
}

export type ValidationRulesFor<T> = Partial<
  Record<keyof T | string, ValidationRule[] | string>
>


export const controller = (app: Elysia) => app.derive(({ query, body, status }) => ({

  // =====================================>
  // ## Basic fetching data query
  // =====================================>
  getQuery: {
    page              :  query.page              ?   Number(query.page)                                  :    1,
    paginate          :  query.paginate          ?   Number(query.paginate)                              :    10,
    search            :  query.search            ?   query.search                                        :    "",
    sort              :  query.sort              ?   JSON.parse(query.sort)                        :   ["created_at desc"],
    filter            :  query.filter            ?   JSON.parse(query.filter)                      :    [],
    searchable        :  query.searchable        ?   JSON.parse(query.searchable)                  :    [],
    selectable        :  query.selectable        ?   JSON.parse(query.selectable)                  :    [],
    selectableOption  :  query.selectableOption  ?   JSON.parse(query.selectableOption)            :    [],
    expand            :  query.expand            ?   JSON.parse(query.expand)                      :    [],
  },



  // ===================================>
  // ## Validation request body
  // ===================================>
  validation: async <T extends object>(
    rules: Partial<Record<keyof T | string, ValidationRules[] | string>>
  ) => {
    const result = await validate(
      body as Record<string, any>,
      rules as ValidationRules
    )

    if (!result.valid) {
      throw status(422, {
        message: "Error: Unprocessable Entity!",
        errors: result.errors,
      })
    }
  },




  // ====================================>
  // ## Response error validation
  // ====================================>
  responseErrorValidation: (errors: Record<string, string[]>) => {
    throw status(422, {
      message: "Error: Unprocessable Entity!",
      errors: errors,
    })
  },



  // ====================================>
  // ## Response error
  // ====================================>
  responseError: (error: any, section?: string, message?: string, debug = (process.env.APP_DEBUG || true)) => {
    logger.error(`Error: ${error}`, { error: error, feature: section })

    if (debug) {
      throw status(500, {
        message  :  message ?? "Error: Server Side Having Problem!",
        error    :  error?.message ?? "unknown",
        section  :  section ?? "unknown",
      })
    }

    throw status(500, {
      message: message ?? "Error: Server Side Having Problem!"
    })
  },


  // ====================================>
  // ## Response Forbidden
  // ====================================>
  responseForbidden: (message?: string) => {
    throw status(403, {
      message: message ?? "Access Forbidden!"
    })
  },


  // ====================================> 
  // ## Response record
  // ====================================>
  responseData: (data: any[], totalRow?: number, message?: string) => {
    throw status(200, {
      message    :  message ?? (data.length ? "Success" : "Empty data"),
      data       :  data ?? [],
      total_row  :  totalRow ?? null,
    });
  },



  // ===================================>
  // ## Response success
  // ===================================>
  responseSuccess: (data: any, message?: string, code?: 200 | 201) => {
    throw status(code || 200, {
      message  :  message ?? "Success",
      data     :  data ?? [],
    })
  },



  // ===================================>
  // ## Response saved record
  // ===================================>
  responseSaved: (data: any, message?: string) => {
    throw status(201, {
      message  :  message ?? "Success",
      data     :  data ?? [],
    })
  },



  // ===================================>
  // ## Upload file
  // ===================================>
  uploadFile: async (file: File, folder = "uploads", options?: { disk?: "public" | "private", owner_id?: number, permissions?: { user_id?: number; role_id?: number }[]}): Promise<string> => {
    const disk = options?.disk ?? "public"

    const dir = path.resolve("storage", disk, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 18)}${path.extname(file.name).toLowerCase()}`;
    const filePath = path.join(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    fs.writeFileSync(filePath, buffer);

    const relativePath = `/${folder}/${fileName}`

    if(options) {
      const [storage] = await db("storages").insert({
        user_id     :  options?.owner_id ?? null,
        disk        :  disk,
        path        :  relativePath,
        filename    :  file.name,
        filetype    :  file.type,
        filesize    :  buffer.length,
        created_at  :  new Date(),
      }).returning(["id"])

      if (options?.permissions?.length) {
        const permissions = options.permissions.map(p => ({
          storage_id  :  storage.id,
          user_id     :  p.user_id ?? null,
          role_id     :  p.role_id ?? null,
          created_at  :  new Date(),
        }))

        await db("storage_permissions").insert(permissions)
      }
    }


    return relativePath
  },



  // ==================================>
  // ## Delete File
  // ==================================>
  deleteFile: async (filePath: string) => {
    if (fs.existsSync(filePath)) { 
      const record = await db("storages").where("path", filePath).first()
      
      if(record) {
        await db("storages").where("id", record.id).delete()
        await db("storage_permissions").where("storage_id", record.id).delete()
      }

      fs.unlinkSync(filePath); return true; 
    }
  
    return false;
  },
}));