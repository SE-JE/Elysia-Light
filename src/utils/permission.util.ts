import { ControllerContext, status } from "elysia"

type   KeyDigit            =  "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"
export type KeyFeature     =  `${"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"}${KeyDigit}${KeyDigit}`
export type KeyAccess      =  `${KeyDigit}${KeyDigit}`
export type KeyPermission  =  `${KeyFeature}.${KeyAccess}` | KeyAccess

const features = new Map<KeyFeature, { key: KeyFeature; name: string }>()
const accesses = new Map<KeyAccess, any>()

type FeatureAccess = Partial<Record<KeyFeature, {
  name: string
  accesses: Partial<Record<KeyAccess, string>>
}>>

export const permission = {
  register: (def: FeatureAccess) => {
    const featureAccessMap = new Map<string, string>()
    let defaultFeature: KeyFeature | null = null

    for (const [featureKey, feature] of Object.entries(def)) {
      if (!defaultFeature) defaultFeature = featureKey as KeyFeature

      registerFeature({
        key: featureKey as KeyFeature,
        name: feature.name
      })

      for (const [accessKey, accessName] of Object.entries(feature.accesses)) {
        const permKey =
          `${featureKey}.${String(accessKey).padStart(2, "0")}`

        registerAccess({
          featureKey,
          accessKey,
          accessName,
          permKey
        })

        featureAccessMap.set(
          `${featureKey}.${accessKey}`,
          permKey
        )
      }
    }

    return createScopeApi(defaultFeature!)
  },
  
  getFeatures: () => [...features.values()],

  getAccesses: () => {
    const result: Record<string, {
      key: string
      name: string
      accesses: { key: string; name: string }[]
    }> = {}

    for (const feature of features.values()) {
      result[String(feature.key)] = {
        key: String(feature.key),
        name: feature.name,
        accesses: []
      }
    }

    for (const access of accesses.values()) {
      const featureKey = String(access.featureKey)

      if (!result[featureKey]) continue

      result[featureKey].accesses.push({
        key: String(access.accessKey).padStart(2, "0"),
        name: access.accessName
      })
    }

    return Object.values(result)
  },
}


function normalize(
  raw: KeyPermission,
  defaultFeature?: KeyFeature
): KeyPermission {
  if (!raw.includes(".") && defaultFeature) {
    return `${defaultFeature}.${String(raw).padStart(2, "0") as KeyAccess}`
  }

  return raw
}

function registerFeature(f: { key: KeyFeature; name: string }) {
  if (!features.has(f.key)) {
    features.set(f.key, f)
  }
}

function registerAccess(a: any) {
  if (!accesses.has(a.permKey)) {
    accesses.set(a.permKey, a)
  }
}

function createPermission(keys: KeyPermission[]) {
  return {
    keys,

    orHave(raw: KeyPermission) {
      return createPermission([
        ...this.keys,
        normalize(raw) as KeyPermission
      ])
    },

    guard(c: ControllerContext) {
      const permissions = new Set(c.permissions || [])

      const ok = this.keys.some(k => permissions?.has(k))
      if (!ok) {
        c.responseForbidden()
      }
    }
  }
}

export function createScopeApi(defaultFeature: KeyFeature) {
  return {
    have(raw: KeyPermission) {
      const key = normalize(raw, defaultFeature)
      return createPermission([key])
    }
  }
}

