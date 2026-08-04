import { describe, expect, it } from 'vitest'
import { buildXlsx } from '../src/lib/xlsx'

describe('Excel export', () => {
  it('creates a real XLSX zip package with Korean text', () => {
    const bytes = buildXlsx([['제출 시각', '이름'], ['2026. 8. 4.', '홍길동']])
    const binary = Buffer.from(bytes)
    expect(binary.subarray(0, 4).toString('hex')).toBe('504b0304')
    expect(binary.includes(Buffer.from('[Content_Types].xml'))).toBe(true)
    expect(binary.includes(Buffer.from('xl/worksheets/sheet1.xml'))).toBe(true)
    expect(binary.includes(Buffer.from('홍길동'))).toBe(true)
  })
})
