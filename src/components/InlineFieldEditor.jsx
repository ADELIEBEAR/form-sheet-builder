import { ArrowDown, ArrowUp, Copy, Plus, Trash } from '@phosphor-icons/react'
import { FIELD_TYPES } from '../lib/maker'
import FormField from './FormField'

const OPTION_TYPES = ['single', 'multi', 'select']
const PLACEHOLDER_TYPES = ['short', 'long', 'email', 'phone', 'number', 'date']

export default function InlineFieldEditor({ field, index, total, selected, accent, onSelect, onChange, onDuplicate, onDelete, onMove }) {
  const hasOptions = OPTION_TYPES.includes(field.type)
  const hasPlaceholder = PLACEHOLDER_TYPES.includes(field.type)
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
        <select aria-label={`${index + 1}번째 항목 종류`} value={field.type} onChange={(event) => patch({ type: event.target.value })}>
          {FIELD_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        {field.type !== 'heading' ? <label className="inline-required"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => patch({ required: event.target.checked })} /><span>필수</span></label> : null}
        {selected ? <div className="inline-field-actions inline-field-actions-top">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="위로 이동" title="위로 이동"><ArrowUp /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="아래로 이동" title="아래로 이동"><ArrowDown /></button>
          <button type="button" onClick={onDuplicate} aria-label="질문 복제" title="복제"><Copy /></button>
          <button className="danger" type="button" onClick={onDelete} aria-label="질문 삭제" title="삭제"><Trash /></button>
        </div> : null}
      </div>

      <textarea
        className="inline-question-input"
        rows="1"
        value={field.label}
        onChange={(event) => patch({ label: event.target.value })}
        aria-label={`${index + 1}번째 ${field.type === 'heading' ? '제목' : '질문'}`}
        placeholder={field.type === 'heading' ? '안내 제목' : '질문을 입력하세요'}
      />
      <textarea
        className="inline-description-input"
        rows="1"
        value={field.description || ''}
        onChange={(event) => patch({ description: event.target.value })}
        aria-label={`${index + 1}번째 설명`}
        placeholder="설명이 필요하면 여기에 입력하세요"
      />

      {field.type !== 'heading' && hasOptions ? <div className="inline-option-editor">{field.options.map((option, optionIndex) => <div key={`${field.id}-${optionIndex}`}><span className={field.type === 'single' ? 'option-dot' : 'option-box'} /><input value={option} onChange={(event) => patch({ options: field.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item) })} aria-label={`${optionIndex + 1}번째 선택지`} />{selected ? <button type="button" onClick={() => patch({ options: field.options.filter((_, itemIndex) => itemIndex !== optionIndex) })} disabled={field.options.length === 1} aria-label={`${optionIndex + 1}번째 선택지 삭제`}><Trash /></button> : null}</div>)}<button className="inline-add-option" type="button" onClick={() => patch({ options: [...field.options, `선택 ${field.options.length + 1}`] })}><Plus /> 선택지 추가</button></div> : null}
      {field.type !== 'heading' && !hasOptions ? <div className="inline-response-preview"><FormField field={field} preview hidePrompt accent={accent} /></div> : null}

      {selected && (hasPlaceholder || field.type === 'rating') ? <div className="inline-field-controls">
        <div className="inline-field-settings">
          {hasPlaceholder ? <label><span>응답 입력 안내</span><input value={field.placeholder || ''} onChange={(event) => patch({ placeholder: event.target.value })} placeholder="예시 답변을 보여주세요" /></label> : null}
          {field.type === 'rating' ? <label><span>별점 개수</span><select value={field.scale || 5} onChange={(event) => patch({ scale: Number(event.target.value) })}><option value="5">5개</option><option value="7">7개</option><option value="10">10개</option></select></label> : null}
        </div>
      </div> : null}
    </article>
  )
}
