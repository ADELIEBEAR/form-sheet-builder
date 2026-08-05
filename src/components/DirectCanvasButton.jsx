import { ArrowCounterClockwise, DotsSixVertical, Minus, Plus } from '@phosphor-icons/react'
import { Children, cloneElement, isValidElement, useRef } from 'react'
import { resolveDirectButtonStyle } from '../lib/maker'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function snap(value, step, enabled) {
  return enabled ? Math.round(value / step) * step : value
}

function innerRect(element) {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return {
    left: rect.left + (Number.parseFloat(style.paddingLeft) || 0),
    right: rect.right - (Number.parseFloat(style.paddingRight) || 0),
    top: rect.top + (Number.parseFloat(style.paddingTop) || 0),
    bottom: rect.bottom - (Number.parseFloat(style.paddingBottom) || 0),
  }
}

export function directButtonOffsetBounds(frameRect, hostRect, start, fallback) {
  if (!frameRect || !hostRect) return fallback
  const baseLeft = frameRect.left - start.offsetX
  const baseRight = frameRect.right - start.offsetX
  const baseTop = frameRect.top - start.offsetY
  const baseBottom = frameRect.bottom - start.offsetY
  return {
    minX: Math.ceil(hostRect.left - baseLeft),
    maxX: Math.floor(hostRect.right - baseRight),
    minY: Math.ceil(hostRect.top - baseTop),
    maxY: Math.floor(hostRect.bottom - baseBottom),
  }
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
  const frameRef = useRef(null)
  const suppressClickRef = useRef(false)
  const maxOffsetX = mobile ? 240 : 480
  const maxOffsetY = mobile ? 280 : 360
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

  const bounds = () => {
    const frame = frameRef.current
    const host = frame?.closest('.focus-content-card')
    return directButtonOffsetBounds(frame?.getBoundingClientRect(), innerRect(host), resolved, {
      minX: -maxOffsetX,
      maxX: maxOffsetX,
      minY: -maxOffsetY,
      maxY: maxOffsetY,
    })
  }

  const nudgePosition = (event) => {
    const amount = snapToGrid ? (event.shiftKey ? 16 : 8) : (event.shiftKey ? 10 : 2)
    const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key]
    if (!delta) return
    event.preventDefault()
    const limit = bounds()
    patch({
      offsetX: clamp(resolved.offsetX + delta[0], limit.minX, limit.maxX),
      offsetY: clamp(resolved.offsetY + delta[1], limit.minY, limit.maxY),
    })
  }

  const beginPointerAction = (event, mode, direct = false) => {
    if (event.button !== 0) return
    if (!direct) event.preventDefault()
    event.stopPropagation()
    onSelect?.()
    const startX = event.clientX
    const startY = event.clientY
    const start = resolved
    const limit = bounds()
    const frameRect = frameRef.current?.getBoundingClientRect()
    const hostRect = innerRect(frameRef.current?.closest('.focus-content-card'))
    const availableWidth = frameRect && hostRect ? Math.max(minWidth, hostRect.right - frameRect.left) : maxWidth
    let moved = false

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (direct && !moved && Math.hypot(deltaX, deltaY) < 6) return
      if (!moved) {
        moved = true
        document.body.classList.add('canvas-direct-manipulating')
      }
      if (mode === 'move') {
        patch({
          offsetX: Math.round(clamp(snap(start.offsetX + deltaX, 8, snapToGrid), limit.minX, limit.maxX)),
          offsetY: Math.round(clamp(snap(start.offsetY + deltaY, 8, snapToGrid), limit.minY, limit.maxY)),
        })
        return
      }
      patch({ width: Math.round(clamp(snap(start.width + deltaX, 8, snapToGrid), minWidth, Math.min(maxWidth, availableWidth))) })
    }

    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.classList.remove('canvas-direct-manipulating')
      if (direct && moved) {
        suppressClickRef.current = true
        window.setTimeout(() => { suppressClickRef.current = false }, 0)
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const beginDirectMove = (event) => {
    if (event.target.closest('.direct-button-grab, .direct-button-toolbar, .direct-button-width-handle')) return
    beginPointerAction(event, 'move', true)
  }

  const alignHorizontal = (alignment) => {
    const frame = frameRef.current
    const hostRect = innerRect(frame?.closest('.focus-content-card'))
    const frameRect = frame?.getBoundingClientRect()
    if (!frameRect || !hostRect) return
    const baseLeft = frameRect.left - resolved.offsetX
    const targetLeft = alignment === 'left'
      ? hostRect.left
      : alignment === 'right'
        ? hostRect.right - frameRect.width
        : hostRect.left + ((hostRect.right - hostRect.left - frameRect.width) / 2)
    const limit = bounds()
    patch({ offsetX: Math.round(clamp(snap(targetLeft - baseLeft, 8, snapToGrid), limit.minX, limit.maxX)) })
  }

  return (
    <div
      ref={frameRef}
      className={`direct-canvas-button ${selected ? 'selected' : ''} ${className}`}
      style={directButtonVariables(resolved)}
      onPointerDown={beginDirectMove}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClickRef.current = false
      }}
      title="클릭하면 실행 · 끌면 이동"
    >
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
            <button type="button" onClick={() => alignHorizontal('left')}>좌</button>
            <button type="button" onClick={() => alignHorizontal('center')}>중</button>
            <button type="button" onClick={() => alignHorizontal('right')}>우</button>
          </div>
          <button className="direct-reset-button" type="button" onClick={() => onChange?.(null)} aria-label={`${label} 위치 초기화`} title="초기화"><ArrowCounterClockwise /></button>
        </div>
        <button className="direct-button-width-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'width')} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); patch({ width: clamp(resolved.width + (event.key === 'ArrowRight' ? 8 : -8), minWidth, maxWidth) }) } }} aria-label={`${label} 너비 조절`} title="좌우로 드래그해 너비 조절" />
      </> : null}
    </div>
  )
}
