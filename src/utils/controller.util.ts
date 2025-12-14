import fs from "fs";
import path from "path";
import "elysia";
import { Elysia, Context } from "elysia";
import { validate, Rules, logger } from "@utils";



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

    validation              :  (rules: any) => any;
    responseError           :  (...args: any[]) => any;
    responseErrorValidation :  (errors: Record<string, string[]>) => any;
    responseSaved           :  (data: any, message?: string) => any;
    responseSuccess         :  (data: any, message?: string) => any;
    uploadFile              :  (file: File, folder?: string) => Promise<string>;
    deleteFile              :  (filePath: string) => void;
    user                   ?:  any
    payload                ?:  any
  }
}



export const Controller = (app: Elysia) => app.derive(({ query, body, status }) => ({

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
    expand            :  query.selectable        ?   JSON.parse(query.expand)                      :    [],
  },



  // ===================================>
  // ## Validation request body
  // ===================================>
  validation: async (rules: Rules) => {
    const result = await validate(body as Record<string, any>, rules);
    
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
  responseError: (error: string, section?: string, message?: string, debug = (process.env.APP_DEBUG || true)) => {
    logger.error(`Body parse error: ${error}`, { error: error, feature: section })

    if (debug) {
      throw status(500, {
        message  :  message ?? "Error: Server Side Having Problem!",
        error    :  error ?? "unknown",
        section  :  section ?? "unknown",
      })
    }

    throw status(500, {
      message: message ?? "Error: Server Side Having Problem!"
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
  uploadFile: async (file: File, folder = "uploads"): Promise<string> => {
    const dir = path.resolve("storage", "public", folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 18)}${path.extname(file.name).toLowerCase()}`;
    const filePath = path.join(dir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    fs.writeFileSync(filePath, buffer);

    return `/${folder}/${fileName}`
  },



  // ==================================>
  // ## Delete File
  // ==================================>
  deleteFile: (filePath: string) => {
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); return true; }
    return false;
  },
}));