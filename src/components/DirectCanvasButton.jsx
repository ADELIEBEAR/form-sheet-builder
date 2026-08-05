import { ArrowCounterClockwise, DotsSixVertical, Minus, Plus } from '@phosphor-icons/react'
import { Children, cloneElement, isValidElement } from 'react'
import { resolveDirectButtonStyle } from '../lib/maker'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function snap(value, step, enabled) {
  return enabled ? Math.round(value / step) * step : value
}

export function directButtonVariables(value, fallback) {
  const resolved = resolveDirectButtonStyle(value, fallback)
  return {
    '--direct-button-width': `${resolved.width}px`,
    '--direct-button-x': `${resolved.offsetX}px`,
    '--direct-button-y': `${resolved.offsetY}px`,
  }
}

export function publicButtonVariables(value, fallback, mobileValue) {
  const style = {}
  const resolved = value && typeof value === 'object' ? resolveDirectButtonStyle(value, fallback) : null
  if (resolved) Object.assign(style, {
    '--public-button-width': `${resolved.width}px`,
    '--public-button-x': `${resolved.offsetX}px`,
    '--public-button-y': `${resolved.offsetY}px`,
  })
  if (mobileValue && typeof mobileValue === 'object') {
    const mobile = resolveDirectButtonStyle(mobileValue, resolved || fallback)
    Object.assign(style, {
      '--public-mobile-button-width': `${mobile.width}px`,
      '--public-mobile-button-x': `${mobile.offsetX}px`,
      '--public-mobile-button-y': `${mobile.offsetY}px`,
    })
  }
  return style
}

export default function DirectCanvasButton({ children, value, fallback, label, selected, onSelect, onChange, snapToGrid = false, mobile = false, minWidth = 80, maxWidth = 360, className = '' }) {
  const maxOffsetX = mobile ? 80 : 140
  const maxOffsetY = mobile ? 48 : 90
  const source = resolveDirectButtonStyle(value, fallback)
  const resolved = {
    width: clamp(source.width, minWidth, maxWidth),
    offsetX: clamp(source.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(source.offsetY, -maxOffsetY, maxOffsetY),
  }
  const patch = (next) => onChange?.({ ...resolved, ...next })
  const child = Children.only(children)
  const editableChild = isValidElement(child) ? cloneElement(child, {
    className: `${child.props.className || ''} direct-edit-button`,
  }) : child

  const nudgePosition = (event) => {
    const amount = snapToGrid ? (event.shiftKey ? 16 : 8) : (event.shiftKey ? 10 : 2)
    const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key]
    if (!delta) return
    event.preventDefault()
    patch({
      offsetX: clamp(resolved.offsetX + delta[0], -maxOffsetX, maxOffsetX),
      offsetY: clamp(resolved.offsetY + delta[1], -maxOffsetY, maxOffsetY),
    })
  }

  const beginPointerAction = (event, mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect?.()
    const startX = event.clientX
    const startY = event.clientY
    const start = resolved

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (mode === 'move') {
        patch({
          offsetX: Math.round(clamp(snap(start.offsetX + deltaX, 8, snapToGrid), -maxOffsetX, maxOffsetX)),
          offsetY: Math.round(clamp(snap(start.offsetY + deltaY, 8, snapToGrid), -maxOffsetY, maxOffsetY)),
        })
        return
      }
      patch({ width: Math.round(clamp(snap(start.width + deltaX, 8, snapToGrid), minWidth, maxWidth)) })
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
    <div className={`direct-canvas-button ${selected ? 'selected' : ''} ${className}`} style={directButtonVariables(resolved)}>
      {editableChild}
      <button className="direct-button-grab" type="button" onPointerDown={(event) => beginPointerAction(event, 'move')} onKeyDown={nudgePosition} aria-label={`${label} 위치 조절`} title="잡아서 버튼 이동"><DotsSixVertical weight="bold" /></button>
      {selected ? <>
        <div className="direct-text-toolbar direct-button-toolbar" role="toolbar" aria-label={`${label} 빠른 배치`} onPointerDown={(event) => event.stopPropagation()}>
          <button className="direct-move-button" type="button" onPointerDown={(event) => beginPointerAction(event, 'move')} onKeyDown={nudgePosition} aria-label={`${label} 이동`} title="잡아서 이동"><DotsSixVertical weight="bold" /></button>
          <span>{label}</span>
          <button type="button" onClick={() => patch({ width: clamp(resolved.width - 8, minWidth, maxWidth) })} aria-label={`${label} 너비 줄이기`}><Minus weight="bold" /></button>
          <output aria-label={`${label} 현재 너비`}>{Math.round(resolved.width)}px</output>
          <button type="button" onClick={() => patch({ width: clamp(resolved.width + 8, minWidth, maxWidth) })} aria-label={`${label} 너비 늘리기`}><Plus weight="bold" /></button>
          <div className="direct-align-buttons" aria-label={`${label} 빠른 위치`}>
            <button type="button" onClick={() => patch({ offsetX: mobile ? -40 : -72 })}>좌</button>
            <button className={resolved.offsetX === 0 ? 'active' : ''} type="button" onClick={() => patch({ offsetX: 0 })}>중</button>
            <button type="button" onClick={() => patch({ offsetX: mobile ? 40 : 72 })}>우</button>
          </div>
          <button className="direct-reset-button" type="button" onClick={() => onChange?.(null)} aria-label={`${label} 위치 초기화`} title="초기화"><ArrowCounterClockwise /></button>
        </div>
        <button className="direct-button-width-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'width')} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); patch({ width: clamp(resolved.width + (event.key === 'ArrowRight' ? 8 : -8), minWidth, maxWidth) }) } }} aria-label={`${label} 너비 조절`} title="좌우로 드래그해 너비 조절" />
      </> : null}
    </div>
  )
}
