import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { id } from '@/i18n/id'
import { cn } from '@/lib/cn'
import { normalizeQuizCode, QUIZ_CODE_LENGTH } from '@/lib/quiz-code'

export type CodeInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  invalid?: boolean
  autoFocus?: boolean
  describedBy?: string
}

export function CodeInput({
  value,
  onChange,
  invalid = false,
  autoFocus = false,
  describedBy,
}: CodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const chars = Array.from(
    { length: QUIZ_CODE_LENGTH },
    (_, index) => value[index] ?? '',
  )

  const focusAt = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), QUIZ_CODE_LENGTH - 1)
    inputRefs.current[nextIndex]?.focus()
  }

  const replaceAt = (index: number, nextChars: string[]) => {
    const next = [...chars]
    nextChars.forEach((char, offset) => {
      if (index + offset < QUIZ_CODE_LENGTH) next[index + offset] = char
    })
    onChange(next)
  }

  const handleChange = (index: number, rawValue: string) => {
    const normalized = normalizeQuizCode(rawValue)
    if (!normalized) {
      replaceAt(index, [''])
      return
    }

    if (normalized.length === 1) {
      replaceAt(index, [normalized])
      if (index < QUIZ_CODE_LENGTH - 1) focusAt(index + 1)
      return
    }

    replaceAt(index, normalized.split(''))
    focusAt(index + normalized.length)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !chars[index] && index > 0) {
      event.preventDefault()
      replaceAt(index - 1, [''])
      focusAt(index - 1)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusAt(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusAt(QUIZ_CODE_LENGTH - 1)
    }
  }

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = normalizeQuizCode(event.clipboardData.getData('text'))
    if (!pasted) return

    const startIndex = pasted.length >= QUIZ_CODE_LENGTH ? 0 : index
    replaceAt(startIndex, pasted.split(''))
    focusAt(startIndex + pasted.length)
  }

  return (
    <div
      role="group"
      aria-label={id.home.codeLabel}
      aria-describedby={describedBy}
      className="grid w-full max-w-[328px] grid-cols-6 gap-2"
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node
          }}
          value={char}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={`Karakter ${index + 1} dari ${QUIZ_CODE_LENGTH}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus && index === 0}
          enterKeyHint="go"
          inputMode="text"
          maxLength={1}
          pattern="[A-Z0-9]*"
          spellCheck={false}
          className={cn(
            'aspect-[4/5] min-w-0 rounded-input border-2 bg-white text-center font-display text-2xl font-semibold uppercase text-ink caret-blue focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
            invalid ? 'border-coral' : 'border-ink',
          )}
        />
      ))}
    </div>
  )
}
