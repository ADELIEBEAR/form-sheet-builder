import { ArrowDown, ArrowUp, Copy, Plus, Trash } from '@phosphor-icons/react'
import { changeFieldType, FIELD_TYPES, PRIVACY_CONSENT_DEFAULTS } from '../lib/maker'

export default function FieldInspector({ field, index, total, onChange, onDuplicate, onDelete, onMove }) {
  if (!field) return <div className="inspector-empty"><strong>질문을 선택해 주세요</strong><p>가운데 미리보기에서 수정할 질문을 누르세요.</p></div>
  const patch = (next) => onChange({ ...field, ...next })
  const hasOptions = ['single', 'multi', 'select'].includes(field.type)
  const privacyConsent = field.type === 'consent' && field.consentKind !== 'acknowledgement'
  const changeConsentKind = (consentKind) => patch({
    consentKind,
    ...(consentKind === 'privacy' ? {
      consentPurpose: field.consentPurpose || PRIVACY_CONSENT_DEFAULTS.consentPurpose,
      consentItems: field.consentItems || PRIVACY_CONSENT_DEFAULTS.consentItems,
      consentRetention: field.consentRetention || PRIVACY_CONSENT_DEFAULTS.consentRetention,
      consentRefusal: field.consentRefusal || PRIVACY_CONSENT_DEFAULTS.consentRefusal,
    } : {}),
  })
  return (
    <div className="inspector-panel">
      <div className="inspector-title"><div><span>질문 편집</span><strong>{index + 1}번째 항목</strong></div><div className="inspector-tools"><button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="위로 이동"><ArrowUp /></button><button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="아래로 이동"><ArrowDown /></button><button type="button" onClick={onDuplicate} aria-label="복제"><Copy /></button><button className="danger" type="button" onClick={onDelete} aria-label="삭제"><Trash /></button></div></div>
      <label className="studio-control"><span>항목 종류</span><select value={field.type} onChange={(event) => onChange(changeFieldType(field, event.target.value))}>{FIELD_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="studio-control"><span>{field.type === 'heading' ? '제목' : field.type === 'consent' ? '동의 항목 제목' : '질문'}</span><textarea rows="3" value={field.label} onChange={(event) => patch({ label: event.target.value })} /></label>
      <label className="studio-control"><span>{field.type === 'consent' ? '동의 안내' : '설명'}</span><textarea rows="3" value={field.description || ''} onChange={(event) => patch({ description: event.target.value })} placeholder={field.type === 'consent' ? '수집 항목·이용 목적·보관 기간 등 안내' : '응답자에게 필요한 안내'} /></label>
      {field.type === 'consent' ? <><label className="studio-control"><span>동의 유형</span><select value={privacyConsent ? 'privacy' : 'acknowledgement'} onChange={(event) => changeConsentKind(event.target.value)}><option value="privacy">개인정보 수집·이용 동의</option><option value="acknowledgement">약관·주의사항 확인</option></select></label>{privacyConsent ? <div className="privacy-consent-inspector"><strong>법정 4개 필수 고지</strong><small>내용은 수정할 수 있지만 비워둘 수 없어요.</small><label className="studio-control"><span>수집·이용 목적</span><textarea rows="3" value={field.consentPurpose || ''} onChange={(event) => patch({ consentPurpose: event.target.value })} /></label><label className="studio-control"><span>수집 항목</span><textarea rows="3" value={field.consentItems || ''} onChange={(event) => patch({ consentItems: event.target.value })} /></label><label className="studio-control"><span>보유·이용 기간</span><textarea rows="4" value={field.consentRetention || ''} onChange={(event) => patch({ consentRetention: event.target.value })} /></label><label className="studio-control"><span>동의 거부 권리·불이익</span><textarea rows="4" value={field.consentRefusal || ''} onChange={(event) => patch({ consentRefusal: event.target.value })} /></label></div> : null}<label className="studio-control"><span>체크박스 문구</span><textarea rows="3" value={field.consentText || ''} maxLength="500" onChange={(event) => patch({ consentText: event.target.value })} placeholder="내용을 확인했으며 동의합니다." /></label><label className="studio-control"><span>안내 링크 주소 · 선택</span><input type="url" value={field.consentLinkUrl || ''} onChange={(event) => patch({ consentLinkUrl: event.target.value })} placeholder="https://example.com/privacy" /></label><label className="studio-control"><span>링크 문구</span><input value={field.consentLinkLabel || ''} maxLength="120" disabled={!field.consentLinkUrl} onChange={(event) => patch({ consentLinkLabel: event.target.value })} placeholder={field.consentLinkUrl ? '개인정보 처리방침 보기' : '주소를 먼저 입력하세요'} /></label></> : null}
      {!['heading', 'single', 'multi', 'select', 'rating', 'consent'].includes(field.type) ? <label className="studio-control"><span>입력 안내</span><input value={field.placeholder || ''} onChange={(event) => patch({ placeholder: event.target.value })} placeholder="예시 문구" /></label> : null}
      {hasOptions ? <div className="option-list"><span>선택 항목</span>{field.options.map((option, optionIndex) => <div key={`${field.id}-${optionIndex}`}><input value={option} onChange={(event) => patch({ options: field.options.map((item, i) => i === optionIndex ? event.target.value : item) })} /><button type="button" onClick={() => patch({ options: field.options.filter((_, i) => i !== optionIndex) })} aria-label="항목 삭제"><Trash /></button></div>)}<button className="add-option" type="button" onClick={() => patch({ options: [...field.options, `선택 ${field.options.length + 1}`] })}><Plus /> 항목 추가</button></div> : null}
      {field.type === 'rating' ? <label className="studio-control"><span>최대 점수</span><select value={field.scale || 5} onChange={(event) => patch({ scale: Number(event.target.value) })}><option value="5">5점</option><option value="7">7점</option><option value="10">10점</option></select></label> : null}
      {field.type !== 'heading' ? <label className="toggle-control"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => patch({ required: event.target.checked })} /><span><i />필수 응답</span></label> : null}
    </div>
  )
}
