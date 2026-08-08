import { describe, expect, it } from 'vitest'
import { countQuality, normalizeQualityStatus, qualityLabel, qualityReasonText } from '../src/lib/quality'

describe('response quality helpers', () => {
  it('counts normal, duplicate, and invalid submissions independently', () => {
    expect(countQuality([
      { qualityStatus: 'normal' },
      { qualityStatus: 'duplicate' },
      { qualityStatus: 'invalid' },
      { qualityStatus: 'duplicate' },
    ])).toEqual({ normal: 1, duplicate: 2, invalid: 1 })
  })

  it('falls back to normal for legacy rows and formats stable labels', () => {
    expect(normalizeQualityStatus(undefined)).toBe('normal')
    expect(qualityLabel('duplicate')).toBe('중복 DB')
    expect(qualityLabel('invalid')).toBe('불량 DB')
    expect(qualityReasonText([])).toBe('자동 검사 통과')
    expect(qualityReasonText(['연락처 중복', '관리자 확인'])).toBe('연락처 중복 · 관리자 확인')
  })
})
