import validator from "validator"
import { db } from "@utils"



// ==========================>
// ## Validation: Rules of validation
// ==========================>
type RuleName =
  | "required"
  | "string"
  | "numeric"
  | "boolean"
  | "email"
  | "url"
  | "date"
  | "min"
  | "max"
  | "between"
  | "in"
  | "not_in"
  | "confirmed"
  | "same"
  | "different"
  | "regex"
  | "unique"
  | "exists"

export type Rules = Record<string, string>

export interface ValidationResult {
  valid   :  boolean
  errors  :  Record<string, string[]>
}



// ==================================>
// ## Check validate field from rules
// ==================================>
export async function validate(data: Record<string, any>, rules: Rules): Promise<ValidationResult> {
  const errors: Record<string, string[]> = {}

  for (const field in rules) {
    const value = getNestedValue(data, field) ?? ""
    const fieldRules = rules[field].split("|")

    for (const rule of fieldRules) {
      let [name, param] = rule.split(":") as [RuleName, string | undefined]

      switch (name) {
        // === BASIC ===
        case "required":
          if (validator.isEmpty(String(value).trim())) {
            addError(errors, field, `${field} wajib diisi`)
          }
          break

        case "string":
          if (typeof value !== "string") {
            addError(errors, field, `${field} harus berupa string`)
          }
          break

        case "numeric":
          if (!validator.isNumeric(String(value))) {
            addError(errors, field, `${field} harus berupa angka`)
          }
          break

        case "boolean":
          if (!(value === true || value === false || value === "true" || value === "false" || value === 1 || value === 0)) {
            addError(errors, field, `${field} harus berupa boolean`)
          }
          break

        case "email":
          if (!validator.isEmail(String(value))) {
            addError(errors, field, `${field} harus berupa email yang valid`)
          }
          break

        case "url":
          if (!validator.isURL(String(value))) {
            addError(errors, field, `${field} harus berupa URL yang valid`)
          }
          break

        case "date":
          if (!validator.isDate(String(value))) {
            addError(errors, field, `${field} harus berupa tanggal yang valid`)
          }
          break

        // === LENGTH ===
        case "min":
          if (!validator.isLength(String(value), { min: parseInt(param!) })) {
            addError(errors, field, `${field} minimal ${param} karakter`)
          }
          break

        case "max":
          if (!validator.isLength(String(value), { max: parseInt(param!) })) {
            addError(errors, field, `${field} maksimal ${param} karakter`)
          }
          break

        case "between":
          const [minVal, maxVal] = param!.split(",").map(Number)
          if (!validator.isLength(String(value), { min: minVal, max: maxVal })) {
            addError(errors, field, `${field} harus antara ${minVal} - ${maxVal} karakter`)
          }
          break

        // === SET MEMBERSHIP ===
        case "in":
          const allowed = param!.split(",")
          if (!allowed.includes(String(value))) {
            addError(errors, field, `${field} harus salah satu dari: ${allowed.join(", ")}`)
          }
          break

        case "not_in":
          const notAllowed = param!.split(",")
          if (notAllowed.includes(String(value))) {
            addError(errors, field, `${field} tidak boleh salah satu dari: ${notAllowed.join(", ")}`)
          }
          break

        // === RELATIONAL ===
        case "confirmed":
          if (value !== getNestedValue(data, `${field}_confirmation`)) {
            addError(errors, field, `${field} tidak sama dengan konfirmasi`)
          }
          break

        case "same":
          if (value !== getNestedValue(data, param!)) {
            addError(errors, field, `${field} harus sama dengan ${param}`)
          }
          break

        case "different":
          if (value === getNestedValue(data, param!)) {
            addError(errors, field, `${field} harus berbeda dengan ${param}`)
          }
          break

        // === REGEX ===
        case "regex":
          try {
            const pattern = new RegExp(param!)
            if (!pattern.test(String(value))) {
              addError(errors, field, `${field} tidak sesuai format`)
            }
          } catch {
            addError(errors, field, `Regex rule untuk ${field} tidak valid`)
          }
          break

        // === DATABASE VALIDATION ===
        case "unique":
        {
          const [table, column, exceptId] = param!.split(",")
          const query = db.table(table).where(column, value)
          if (exceptId) query.whereNot("id", exceptId)
          const existing = await query.first()
          if (existing) {
            addError(errors, field, `${field} sudah digunakan`)
          }
        }
        break

        case "exists":
        {
          const [table, column] = param!.split(",")
          const existing = await db.table(table).where(column, value).first()
          if (!existing) {
            addError(errors, field, `${field} tidak ditemukan di ${table}`)
          }
        }
        break
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}



// ==================================>
// ## Validation helpers
// ==================================>
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined

  const normalizedPath = path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\["([^"]+)"\]/g, '.$1')

  return normalizedPath.split('.').reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key]
    }
    return undefined
  }, obj)
}

function addError(errors: Record<string, string[]>, field: string, message: string) {
  errors[field] = [...(errors[field] || []), message]
}