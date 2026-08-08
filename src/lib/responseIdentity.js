function answerText(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '').trim()
}

export function responseIdentity(project, answers) {
  const fields = (project?.pages || []).flatMap((page) => page.fields || [])
  const answered = (field) => answerText(answers?.[field?.id])
  const phoneField = fields.find((field) => field.type === 'phone' && answered(field))
    || fields.find((field) => /(연락처|전화번호|휴대폰|핸드폰|전화|연락 가능한 번호)/.test(field.label || '') && answered(field))
  const exactNameField = fields.find((field) => /^(이름|성함|신청자 이름|예약자 이름|고객명)$/.test((field.label || '').trim()) && answered(field))
  const nameField = exactNameField
    || fields.find((field) => /(이름|성함|닉네임|신청자|예약자|담당자)/.test(field.label || '') && answered(field))

  return {
    name: answered(nameField) || '—',
    phone: answered(phoneField) || '—',
  }
}

export function submissionTimeParts(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' }
  return {
    date: new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(date),
    time: new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(date),
  }
}

export function submissionNumberMap(submissions) {
  const ordered = [...submissions].sort((left, right) => {
    const leftTime = new Date(left.submittedAt).getTime()
    const rightTime = new Date(right.submittedAt).getTime()
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0
    return leftTime - rightTime
  })

  return new Map(ordered.map((submission, index) => [submission.id, index + 1]))
}
