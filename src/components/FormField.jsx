import { Check, Star } from '@phosphor-icons/react'
import { FONT_STACKS, resolveDirectTextStyle } from '../lib/maker'

function publicDirectStyle(value, fallback) {
  if (!value || typeof value !== 'object') return {}
  const resolved = resolveDirectTextStyle(value, fallback)
  return {
    '--public-direct-font': FONT_STACKS[resolved.font] || FONT_STACKS.pretendard,
    '--public-direct-size': `${resolved.size}px`,
    '--public-direct-width': `${resolved.width}%`,
    '--public-direct-x': `${resolved.offsetX}px`,
    '--public-direct-y': `${resolved.offsetY}px`,
    '--public-direct-align': resolved.align,
  }
}

export default function FormField({
  field,
  value,
  onChange,
  error,
  preview = false,
  hidePrompt = false,
  accent = '#7156d9',
  requiredLabel = '필수',
  answerPlaceholder = '답변을 입력해 주세요',
  selectPlaceholder = '선택해 주세요',
  consentLabel = '내용을 확인했으며 동의합니다.',
}) {
  const set = (next) => onChange?.(next)
  const questionDirect = publicDirectStyle(field.directStyles?.question, { size: 32 })
  const bodyDirect = publicDirectStyle(field.directStyles?.body, { size: 16 })
  if (field.type === 'heading') return <div className="render-heading"><h3 className="public-direct-text" style={questionDirect}>{field.label}</h3>{field.description ? <p className="public-direct-text" style={bodyDirect}>{field.description}</p> : null}</div>

  const common = { disabled: preview, value: value || '', placeholder: field.placeholder || answerPlaceholder, onChange: (event) => set(event.target.value) }
  const consentText = field.consentText == null ? consentLabel : field.consentText
  return (
    <fieldset className={`render-field ${error ? 'field-invalid' : ''}`} style={{ '--field-accent': accent }}>
      <legend className={`${hidePrompt ? 'visually-hidden' : ''} public-direct-text`} style={questionDirect}>{field.label}{!hidePrompt && field.required && requiredLabel ? <span>{requiredLabel}</span> : null}</legend>
      {!hidePrompt && field.description ? <p className="render-help public-direct-text" style={bodyDirect}>{field.description}</p> : null}
      {['short', 'email', 'phone', 'number', 'date'].includes(field.type) ? <input {...common} type={{ short: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date' }[field.type]} /> : null}
      {field.type === 'long' ? <textarea {...common} rows="4" /> : null}
      {field.type === 'select' ? <select disabled={preview} value={value || ''} onChange={(event) => set(event.target.value)}><option value="">{selectPlaceholder}</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : null}
      {field.type === 'single' ? <div className="choice-stack">{field.options.map((option) => <label key={option}><input disabled={preview} type="radio" name={field.id} checked={value === option} onChange={() => set(option)} /><span className="choice-indicator" /><span>{option}</span></label>)}</div> : null}
      {field.type === 'multi' ? <div className="choice-stack">{field.options.map((option) => { const selected = Array.isArray(value) ? value : []; return <label key={option}><input disabled={preview} type="checkbox" checked={selected.includes(option)} onChange={(event) => set(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><span className="choice-indicator"><Check weight="bold" /></span><span>{option}</span></label> })}</div> : null}
      {field.type === 'rating' ? <div className="rating-row">{Array.from({ length: field.scale || 5 }, (_, index) => index + 1).map((score) => <button disabled={preview} className={Number(value) >= score ? 'active' : ''} type="button" key={score} onClick={() => set(String(score))} aria-label={`${score}점`}><Star weight={Number(value) >= score ? 'fill' : 'regular'} /></button>)}</div> : null}
      {field.type === 'consent' ? <div className="consent-answer"><label className="consent-row"><input disabled={preview} type="checkbox" checked={value === '동의'} onChange={(event) => set(event.target.checked ? '동의' : '')} /><span className="choice-indicator"><Check weight="bold" /></span><span className="consent-copy">{consentText || '동의합니다.'}</span></label>{field.consentLinkUrl ? <a className="consent-link" href={field.consentLinkUrl} target="_blank" rel="noreferrer">{field.consentLinkLabel || '자세히 보기'}</a> : null}</div> : null}
      {error ? <p className="field-error-text">{error}</p> : null}
    </fieldset>
  )
}
