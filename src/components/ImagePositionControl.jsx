import { ArrowCounterClockwise, ArrowsOutCardinal, Minus, Plus } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)))
}

export default function ImagePositionControl({
  src,
  x = 50,
  y = 50,
  scale = 100,
  fit = 'cover',
  ratio = '16 / 9',
  overlay = 0,
  brightness = 100,
  opacity = 100,
  minScale = 100,
  maxScale = 180,
  scaleStep = 5,
  label = '이미지 위치 조절',
  onChange,
}) {
  const frameRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const point = { x: clamp(x, 0, 100), y: clamp(y, 0, 100) }
  const zoom = clamp(scale, minScale, maxScale)

  const commit = (next) => onChange?.({ x: point.x, y: point.y, scale: zoom, ...next })
  const moveToPointer = (event) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    commit({
      x: Math.round(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)),
      y: Math.round(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)),
    })
  }
  const startDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragging(true)
    moveToPointer(event)
  }
  const stopDrag = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDragging(false)
  }
  const onKeyDown = (event) => {
    const amount = event.shiftKey ? 10 : 2
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    commit({
      x: clamp(point.x + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0), 0, 100),
      y: clamp(point.y + (event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0), 0, 100),
    })
  }

  if (!src) return null

  return (
    <div className="image-position-control">
      <div
        ref={frameRef}
        className={`image-position-stage ${dragging ? 'is-dragging' : ''}`}
        style={{ aspectRatio: ratio, '--crop-x': `${point.x}%`, '--crop-y': `${point.y}%`, '--crop-scale': zoom / 100, '--crop-overlay': clamp(overlay, 0, 100) / 100, '--crop-brightness': clamp(brightness, 40, 140) / 100, '--crop-opacity': clamp(opacity, 20, 100) / 100, '--crop-fit': fit === 'contain' ? 'contain' : 'cover' }}
        role="application"
        tabIndex="0"
        aria-label={`${label}. 사진을 끌거나 방향키로 초점을 옮기세요.`}
        onKeyDown={onKeyDown}
        onPointerDown={startDrag}
        onPointerMove={(event) => dragging && moveToPointer(event)}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <img src={src} alt="" draggable="false" />
        <i className="image-position-shade" />
        <span className="image-focus-target" style={{ left: `${point.x}%`, top: `${point.y}%` }}><ArrowsOutCardinal weight="bold" /></span>
        <span className="image-drag-hint"><ArrowsOutCardinal /> 사진을 끌어 위치 조절</span>
      </div>
      <div className="image-position-toolbar" role="group" aria-label="이미지 확대 조절">
        <button type="button" onClick={() => commit({ scale: clamp(zoom - scaleStep, minScale, maxScale) })} disabled={zoom <= minScale} aria-label="이미지 축소"><Minus /></button>
        <output>{zoom}%</output>
        <button type="button" onClick={() => commit({ scale: clamp(zoom + scaleStep, minScale, maxScale) })} disabled={zoom >= maxScale} aria-label="이미지 확대"><Plus /></button>
        <button className="image-position-reset" type="button" onClick={() => commit({ x: 50, y: 50, scale: 100 })}><ArrowCounterClockwise /> 중앙 맞춤</button>
      </div>
    </div>
  )
}
