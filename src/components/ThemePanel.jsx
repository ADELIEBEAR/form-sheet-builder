import { Check } from '@phosphor-icons/react'
import { ACCENT_PRESETS } from '../lib/maker'
import ImageUpload from './ImageUpload'

export default function ThemePanel({ project, projectId, onChange }) {
  const theme = project.theme
  const patch = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  return (
    <div className="inspector-panel">
      <div className="panel-heading"><span>디자인</span><strong>응답 화면 꾸미기</strong><p>선택한 스타일은 공개 폼에 그대로 적용됩니다.</p></div>
      <div className="theme-group"><span>포인트 색상</span><div className="swatches">{ACCENT_PRESETS.map((color) => <button style={{ background: color }} className={theme.accent === color ? 'active' : ''} type="button" key={color} onClick={() => patch({ accent: color })} aria-label={`${color} 선택`}>{theme.accent === color ? <Check weight="bold" /> : null}</button>)}</div></div>
      <div className="theme-grid"><label className="studio-control"><span>배경</span><input type="color" value={theme.background} onChange={(event) => patch({ background: event.target.value })} /></label><label className="studio-control"><span>글자</span><input type="color" value={theme.text} onChange={(event) => patch({ text: event.target.value })} /></label></div>
      <label className="studio-control"><span>모서리 둥글기</span><input type="range" min="0" max="28" step="2" value={theme.radius ?? 14} onChange={(event) => patch({ radius: Number(event.target.value) })} /><small>{theme.radius ?? 14}px</small></label>
      <label className="toggle-control"><input type="checkbox" checked={theme.showProgress !== false} onChange={(event) => patch({ showProgress: event.target.checked })} /><span><i />페이지 진행률 표시</span></label>
      <div className="theme-group"><span>상단 이미지</span><ImageUpload value={theme.coverUrl || ''} formId={projectId} onChange={(coverUrl) => patch({ coverUrl })} /></div>
    </div>
  )
}
