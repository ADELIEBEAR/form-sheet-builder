import { TextAa } from '@phosphor-icons/react'

const COPY_FIELDS = [
  ['coverKicker', '시작 화면 작은 문구', 'WELCOME', 80],
  ['startStatusLabel', '상단 시작 상태', '시작', 40],
  ['completeStatusLabel', '상단 완료 상태', '완료', 40],
  ['startLabel', '시작 버튼', '시작하기', 80],
  ['pageLabel', '페이지 구분 문구', 'PAGE', 40],
  ['requiredLabel', '필수 표시', '필수', 40],
  ['previousLabel', '이전 버튼', '이전', 60],
  ['nextLabel', '다음 버튼', '다음', 60],
  ['submitLabel', '제출 버튼', '제출하기', 80],
  ['submitPendingLabel', '제출 중 문구', '저장 중', 60],
  ['restartLabel', '다시 보기 버튼', '처음부터 보기', 80],
  ['answerPlaceholder', '기본 입력 안내', '답변을 입력해 주세요', 120],
  ['selectPlaceholder', '선택 목록 안내', '선택해 주세요', 120],
]

export default function FormCopyPanel({ project, onChange }) {
  const settings = project.settings || {}
  const patch = (key, value) => onChange({ ...project, settings: { ...settings, [key]: value } })

  return (
    <div className="inspector-panel form-copy-panel">
      <div className="panel-heading">
        <span><TextAa /> 폼 문구</span>
        <strong>보이는 글자를 전부 바꾸세요</strong>
        <p>빈칸으로 두면 해당 문구는 화면에서 숨겨집니다.</p>
      </div>

      <div className="copy-settings-grid">
        {COPY_FIELDS.map(([key, label, fallback, maxLength]) => (
          <label className="studio-control" key={key}>
            <span>{label}</span>
            <input
              value={settings[key] ?? fallback}
              maxLength={maxLength}
              onChange={(event) => patch(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <label className="studio-control consent-default-control">
        <span>새 동의 항목의 기본 체크박스 문구</span>
        <input value={settings.consentLabel ?? '내용을 확인했으며 동의합니다.'} maxLength="300" onChange={(event) => patch('consentLabel', event.target.value)} />
        <small>새로 추가하는 동의 항목에만 적용됩니다. 기존 동의 문구는 해당 질문의 체크박스에서 직접 수정하세요.</small>
      </label>

      <label className="studio-control">
        <span>제출 완료 제목</span>
        <input value={settings.successTitle ?? '응답이 접수되었습니다'} maxLength="200" onChange={(event) => patch('successTitle', event.target.value)} />
      </label>
      <label className="studio-control">
        <span>제출 완료 안내</span>
        <textarea rows="3" value={settings.successMessage ?? '참여해 주셔서 감사합니다.'} maxLength="1000" onChange={(event) => patch('successMessage', event.target.value)} />
      </label>
    </div>
  )
}
