import { ImageSquare, SpinnerGap, Trash } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { api } from '../lib/api'

async function compressImage(file, maxEdge, quality) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('이미지를 변환하지 못했습니다.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('이미지를 변환하지 못했습니다.')), 'image/webp', quality))
}

export default function ImageUpload({ value, formId, onChange, maxEdge = 1800, quality = 0.82, maxBytes = 5 * 1024 * 1024, label = '상단 이미지' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file) {
    if (!file?.type.startsWith('image/')) return setError('이미지 파일만 올릴 수 있습니다.')
    setBusy(true)
    setError('')
    try {
      const blob = await compressImage(file, maxEdge, quality)
      if (blob.size > maxBytes) throw new Error(`압축 후 파일 크기가 ${Math.round(maxBytes / 1024 / 1024)}MB를 넘습니다.`)
      const body = new FormData()
      body.append('file', blob, `${file.name.replace(/\.[^.]+$/, '')}.webp`)
      if (formId) body.append('formId', formId)
      if (value) body.append('oldUrl', value)
      const data = await api('/maker/assets', { method: 'POST', body })
      onChange(data.url)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      if (value) await api('/maker/assets', { method: 'DELETE', body: { url: value } })
      onChange('')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="image-upload">
      {value ? <img src={value} alt={`${label} 미리보기`} /> : <div className="image-placeholder"><ImageSquare size={30} /><span>{label}</span></div>}
      <div className="image-actions">
        <button className="button secondary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <SpinnerGap className="spin" /> : <ImageSquare />} {value ? '이미지 변경' : '이미지 올리기'}</button>
        {value ? <button className="icon-button danger" type="button" onClick={remove} disabled={busy} aria-label="이미지 제거"><Trash /></button> : null}
      </div>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  )
}
