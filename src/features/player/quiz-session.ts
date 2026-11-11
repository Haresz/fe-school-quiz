import type { PlayerQuiz } from '@/api/player'

export type QuizSession = {
  questionOrder: string[]
  optionOrders: Record<string, number[]>
}

export type RandomInt = (maxExclusive: number) => number

const UINT32_RANGE = 4294967296

function randomIntFromCrypto(maxExclusive: number): number {
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive)
  const buffer = new Uint32Array(1)

  let value: number
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)

  return value % maxExclusive
}

function shuffled<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const item = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = item
  }

  return copy
}

export function createQuizSession(
  quiz: PlayerQuiz,
  randomInt: RandomInt = randomIntFromCrypto,
): QuizSession {
  const questionIds = quiz.questions.map((question) => question.id)
  const questionOrder = quiz.shuffleQuestions
    ? shuffled(questionIds, randomInt)
    : questionIds

  const optionOrders: Record<string, number[]> = {}
  for (const question of quiz.questions) {
    const optionCount = question.options?.length ?? 0
    const indexes = Array.from({ length: optionCount }, (_, index) => index)

    optionOrders[question.id] =
      quiz.shuffleOptions && optionCount > 1
        ? shuffled(indexes, randomInt)
        : indexes
  }

  return { questionOrder, optionOrders }
}
