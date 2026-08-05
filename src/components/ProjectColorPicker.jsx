import { Check } from '@phosphor-icons/react'
import { MEMO_COLOR_PRESETS, normalizeMemoColor } from '../lib/maker'

export default function ProjectColorPicker({ value, onChange, compact = false }) {
  const selected = normalizeMemoColor(value)
  return (
    <div className={`project-color-picker ${compact ? 'compact' : ''}`} role="group" aria-label="폼 구분 색상">
      {MEMO_COLOR_PRESETS.map(([color, label]) => (
        <button className={`project-color-dot color-${color} ${selected === color ? 'active' : ''}`} type="button" key={color} title={label} aria-label={`${label} 구분 색상`} aria-pressed={selected === color} onClick={() => onChange(color)}>
          {selected === color ? <Check weight="bold" /> : null}
        </button>
      ))}
    </div>
  )
}
