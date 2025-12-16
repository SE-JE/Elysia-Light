import { permission } from "@utils";

export class BaseController {
    static async index() {
        return {
            message: `Welcome to the API of ${process.env.APP_NAME}!`,
        };
    }

    static async feature() {
        return permission.getFeatures()
    }

    static async access() {
        return permission.getAccesses()
    }
}