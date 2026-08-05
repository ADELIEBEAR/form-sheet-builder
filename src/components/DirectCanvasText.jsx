import { ArrowCounterClockwise, DotsSixVertical, Minus, Plus } from '@phosphor-icons/react'
import { FONT_PRESETS, FONT_STACKS, resolveDirectTextStyle } from '../lib/maker'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function snapToGridValue(value, step) {
  return Math.round(value / step) * step
}

function snap(value, step, enabled) {
  return enabled ? snapToGridValue(value, step) : value
}

export function directTextVariables(value, fallback) {
  const resolved = resolveDirectTextStyle(value, fallback)
  return {
    '--direct-font': FONT_STACKS[resolved.font] || FONT_STACKS.pretendard,
    '--direct-size': `${resolved.size}px`,
    '--direct-width': `${resolved.width}%`,
    '--direct-x': `${resolved.offsetX}px`,
    '--direct-y': `${resolved.offsetY}px`,
    '--direct-align': resolved.align,
  }
}

export default function DirectCanvasText({ children, value, fallback, minSize, maxSize, label, selected, onSelect, onChange, snapToGrid = false, className = '' }) {
  const resolved = resolveDirectTextStyle(value, fallback)
  const patch = (next) => onChange?.({ ...resolved, ...next })
  const nudgePosition = (event) => {
    const amount = snapToGrid ? (event.shiftKey ? 16 : 8) : (event.shiftKey ? 10 : 2)
    const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key]
    if (!delta) return
    event.preventDefault()
    patch({ offsetX: clamp(resolved.offsetX + delta[0], -120, 120), offsetY: clamp(resolved.offsetY + delta[1], -100, 100) })
  }

  const beginPointerAction = (event, mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect?.()

    const startX = event.clientX
    const startY = event.clientY
    const start = resolved
    const hostWidth = event.currentTarget.closest('.focus-content-card')?.getBoundingClientRect().width || 640

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (mode === 'move') {
        const nextX = clamp(start.offsetX + deltaX, -120, 120)
        const nextY = clamp(start.offsetY + deltaY, -100, 100)
        patch({ offsetX: Math.round(clamp(snap(nextX, 8, snapToGrid), -120, 120)), offsetY: Math.round(clamp(snap(nextY, 8, snapToGrid), -100, 100)) })
        return
      }
      if (mode === 'width') {
        const nextWidth = clamp(start.width + ((deltaX / hostWidth) * 100), 48, 100)
        patch({ width: Math.round(snap(nextWidth, 4, snapToGrid)) })
        return
      }
      const delta = (deltaX + deltaY) / 5
      const nextSize = clamp(start.size + delta, minSize, maxSize)
      patch({ size: Math.round(snap(nextSize, 2, snapToGrid) * 10) / 10 })
    }

    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.classList.remove('canvas-direct-manipulating')
    }

    document.body.classList.add('canvas-direct-manipulating')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <div
      className={`direct-canvas-text ${selected ? 'selected' : ''} ${className}`}
      style={directTextVariables(value, fallback)}
      onPointerDown={onSelect}
      data-direct-label={label}
    >
      {children}
      {selected ? <>
        <div className="direct-text-toolbar" role="toolbar" aria-label={`${label} 빠른 디자인`} onPointerDown={(event) => event.stopPropagation()}>
          <button className="direct-move-button" type="button" onPointerDown={(event) => beginPointerAction(event, 'move')} onKeyDown={nudgePosition} aria-label={`${label} 위치 이동`} title="잡아서 이동 · 방향키로 미세 조절"><DotsSixVertical weight="bold" /></button>
          <span>{label}</span>
          <select value={resolved.font} onChange={(event) => patch({ font: event.target.value })} aria-label={`${label} 글꼴`}>
            {FONT_PRESETS.map(([font, fontLabel]) => <option value={font} key={font}>{fontLabel}</option>)}
          </select>
          <button type="button" onClick={() => patch({ size: clamp(resolved.size - (snapToGrid ? 2 : 1), minSize, maxSize) })} aria-label={`${label} 글자 줄이기`}><Minus weight="bold" /></button>
          <output aria-label={`${label} 현재 크기`}>{Math.round(resolved.size)}px</output>
          <button type="button" onClick={() => patch({ size: clamp(resolved.size + (snapToGrid ? 2 : 1), minSize, maxSize) })} aria-label={`${label} 글자 키우기`}><Plus weight="bold" /></button>
          <div className="direct-align-buttons" aria-label={`${label} 정렬`}>
            <button className={resolved.align === 'left' ? 'active' : ''} type="button" onClick={() => patch({ align: 'left' })}>좌</button>
            <button className={resolved.align === 'center' ? 'active' : ''} type="button" onClick={() => patch({ align: 'center' })}>가운데</button>
          </div>
          <button className="direct-reset-button" type="button" onClick={() => onChange?.(null)} aria-label={`${label} 위치와 글자 설정 초기화`} title="초기화"><ArrowCounterClockwise /></button>
        </div>
        <button className="direct-width-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'width')} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const step = snapToGrid ? 4 : 2; patch({ width: clamp(resolved.width + (event.key === 'ArrowRight' ? step : -step), 48, 100) }) } }} aria-label={`${label} 너비 조절`} title="좌우로 드래그해 너비 조절" />
        <button className="direct-size-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'size')} onKeyDown={(event) => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); const grow = event.key === 'ArrowUp' || event.key === 'ArrowRight'; const step = snapToGrid ? 2 : 1; patch({ size: clamp(resolved.size + (grow ? step : -step), minSize, maxSize) }) } }} aria-label={`${label} 글자 크기 조절`} title="드래그해 글자 크기 조절" />
      </> : null}
    </div>
  )
}
