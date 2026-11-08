import { describe, expect, it } from 'vitest'
import { id } from '@/i18n/id'
import { getResultSummary } from './player-result'

describe('getResultSummary', () => {
  it('memberi tiga bintang untuk skor 80 persen ke atas', () => {
    expect(getResultSummary(8, 10)).toEqual({
      percent: 80,
      message: id.player.result.stampGreat,
      stars: 3,
    })
  })

  it('memberi dua bintang untuk skor 50 sampai 79 persen', () => {
    expect(getResultSummary(2, 3)).toEqual({
      percent: 67,
      message: id.player.result.stampGood,
      stars: 2,
    })
  })

  it('memberi satu bintang dan ajakan mencoba lagi untuk skor rendah', () => {
    expect(getResultSummary(4, 10)).toEqual({
      percent: 40,
      message: id.player.result.stampTry,
      stars: 1,
    })
  })
})
