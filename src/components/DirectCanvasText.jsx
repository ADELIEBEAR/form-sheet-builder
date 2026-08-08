import { ArrowCounterClockwise, DotsSixVertical, MagicWand, Minus, Plus } from '@phosphor-icons/react'
import { Children, cloneElement, isValidElement, useLayoutEffect, useRef, useState } from 'react'
import { FONT_PRESETS, FONT_STACKS, resolveDirectTextStyle } from '../lib/maker'
import { applyTextColorRange, effectiveTextColorRanges, textColorSegments } from '../lib/richText'
import { TEXT_EFFECT_PRESETS, textEffectCss } from '../lib/textEffects'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function snapToGridValue(value, step) {
  return Math.round(value / step) * step
}

function snap(value, step, enabled) {
  return enabled ? snapToGridValue(value, step) : value
}

function RichColorLayer({ text, ranges }) {
  return textColorSegments(text, ranges).map((segment) => <span style={segment.color ? { color: segment.color } : undefined} key={`${segment.start}-${segment.end}`}>{segment.text}</span>)
}

export function directTextVariables(value, fallback) {
  const resolved = resolveDirectTextStyle(value, fallback)
  const effect = textEffectCss(resolved)
  const variables = {
    '--direct-font': FONT_STACKS[resolved.font] || FONT_STACKS.pretendard,
    '--direct-size': `${resolved.size}px`,
    '--direct-width': `${resolved.width}%`,
    '--direct-x': `${resolved.offsetX}px`,
    '--direct-y': `${resolved.offsetY}px`,
    '--direct-align': resolved.align,
    '--direct-text-shadow': effect.textShadow,
    '--direct-text-stroke': effect.WebkitTextStroke,
  }
  if (resolved.color) variables['--direct-color'] = resolved.color
  return variables
}

export default function DirectCanvasText({ children, value, fallback, minSize, maxSize, label, selected, onSelect, onChange, snapToGrid = false, mobile = false, className = '' }) {
  const inputRef = useRef(null)
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const [effectOpen, setEffectOpen] = useState(false)
  const maxOffsetX = mobile ? 28 : 120
  const maxOffsetY = mobile ? 48 : 100
  const source = resolveDirectTextStyle(value, fallback)
  const resolved = {
    ...source,
    size: clamp(source.size, minSize, maxSize),
    offsetX: clamp(source.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(source.offsetY, -maxOffsetY, maxOffsetY),
  }
  const patch = (next) => onChange?.({ ...resolved, ...next })
  const child = Children.only(children)
  const text = String(isValidElement(child) ? (child.props.value ?? '') : '')
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || input.tagName !== 'TEXTAREA') return
    input.style.height = 'auto'
    input.style.height = `${Math.ceil(input.scrollHeight)}px`
  }, [mobile, resolved.font, resolved.size, resolved.width, text])
  const effectiveRanges = effectiveTextColorRanges(resolved, text)
  const hasRichColor = effectiveRanges.length > 0
  const rememberSelection = (event) => {
    const target = event.currentTarget
    setSelection({ start: target.selectionStart ?? 0, end: target.selectionEnd ?? 0 })
  }
  const applyColor = (color) => {
    const target = inputRef.current
    const start = target?.selectionStart ?? selection.start
    const end = target?.selectionEnd ?? selection.end
    if (end > start) patch({ colorRanges: applyTextColorRange(effectiveRanges, text.length, start, end, color), colorText: text })
    else patch({ color })
    requestAnimationFrame(() => {
      target?.focus()
      target?.setSelectionRange?.(start, end)
    })
  }
  const editableChild = isValidElement(child) ? cloneElement(child, {
    ref: inputRef,
    className: `${child.props.className || ''} direct-edit-input`,
    onSelect: (event) => { rememberSelection(event); child.props.onSelect?.(event) },
    onKeyUp: (event) => { rememberSelection(event); child.props.onKeyUp?.(event) },
    onPointerUp: (event) => { rememberSelection(event); child.props.onPointerUp?.(event) },
    onChange: child.props.onChange,
  }) : children
  const nudgePosition = (event) => {
    const amount = snapToGrid ? (event.shiftKey ? 16 : 8) : (event.shiftKey ? 10 : 2)
    const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key]
    if (!delta) return
    event.preventDefault()
    patch({ offsetX: clamp(resolved.offsetX + delta[0], -maxOffsetX, maxOffsetX), offsetY: clamp(resolved.offsetY + delta[1], -maxOffsetY, maxOffsetY) })
  }

  const beginPointerAction = (event, mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect?.()

    const startX = event.clientX
    const startY = event.clientY
    const start = resolved
    const directHost = event.currentTarget.closest('.direct-canvas-text')
    const hostWidth = directHost?.parentElement?.getBoundingClientRect().width || event.currentTarget.closest('.focus-content-card')?.getBoundingClientRect().width || 640

    const move = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (mode === 'move') {
        const nextX = clamp(start.offsetX + deltaX, -maxOffsetX, maxOffsetX)
        const nextY = clamp(start.offsetY + deltaY, -maxOffsetY, maxOffsetY)
        patch({ offsetX: Math.round(clamp(snap(nextX, 8, snapToGrid), -maxOffsetX, maxOffsetX)), offsetY: Math.round(clamp(snap(nextY, 8, snapToGrid), -maxOffsetY, maxOffsetY)) })
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
      className={`direct-canvas-text ${selected ? 'selected' : ''} ${resolved.color ? 'has-custom-color' : ''} ${hasRichColor ? 'has-rich-color' : ''} ${className}`}
      style={directTextVariables(resolved)}
      onPointerDown={onSelect}
      data-direct-label={label}
    >
      {hasRichColor ? <div className={`direct-rich-color-layer ${child.props.className || ''}`} aria-hidden="true"><RichColorLayer text={text} ranges={effectiveRanges} /></div> : null}
      {editableChild}
      {selected ? <>
        <div className={`direct-text-toolbar ${effectOpen ? 'effect-open' : ''}`} role="toolbar" aria-label={`${label} 빠른 디자인`} onPointerDown={(event) => event.stopPropagation()}>
          <button className="direct-move-button" type="button" onPointerDown={(event) => beginPointerAction(event, 'move')} onKeyDown={nudgePosition} aria-label={`${label} 위치 이동`} title="잡아서 이동 · 방향키로 미세 조절"><DotsSixVertical weight="bold" /></button>
          <span>{label}</span>
          {selection.end > selection.start ? <em>{selection.end - selection.start}자 선택</em> : mobile ? <em>모바일</em> : null}
          <select value={resolved.font} onChange={(event) => patch({ font: event.target.value })} aria-label={`${label} 글꼴`}>
            {FONT_PRESETS.map(([font, fontLabel]) => <option value={font} key={font}>{fontLabel}</option>)}
          </select>
          <label className="direct-color-control" title={selection.end > selection.start ? `선택한 ${selection.end - selection.start}자 색상` : '전체 글자 색상'}>
            <input type="color" value={resolved.color || '#222131'} onInput={(event) => applyColor(event.currentTarget.value)} onChange={(event) => applyColor(event.currentTarget.value)} aria-label={`${label} ${selection.end > selection.start ? '선택 글자' : '전체'} 색상`} />
          </label>
          <button className={`direct-effect-button ${resolved.textEffect !== 'none' ? 'active' : ''}`} type="button" onClick={() => setEffectOpen((open) => !open)} aria-label={`${label} 글자 효과`} aria-expanded={effectOpen} title="그림자와 글자 효과"><MagicWand weight="fill" /></button>
          <button type="button" onClick={() => patch({ size: clamp(resolved.size - (snapToGrid ? 2 : 1), minSize, maxSize) })} aria-label={`${label} 글자 줄이기`}><Minus weight="bold" /></button>
          <output aria-label={`${label} 현재 크기`}>{Math.round(resolved.size)}px</output>
          <button type="button" onClick={() => patch({ size: clamp(resolved.size + (snapToGrid ? 2 : 1), minSize, maxSize) })} aria-label={`${label} 글자 키우기`}><Plus weight="bold" /></button>
          <div className="direct-align-buttons" role="group" aria-label={`${label} 글자만 정렬`}>
            <button className={resolved.align === 'left' ? 'active' : ''} type="button" onClick={() => patch({ align: 'left' })} aria-label={`${label} 글자만 왼쪽 정렬`} title="이 글자만 왼쪽 정렬">좌</button>
            <button className={resolved.align === 'center' ? 'active' : ''} type="button" onClick={() => patch({ align: 'center' })} aria-label={`${label} 글자만 가운데 정렬`} title="이 글자만 가운데 정렬">중</button>
            <button className={resolved.align === 'right' ? 'active' : ''} type="button" onClick={() => patch({ align: 'right' })} aria-label={`${label} 글자만 오른쪽 정렬`} title="이 글자만 오른쪽 정렬">우</button>
          </div>
          <button className="direct-reset-button" type="button" onClick={() => onChange?.(null)} aria-label={`${label} 위치와 글자 설정 초기화`} title="초기화"><ArrowCounterClockwise /></button>
          {effectOpen ? <div className="direct-effect-panel" role="group" aria-label={`${label} 글자 효과 설정`}>
            <div className="direct-effect-heading"><strong>글자 효과</strong><span>선택 즉시 적용</span></div>
            <div className="direct-effect-presets">
              {TEXT_EFFECT_PRESETS.map(([effect, effectLabel]) => {
                const sample = textEffectCss({ ...resolved, textEffect: effect })
                return <button className={`direct-effect-preset ${resolved.textEffect === effect ? 'active' : ''}`} type="button" onClick={() => patch({ textEffect: effect })} aria-pressed={resolved.textEffect === effect} key={effect}>
                  <b style={sample}>Aa</b><span>{effectLabel}</span>
                </button>
              })}
            </div>
            {resolved.textEffect !== 'none' ? <div className="direct-effect-tuning">
              <label className="direct-effect-color"><span>효과 색상</span><span><input type="color" value={resolved.effectColor} onInput={(event) => patch({ effectColor: event.currentTarget.value })} onChange={(event) => patch({ effectColor: event.currentTarget.value })} aria-label={`${label} 효과 색상`} /><code>{resolved.effectColor.toUpperCase()}</code></span></label>
              <label><span>강도 <output>{Math.round(resolved.effectStrength)}</output></span><input type="range" min="10" max="100" step="1" value={resolved.effectStrength} onInput={(event) => patch({ effectStrength: Number(event.currentTarget.value) })} onChange={(event) => patch({ effectStrength: Number(event.currentTarget.value) })} aria-label={`${label} 효과 강도`} /></label>
              {['shadow', 'glow'].includes(resolved.textEffect) ? <label><span>{resolved.textEffect === 'glow' ? '번짐' : '흐림'} <output>{Math.round(resolved.effectBlur)}</output></span><input type="range" min="0" max="32" step="1" value={resolved.effectBlur} onInput={(event) => patch({ effectBlur: Number(event.currentTarget.value) })} onChange={(event) => patch({ effectBlur: Number(event.currentTarget.value) })} aria-label={`${label} 효과 흐림`} /></label> : null}
              {['shadow', 'hard-shadow', 'outline', 'depth'].includes(resolved.textEffect) ? <label><span>{resolved.textEffect === 'outline' ? '굵기' : resolved.textEffect === 'depth' ? '깊이' : '거리'} <output>{Math.round(resolved.effectDistance)}</output></span><input type="range" min={resolved.textEffect === 'outline' ? 1 : 0} max="18" step="1" value={resolved.effectDistance} onInput={(event) => patch({ effectDistance: Number(event.currentTarget.value) })} onChange={(event) => patch({ effectDistance: Number(event.currentTarget.value) })} aria-label={`${label} 효과 거리`} /></label> : null}
            </div> : null}
          </div> : null}
        </div>
        <button className="direct-width-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'width')} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const step = snapToGrid ? 4 : 2; patch({ width: clamp(resolved.width + (event.key === 'ArrowRight' ? step : -step), 48, 100) }) } }} aria-label={`${label} 너비 조절`} title="좌우로 드래그해 너비 조절" />
        <button className="direct-size-handle" type="button" onPointerDown={(event) => beginPointerAction(event, 'size')} onKeyDown={(event) => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) { event.preventDefault(); const grow = event.key === 'ArrowUp' || event.key === 'ArrowRight'; const step = snapToGrid ? 2 : 1; patch({ size: clamp(resolved.size + (grow ? step : -step), minSize, maxSize) }) } }} aria-label={`${label} 글자 크기 조절`} title="드래그해 글자 크기 조절" />
      </> : null}
    </div>
  )
}
