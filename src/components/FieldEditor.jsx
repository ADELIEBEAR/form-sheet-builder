import { ArrowDown, ArrowUp, Copy, Plus, Trash } from '@phosphor-icons/react'
import { QUESTION_TYPES } from '../lib/form'

export default function FieldEditor({ question, index, total, onChange, onDuplicate, onDelete, onMove }) {
  const patch = (changes) => onChange({ ...question, ...changes })
  const hasOptions = question.type === 'radio' || question.type === 'checkbox'

  return (
    <section className="field-editor">
      <div className="field-editor-top">
        <span className="field-number">{question.type === 'notice' ? '안내' : `질문 ${index + 1}`}</span>
        <div className="field-tools">
          <button className="icon-button small" type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="위로 이동"><ArrowUp /></button>
          <button className="icon-button small" type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="아래로 이동"><ArrowDown /></button>
          <button className="icon-button small" type="button" onClick={onDuplicate} aria-label="복제"><Copy /></button>
          <button className="icon-button small danger" type="button" onClick={onDelete} aria-label="삭제"><Trash /></button>
        </div>
      </div>
      <div className="field-editor-grid">
        <label className="control wide"><span>{question.type === 'notice' ? '내용' : '질문'}</span><input value={question.label} onChange={(event) => patch({ label: event.target.value })} /></label>
        <label className="control"><span>형식</span><select value={question.type} onChange={(event) => patch({ type: event.target.value })}>{QUESTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="control wide"><span>설명</span><input value={question.description || ''} onChange={(event) => patch({ description: event.target.value })} placeholder="선택 입력" /></label>
        {question.type !== 'notice' && !hasOptions ? <label className="control"><span>입력 안내</span><input value={question.placeholder || ''} onChange={(event) => patch({ placeholder: event.target.value })} placeholder="예시 문구" /></label> : null}
      </div>
      {hasOptions ? (
        <div className="option-editor">
          <span className="control-label">선택 항목</span>
          {question.options.map((option, optionIndex) => (
            <div className="option-row" key={`${question.id}-${optionIndex}`}>
              <input value={option} onChange={(event) => patch({ options: question.options.map((item, i) => i === optionIndex ? event.target.value : item) })} />
              <button className="icon-button small" type="button" onClick={() => patch({ options: question.options.filter((_, i) => i !== optionIndex) })} aria-label="항목 삭제"><Trash /></button>
            </div>
          ))}
          <button className="text-button" type="button" onClick={() => patch({ options: [...question.options, `선택 ${question.options.length + 1}`] })}><Plus /> 항목 추가</button>
        </div>
      ) : null}
      {question.type !== 'notice' ? <label className="switch-row"><input type="checkbox" checked={question.required} onChange={(event) => patch({ required: event.target.checked })} /><span>필수 응답</span></label> : null}
    </section>
  )
}
