import { describe, expect, it } from 'vitest'
import { responseIdentity, submissionNumberMap, submissionTimeParts } from '../src/lib/responseIdentity'

describe('all response identity', () => {
  it('finds the answered name and phone fields from the project schema', () => {
    const project = { pages: [{ fields: [
      { id: 'nickname', type: 'short', label: '이름 또는 닉네임을 알려주세요' },
      { id: 'contact', type: 'phone', label: '연락 가능한 번호를 입력해 주세요' },
      { id: 'choice', type: 'single', label: '관심 종목' },
    ] }] }

    expect(responseIdentity(project, { nickname: '테스트맨', contact: '010-1234-5678', choice: '삼성전자' })).toEqual({
      name: '테스트맨',
      phone: '010-1234-5678',
    })
  })

  it('does not mistake unrelated answers for missing identity fields', () => {
    const project = { pages: [{ fields: [{ id: 'choice', type: 'single', label: '관심 종목' }] }] }
    expect(responseIdentity(project, { choice: '삼성전자' })).toEqual({ name: '—', phone: '—' })
  })

  it('returns a safe placeholder for an invalid submitted time', () => {
    expect(submissionTimeParts('not-a-date')).toEqual({ date: '—', time: '' })
  })

  it('keeps the newest submission on the highest sequence number', () => {
    const sequence = submissionNumberMap([
      { id: 'newest', submittedAt: '2026-08-06T15:56:51+09:00' },
      { id: 'oldest', submittedAt: '2026-08-05T18:04:35+09:00' },
      { id: 'middle', submittedAt: '2026-08-06T10:52:12+09:00' },
    ])

    expect(sequence.get('oldest')).toBe(1)
    expect(sequence.get('middle')).toBe(2)
    expect(sequence.get('newest')).toBe(3)
  })
})
