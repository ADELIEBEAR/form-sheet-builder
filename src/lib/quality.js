export const QUALITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '정상' },
  { value: 'duplicate', label: '중복' },
  { value: 'invalid', label: '불량' },
]

export const QUALITY_LABELS = {
  normal: '정상',
  duplicate: '중복 DB',
  invalid: '불량 DB',
}

export function normalizeQualityStatus(value) {
  return ['normal', 'duplicate', 'invalid'].includes(value) ? value : 'normal'
}

export function qualityLabel(value) {
  return QUALITY_LABELS[normalizeQualityStatus(value)]
}

export function qualityReasonText(reasons) {
  return Array.isArray(reasons) && reasons.length ? reasons.join(' · ') : '자동 검사 통과'
}

export function countQuality(submissions) {
  return (submissions || []).reduce((counts, submission) => {
    const status = normalizeQualityStatus(submission.qualityStatus)
    counts[status] += 1
    return counts
  }, { normal: 0, duplicate: 0, invalid: 0 })
}
