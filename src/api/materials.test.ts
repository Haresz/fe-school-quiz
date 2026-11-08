import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { listActiveMaterials } from './materials'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockedFrom = vi.mocked(supabase.from)

const materialRows = [
  {
    id: 'material-1',
    subject: 'Matematika',
    grade: 5,
    topic: 'Pecahan',
    description: 'Penjumlahan dan pengurangan pecahan.',
  },
]

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.order
    .mockReturnValueOnce(builder)
    .mockReturnValueOnce(builder)
    .mockResolvedValueOnce(result)
  return builder
}

describe('listActiveMaterials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memuat materi aktif yang diurutkan untuk pembuat kuis', async () => {
    const builder = makeBuilder({ data: materialRows, error: null })
    mockedFrom.mockReturnValue(builder as never)

    const result = await listActiveMaterials()

    expect(mockedFrom).toHaveBeenCalledWith('materials')
    expect(builder.select).toHaveBeenCalledWith(
      'id, subject, grade, topic, description',
    )
    expect(builder.eq).toHaveBeenCalledWith('is_active', true)
    expect(builder.order).toHaveBeenNthCalledWith(1, 'subject', {
      ascending: true,
    })
    expect(builder.order).toHaveBeenNthCalledWith(2, 'grade', {
      ascending: true,
    })
    expect(builder.order).toHaveBeenNthCalledWith(3, 'topic', {
      ascending: true,
    })
    expect(result).toEqual(materialRows)
  })

  it('mengembalikan daftar kosong saat belum ada materi aktif', async () => {
    mockedFrom.mockReturnValue(
      makeBuilder({ data: null, error: null }) as never,
    )

    await expect(listActiveMaterials()).resolves.toEqual([])
  })

  it('memetakan kegagalan memuat materi', async () => {
    mockedFrom.mockReturnValue(
      makeBuilder({
        data: null,
        error: { message: 'permission denied' },
      }) as never,
    )

    await expect(listActiveMaterials()).rejects.toMatchObject({
      code: 'load_failed',
    })
  })
})
