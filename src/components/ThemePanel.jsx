import { Check } from '@phosphor-icons/react'
import { ACCENT_PRESETS, FONT_PRESETS } from '../lib/maker'
import ImageUpload from './ImageUpload'

export default function ThemePanel({ project, projectId, onChange }) {
  const theme = project.theme
  const patch = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  return (
    <div className="inspector-panel">
      <div className="panel-heading"><span>디자인</span><strong>응답 화면 꾸미기</strong><p>선택한 스타일은 공개 폼에 그대로 적용됩니다.</p></div>
      <div className="theme-group"><span>응답 화면 방식</span><div className="layout-picker"><button className={(theme.layout || 'focus') === 'focus' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'focus' })}><strong>한 질문씩</strong><small>스모어처럼 화면에 집중</small></button><button className={theme.layout === 'card' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'card' })}><strong>한 페이지씩</strong><small>질문을 한 번에 표시</small></button></div></div>
      <div className="theme-group"><span>포인트 색상</span><div className="swatches">{ACCENT_PRESETS.map((color) => <button style={{ background: color }} className={theme.accent === color ? 'active' : ''} type="button" key={color} onClick={() => patch({ accent: color })} aria-label={`${color} 선택`}>{theme.accent === color ? <Check weight="bold" /> : null}</button>)}</div></div>
      <div className="theme-group typography-settings">
        <span>글자 스타일</span>
        <label className="studio-control"><span>글꼴</span><select value={theme.font || 'pretendard'} onChange={(event) => patch({ font: event.target.value })}>{FONT_PRESETS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="studio-control font-size-control"><span>제목 크기</span><input type="range" min="28" max="72" step="2" value={theme.titleSize ?? 56} onChange={(event) => patch({ titleSize: Number(event.target.value) })} /><small>{theme.titleSize ?? 56}px</small></label>
        <label className="studio-control font-size-control"><span>질문 크기</span><input type="range" min="20" max="48" step="1" value={theme.questionSize ?? 32} onChange={(event) => patch({ questionSize: Number(event.target.value) })} /><small>{theme.questionSize ?? 32}px</small></label>
        <label className="studio-control font-size-control"><span>본문 크기</span><input type="range" min="12" max="22" step="1" value={theme.bodySize ?? 16} onChange={(event) => patch({ bodySize: Number(event.target.value) })} /><small>{theme.bodySize ?? 16}px</small></label>
        <p className="control-note">모바일에서는 선택한 크기를 기준으로 화면 폭에 맞게 자동 조절됩니다.</p>
      </div>
      <div className="theme-grid"><label className="studio-control"><span>배경</span><input type="color" value={theme.background} onChange={(event) => patch({ background: event.target.value })} /></label><label className="studio-control"><span>카드</span><input type="color" value={theme.card || '#ffffff'} onChange={(event) => patch({ card: event.target.value })} /></label><label className="studio-control"><span>글자</span><input type="color" value={theme.text} onChange={(event) => patch({ text: event.target.value })} /></label></div>
      <label className="studio-control"><span>모서리 둥글기</span><input type="range" min="0" max="32" step="2" value={theme.radius ?? 24} onChange={(event) => patch({ radius: Number(event.target.value) })} /><small>{theme.radius ?? 24}px</small></label>
      <label className="toggle-control"><input type="checkbox" checked={theme.showProgress !== false} onChange={(event) => patch({ showProgress: event.target.checked })} /><span><i />진행률 표시</span></label>
      <div className="theme-group"><span>{(theme.layout || 'focus') === 'focus' ? '전체 배경 이미지' : '상단 이미지'}</span><ImageUpload value={theme.coverUrl || ''} formId={projectId} onChange={(coverUrl) => patch({ coverUrl })} /></div>
    </div>
  )
}
