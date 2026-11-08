export const QUIZ_CODE_LENGTH = 6

export function normalizeQuizCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, QUIZ_CODE_LENGTH)
}
