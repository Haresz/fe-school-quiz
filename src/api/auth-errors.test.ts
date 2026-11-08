import { describe, expect, it } from 'vitest'
import { AuthApiError, mapAuthError } from './auth-errors'

describe('mapAuthError', () => {
  it('memetakan kredensial salah', () => {
    expect(mapAuthError({ code: 'invalid_credentials', status: 400 }).code).toBe(
      'invalid_credentials',
    )
  })

  it('memetakan email belum dikonfirmasi', () => {
    expect(mapAuthError({ code: 'email_not_confirmed', status: 400 }).code).toBe(
      'email_not_confirmed',
    )
  })

  it('memetakan email yang sudah terdaftar', () => {
    expect(mapAuthError({ code: 'user_already_exists', status: 400 }).code).toBe(
      'user_already_exists',
    )
  })

  it('memetakan kata sandi lemah', () => {
    expect(mapAuthError({ code: 'weak_password', status: 422 }).code).toBe('weak_password')
  })

  it('memetakan batas percobaan', () => {
    expect(mapAuthError({ status: 429 }).code).toBe('rate_limited')
  })

  it('memetakan gangguan jaringan', () => {
    expect(mapAuthError({ name: 'AuthRetryableFetchError' }).code).toBe('network')
  })

  it('mempertahankan AuthApiError yang sudah dipetakan', () => {
    const error = new AuthApiError('unknown')
    expect(mapAuthError(error)).toBe(error)
  })
})
