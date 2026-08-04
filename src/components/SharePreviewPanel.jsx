import { ArrowCounterClockwise, ImageSquare, ShareNetwork } from '@phosphor-icons/react'

export default function SharePreviewPanel({ project, onChange }) {
  const settings = project.settings || {}
  const shareTitle = String(settings.shareTitle ?? project.title ?? '').slice(0, 100)
  const shareDescription = String(settings.shareDescription ?? project.description ?? '').slice(0, 240)
  const useCover = settings.shareImageMode !== 'none'
  const coverUrl = useCover ? project.theme?.coverUrl : ''
  const patch = (next) => onChange({ ...project, settings: { ...settings, ...next } })

  function reset() {
    patch({ shareTitle: null, shareDescription: null, shareImageMode: 'cover' })
  }

  return (
    <section className="inspector-panel share-preview-panel">
      <div className="panel-heading">
        <span><ShareNetwork weight="fill" /> 링크 미리보기</span>
        <strong>공유할 때 보이는 내용을 바꾸세요</strong>
        <p>카카오톡·문자·SNS에 링크를 붙이면 아래 제목과 설명이 표시됩니다.</p>
      </div>

      <div className={`share-card-preview ${coverUrl ? 'has-image' : ''}`} aria-label="링크 미리보기 예시">
        {coverUrl ? <img src={coverUrl} alt="공유 미리보기" /> : <span className="share-card-placeholder"><ImageSquare weight="duotone" /></span>}
        <div>
          <small>form-maker-next.vercel.app</small>
          <strong>{shareTitle || project.title || '제목 없는 폼'}</strong>
          {shareDescription ? <p>{shareDescription}</p> : null}
        </div>
      </div>

      <label className="studio-control share-copy-control">
        <span>공유 제목 <small>{shareTitle.length}/100</small></span>
        <input value={shareTitle} maxLength="100" onChange={(event) => patch({ shareTitle: event.target.value })} placeholder={project.title || '폼 제목'} />
      </label>
      <label className="studio-control share-copy-control">
        <span>공유 설명 <small>{shareDescription.length}/240</small></span>
        <textarea rows="3" value={shareDescription} maxLength="240" onChange={(event) => patch({ shareDescription: event.target.value })} placeholder="링크 아래에 보일 간단한 안내" />
      </label>
      <label className={`toggle-control share-image-toggle ${project.theme?.coverUrl ? '' : 'disabled'}`}>
        <input type="checkbox" checked={useCover && Boolean(project.theme?.coverUrl)} disabled={!project.theme?.coverUrl} onChange={(event) => patch({ shareImageMode: event.target.checked ? 'cover' : 'none' })} />
        <span><i />상단 이미지를 링크 썸네일로 사용</span>
      </label>
      <button className="share-preview-reset" type="button" onClick={reset}><ArrowCounterClockwise /> 폼 제목·설명으로 되돌리기</button>
    </section>
  )
}
