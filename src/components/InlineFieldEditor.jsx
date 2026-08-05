import { ArrowDown, ArrowUp, Check, Copy, LinkSimple, Plus, Trash } from '@phosphor-icons/react'
import { changeFieldType, FIELD_TYPES } from '../lib/maker'
import DirectCanvasText from './DirectCanvasText'
import FormField from './FormField'

const OPTION_TYPES = ['single', 'multi', 'select']
const PLACEHOLDER_TYPES = ['short', 'long', 'email', 'phone', 'number', 'date']

export default function InlineFieldEditor({ field, index, total, selected, accent, requiredLabel, answerPlaceholder, selectPlaceholder, consentLabel, onSelect, onChange, onDuplicate, onDelete, onMove, directStyles, directFallbacks, activeTextRole, onTextRoleSelect, onDirectStyleChange }) {
  const hasOptions = OPTION_TYPES.includes(field.type)
  const hasPlaceholder = PLACEHOLDER_TYPES.includes(field.type)
  const isConsent = field.type === 'consent'
  const patch = (next) => onChange({ ...field, ...next })

  return (
    <article
      className={`inline-field-editor ${selected ? 'selected' : ''} ${field.type === 'heading' ? 'heading-block' : ''}`}
      data-field-id={field.id}
      onMouseDown={onSelect}
      onFocusCapture={onSelect}
    >
      <div className="inline-field-topline">
        <span className="inline-field-number">{String(index + 1).padStart(2, '0')}</span>
        <select aria-label={`${index + 1}번째 항목 종류`} value={field.type} onChange={(event) => onChange(changeFieldType(field, event.target.value))}>
          {FIELD_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        {field.type !== 'heading' ? <label className="inline-required" title={field.required ? '눌러서 선택 응답으로 변경' : '눌러서 필수 응답으로 변경'}><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => patch({ required: event.target.checked })} /><span>{field.required ? (requiredLabel || '필수') : '선택'}</span></label> : null}
        {selected ? <div className="inline-field-actions inline-field-actions-top">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="위로 이동" title="위로 이동"><ArrowUp /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="아래로 이동" title="아래로 이동"><ArrowDown /></button>
          <button type="button" onClick={onDuplicate} aria-label="질문 복제" title="복제"><Copy /></button>
          <button className="danger" type="button" onClick={onDelete} aria-label="질문 삭제" title="삭제"><Trash /></button>
        </div> : null}
      </div>

      <DirectCanvasText className="direct-question-text" label={field.type === 'heading' ? '안내 제목' : '질문'} value={directStyles?.question} fallback={directFallbacks?.question || { size: 32 }} minSize={20} maxSize={72} selected={selected && activeTextRole === 'question'} onSelect={() => onTextRoleSelect?.('question')} onChange={(next) => onDirectStyleChange?.('question', next)}>
        <textarea
          className="inline-question-input"
          rows="1"
          value={field.label}
          onChange={(event) => patch({ label: event.target.value })}
          aria-label={`${index + 1}번째 ${field.type === 'heading' ? '제목' : '질문'}`}
          placeholder={field.type === 'heading' ? '안내 제목' : isConsent ? '동의 항목 제목을 입력하세요' : '질문을 입력하세요'}
        />
      </DirectCanvasText>
      <DirectCanvasText className="direct-question-body" label="설명" value={directStyles?.body} fallback={directFallbacks?.body || { size: 16 }} minSize={12} maxSize={32} selected={selected && activeTextRole === 'body'} onSelect={() => onTextRoleSelect?.('body')} onChange={(next) => onDirectStyleChange?.('body', next)}>
        <textarea
          className="inline-description-input"
          rows="1"
          value={field.description || ''}
          onChange={(event) => patch({ description: event.target.value })}
          aria-label={`${index + 1}번째 설명`}
          placeholder={isConsent ? '수집 항목·이용 목적·보관 기간 등 안내를 적어주세요' : '설명이 필요하면 여기에 입력하세요'}
        />
      </DirectCanvasText>

      {field.type !== 'heading' && hasOptions ? <div className="inline-option-editor">{field.options.map((option, optionIndex) => <div key={`${field.id}-${optionIndex}`}><span className={field.type === 'single' ? 'option-dot' : 'option-box'} /><input value={option} onChange={(event) => patch({ options: field.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item) })} aria-label={`${optionIndex + 1}번째 선택지`} />{selected ? <button type="button" onClick={() => patch({ options: field.options.filter((_, itemIndex) => itemIndex !== optionIndex) })} disabled={field.options.length === 1} aria-label={`${optionIndex + 1}번째 선택지 삭제`}><Trash /></button> : null}</div>)}<button className="inline-add-option" type="button" onClick={() => patch({ options: [...field.options, `선택 ${field.options.length + 1}`] })}><Plus /> 선택지 추가</button></div> : null}
      {isConsent ? <div className="inline-consent-editor"><span className="choice-indicator"><Check weight="bold" /></span><label><small>체크박스 문구 · 눌러서 바로 수정</small><textarea rows="2" value={field.consentText == null ? consentLabel : field.consentText} maxLength="500" onChange={(event) => patch({ consentText: event.target.value })} aria-label={`${index + 1}번째 동의 체크박스 문구`} placeholder="응답자가 직접 체크할 동의 문구" /></label></div> : null}
      {field.type !== 'heading' && !hasOptions && !isConsent ? <div className="inline-response-preview"><FormField field={field} preview hidePrompt accent={accent} requiredLabel={requiredLabel} answerPlaceholder={answerPlaceholder} selectPlaceholder={selectPlaceholder} consentLabel={consentLabel} /></div> : null}

      {selected && (hasPlaceholder || field.type === 'rating' || isConsent) ? <div className="inline-field-controls">
        <div className="inline-field-settings">
          {hasPlaceholder ? <label><span>응답 입력 안내</span><input value={field.placeholder || ''} onChange={(event) => patch({ placeholder: event.target.value })} placeholder="예시 답변을 보여주세요" /></label> : null}
          {field.type === 'rating' ? <label><span>별점 개수</span><select value={field.scale || 5} onChange={(event) => patch({ scale: Number(event.target.value) })}><option value="5">5개</option><option value="7">7개</option><option value="10">10개</option></select></label> : null}
          {isConsent ? <div className="inline-consent-link-settings"><p><LinkSimple /> 약관이나 개인정보 처리방침이 따로 있다면 연결하세요. 링크는 새 창에서 열립니다.</p><label><span>안내 링크 주소 <small>선택</small></span><input type="url" value={field.consentLinkUrl || ''} onChange={(event) => patch({ consentLinkUrl: event.target.value })} placeholder="https://example.com/privacy" /></label><label><span>링크 문구</span><input value={field.consentLinkLabel || ''} maxLength="120" disabled={!field.consentLinkUrl} onChange={(event) => patch({ consentLinkLabel: event.target.value })} placeholder={field.consentLinkUrl ? '개인정보 처리방침 보기' : '주소를 먼저 입력하세요'} /></label></div> : null}
        </div>
      </div> : null}
    </article>
  )
}
