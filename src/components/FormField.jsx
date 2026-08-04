import { Check, Star } from '@phosphor-icons/react'

export default function FormField({ field, value, onChange, error, preview = false, hidePrompt = false, accent = '#2f6757' }) {
  const set = (next) => onChange?.(next)
  if (field.type === 'heading') return <div className="render-heading"><h3>{field.label}</h3>{field.description ? <p>{field.description}</p> : null}</div>

  const common = { disabled: preview, value: value || '', placeholder: field.placeholder || '답변을 입력해 주세요', onChange: (event) => set(event.target.value) }
  return (
    <fieldset className={`render-field ${error ? 'field-invalid' : ''}`} style={{ '--field-accent': accent }}>
      <legend className={hidePrompt ? 'visually-hidden' : ''}>{field.label}{!hidePrompt && field.required ? <span>필수</span> : null}</legend>
      {!hidePrompt && field.description ? <p className="render-help">{field.description}</p> : null}
      {['short', 'email', 'phone', 'number', 'date'].includes(field.type) ? <input {...common} type={{ short: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date' }[field.type]} /> : null}
      {field.type === 'long' ? <textarea {...common} rows="4" /> : null}
      {field.type === 'select' ? <select disabled={preview} value={value || ''} onChange={(event) => set(event.target.value)}><option value="">선택해 주세요</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : null}
      {field.type === 'single' ? <div className="choice-stack">{field.options.map((option) => <label key={option}><input disabled={preview} type="radio" name={field.id} checked={value === option} onChange={() => set(option)} /><span className="choice-indicator" /><span>{option}</span></label>)}</div> : null}
      {field.type === 'multi' ? <div className="choice-stack">{field.options.map((option) => { const selected = Array.isArray(value) ? value : []; return <label key={option}><input disabled={preview} type="checkbox" checked={selected.includes(option)} onChange={(event) => set(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><span className="choice-indicator"><Check weight="bold" /></span><span>{option}</span></label> })}</div> : null}
      {field.type === 'rating' ? <div className="rating-row">{Array.from({ length: field.scale || 5 }, (_, index) => index + 1).map((score) => <button disabled={preview} className={Number(value) >= score ? 'active' : ''} type="button" key={score} onClick={() => set(String(score))} aria-label={`${score}점`}><Star weight={Number(value) >= score ? 'fill' : 'regular'} /></button>)}</div> : null}
      {field.type === 'consent' ? <label className="consent-row"><input disabled={preview} type="checkbox" checked={value === '동의'} onChange={(event) => set(event.target.checked ? '동의' : '')} /><span className="choice-indicator"><Check weight="bold" /></span><span>{field.description || '내용을 확인했으며 동의합니다.'}</span></label> : null}
      {error ? <p className="field-error-text">{error}</p> : null}
    </fieldset>
  )
}
