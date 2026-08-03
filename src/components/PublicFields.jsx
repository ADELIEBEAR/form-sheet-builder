export default function PublicFields({ questions, answers, onChange, errors = {} }) {
  const setValue = (id, value) => onChange({ ...answers, [id]: value })
  return questions.map((question) => {
    if (question.type === 'notice') return <div className="notice-block" key={question.id}><h3>{question.label}</h3>{question.description ? <p>{question.description}</p> : null}</div>
    const id = `field-${question.id}`
    return (
      <fieldset className={`public-field ${errors[question.id] ? 'has-error' : ''}`} key={question.id}>
        <legend>{question.label}{question.required ? <span className="required-mark">필수</span> : null}</legend>
        {question.description ? <p className="field-help">{question.description}</p> : null}
        {question.type === 'long' ? <textarea id={id} value={answers[question.id] || ''} placeholder={question.placeholder} onChange={(event) => setValue(question.id, event.target.value)} /> : null}
        {['short', 'email', 'phone', 'number', 'date'].includes(question.type) ? <input id={id} type={{ short: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date' }[question.type]} value={answers[question.id] || ''} placeholder={question.placeholder} onChange={(event) => setValue(question.id, event.target.value)} /> : null}
        {question.type === 'radio' ? <div className="choice-list">{question.options.map((option) => <label className="choice" key={option}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setValue(question.id, option)} /><span>{option}</span></label>)}</div> : null}
        {question.type === 'checkbox' ? <div className="choice-list">{question.options.map((option) => { const selected = answers[question.id] || []; return <label className="choice" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => setValue(question.id, event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><span>{option}</span></label> })}</div> : null}
        {errors[question.id] ? <p className="field-error">{errors[question.id]}</p> : null}
      </fieldset>
    )
  })
}
