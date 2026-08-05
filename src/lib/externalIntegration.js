import { SUPABASE_URL } from './supabase'

export const EXTERNAL_SUBMIT_URL = `${SUPABASE_URL}/functions/v1/form-maker-submit`

export function externalFields(project) {
  return (project?.pages || [])
    .flatMap((page) => page?.fields || [])
    .filter((field) => field?.type !== 'heading')
}

function sampleValue(field) {
  if (field.type === 'multi') return field.options?.length ? [field.options[0]] : ['선택값']
  if (['single', 'select'].includes(field.type)) return field.options?.[0] || '선택값'
  if (field.type === 'consent') return '동의'
  if (field.type === 'email') return 'name@example.com'
  if (field.type === 'phone') return '010-1234-5678'
  if (field.type === 'number') return '1'
  if (field.type === 'rating') return '5'
  return '사이트 입력값'
}

export function externalSubmitSnippet(project) {
  const answers = Object.fromEntries(externalFields(project).map((field) => [field.label, sampleValue(field)]))
  return `const response = await fetch(${JSON.stringify(EXTERNAL_SUBMIT_URL)}, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    form: ${JSON.stringify(project?.slug || 'my-form')},
    source: window.location.hostname,
    answers: ${JSON.stringify(answers, null, 6).replace(/^/gm, '    ').trimStart()}
  })
});

const result = await response.json();
if (!response.ok) throw new Error(result.error || '신청을 저장하지 못했습니다.');`
}

export function externalAssistantPrompt(project) {
  const fieldLines = externalFields(project).map((field) => {
    const options = field.options?.length ? ` / 가능한 값: ${field.options.join(', ')}` : ''
    return `- ${field.label}${field.required ? ' (필수)' : ''}${options}`
  }).join('\n')

  return `이 사이트의 기존 신청 폼은 그대로 두고, 제출 버튼을 눌렀을 때 아래 폼메이커로도 응답이 저장되게 연결해줘.

연결 주소: ${EXTERNAL_SUBMIT_URL}
폼 주소값: ${project?.slug || 'my-form'}

POST 방식의 JSON으로 보내고 Content-Type은 application/json을 사용해줘. 요청 형식은 아래와 같아.
{
  "form": "${project?.slug || 'my-form'}",
  "source": window.location.hostname,
  "answers": {
    "질문명": "사이트에서 받은 입력값"
  }
}

질문명은 아래 문구와 똑같이 사용해줘.
${fieldLines || '- 아직 질문이 없습니다.'}

성공하면 기존 사이트의 완료 화면을 보여주고, 실패하면 사용자가 다시 시도할 수 있는 안내를 보여줘. Supabase 키나 비밀번호는 필요 없고 연결 주소만 사용하면 돼.`
}
