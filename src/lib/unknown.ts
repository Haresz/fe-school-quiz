export type UnknownRecord = Record<string, unknown>

export function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord
  }
  return undefined
}

export function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

export function readRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return undefined
    }
  }
  return asRecord(value)
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return undefined
}

export function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function readStringArray(value: unknown): string[] | undefined {
  const values = typeof value === 'string' ? safeJsonArray(value) : asArray(value)
  if (!values) return undefined

  const strings = values.filter((item): item is string => typeof item === 'string')
  return strings.length === values.length ? strings : undefined
}

function safeJsonArray(value: string): unknown[] | undefined {
  try {
    return asArray(JSON.parse(value))
  } catch {
    return undefined
  }
}
