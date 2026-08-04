import { Check, MagicWand, Sparkle } from '@phosphor-icons/react'
import { ACCENT_PRESETS, EFFECT_PRESETS, FONT_PRESETS, FONT_STACKS, MOTION_PRESETS, THEME_PRESETS } from '../lib/maker'
import ImageUpload from './ImageUpload'

const fontGroups = [...new Set(FONT_PRESETS.map(([, , group]) => group))]

export default function ThemePanel({ project, projectId, onChange }) {
  const theme = project.theme || {}
  const patch = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  const applyTheme = (preset) => patch(preset.theme)

  return (
    <div className="inspector-panel theme-inspector">
      <div className="panel-heading"><span>디자인</span><strong>느낌을 바로 골라보세요</strong><p>고른 스타일은 편집 화면과 공개 폼에 즉시 적용됩니다.</p></div>

      <div className="theme-group theme-preset-section">
        <div className="theme-section-title"><span>완성형 테마</span><small><MagicWand /> 한 번에 적용</small></div>
        <div className="theme-preset-grid">
          {THEME_PRESETS.map((preset) => {
            const active = theme.accent === preset.theme.accent && theme.background === preset.theme.background && theme.card === preset.theme.card
            return (
              <button className={active ? 'theme-preset active' : 'theme-preset'} type="button" key={preset.id} onClick={() => applyTheme(preset)}>
                <span className="theme-preset-art" style={{ '--preset-bg': preset.theme.background, '--preset-card': preset.theme.card, '--preset-accent': preset.theme.accent }}><i /><b /><em /></span>
                <span><strong>{preset.name}</strong><small>{preset.tag}</small></span>
                {active ? <Check weight="bold" /> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="theme-group"><span>응답 화면 방식</span><div className="layout-picker"><button className={(theme.layout || 'focus') === 'focus' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'focus' })}><strong>한 질문씩</strong><small>한 화면에 하나만 편안하게</small></button><button className={theme.layout === 'card' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'card' })}><strong>한 페이지씩</strong><small>질문을 한 번에 빠르게</small></button></div></div>

      <div className="theme-group effect-section">
        <div className="theme-section-title"><span>움직이는 배경</span><small><Sparkle /> 가벼운 내장 효과</small></div>
        <div className="effect-picker">
          {EFFECT_PRESETS.map(([value, label, description]) => (
            <button className={(theme.effect || 'aurora') === value ? 'effect-option active' : 'effect-option'} type="button" key={value} onClick={() => patch({ effect: value })}>
              <span className={`effect-swatch effect-${value}`}><i /><i /><i /></span>
              <span><strong>{label}</strong><small>{description}</small></span>
            </button>
          ))}
        </div>
        <div className="motion-picker" aria-label="배경 움직임 정도">
          {MOTION_PRESETS.map(([value, label]) => <button className={(theme.motion || 'soft') === value ? 'active' : ''} type="button" key={value} onClick={() => patch({ motion: value })}>{label}</button>)}
        </div>
        <p className="control-note">휴대폰의 ‘동작 줄이기’ 설정이 켜져 있으면 애니메이션은 자동으로 멈춥니다.</p>
      </div>

      <div className="theme-group typography-settings">
        <span>글자 스타일 · {FONT_PRESETS.length}가지</span>
        <label className="studio-control"><span>글꼴</span><select value={theme.font || 'pretendard'} onChange={(event) => patch({ font: event.target.value })}>{fontGroups.map((group) => <optgroup label={group} key={group}>{FONT_PRESETS.filter(([, , itemGroup]) => itemGroup === group).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</optgroup>)}</select></label>
        <div className="font-live-sample" style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.pretendard }}>가나다라 · Aa 123</div>
        <label className="studio-control font-size-control"><span>제목 크기</span><input type="range" min="28" max="72" step="2" value={theme.titleSize ?? 56} onChange={(event) => patch({ titleSize: Number(event.target.value) })} /><small>{theme.titleSize ?? 56}px</small></label>
        <label className="studio-control font-size-control"><span>질문 크기</span><input type="range" min="20" max="48" step="1" value={theme.questionSize ?? 32} onChange={(event) => patch({ questionSize: Number(event.target.value) })} /><small>{theme.questionSize ?? 32}px</small></label>
        <label className="studio-control font-size-control"><span>본문 크기</span><input type="range" min="12" max="22" step="1" value={theme.bodySize ?? 16} onChange={(event) => patch({ bodySize: Number(event.target.value) })} /><small>{theme.bodySize ?? 16}px</small></label>
        <p className="control-note">모바일에서는 선택한 크기를 기준으로 화면 폭에 맞게 자동 조절됩니다.</p>
      </div>

      <div className="theme-group"><span>포인트 색상</span><div className="swatches">{ACCENT_PRESETS.map((color) => <button style={{ background: color }} className={theme.accent === color ? 'active' : ''} type="button" key={color} onClick={() => patch({ accent: color })} aria-label={`${color} 선택`}>{theme.accent === color ? <Check weight="bold" /> : null}</button>)}</div></div>
      <div className="theme-grid"><label className="studio-control"><span>배경</span><input type="color" value={theme.background || '#f0edfb'} onChange={(event) => patch({ background: event.target.value })} /></label><label className="studio-control"><span>카드</span><input type="color" value={theme.card || '#ffffff'} onChange={(event) => patch({ card: event.target.value })} /></label><label className="studio-control"><span>글자</span><input type="color" value={theme.text || '#222131'} onChange={(event) => patch({ text: event.target.value })} /></label></div>
      <label className="studio-control"><span>모서리 둥글기</span><input type="range" min="0" max="32" step="2" value={theme.radius ?? 24} onChange={(event) => patch({ radius: Number(event.target.value) })} /><small>{theme.radius ?? 24}px</small></label>
      <label className="toggle-control"><input type="checkbox" checked={theme.showProgress !== false} onChange={(event) => patch({ showProgress: event.target.checked })} /><span><i />진행률 표시</span></label>
      <div className="theme-group"><span>{(theme.layout || 'focus') === 'focus' ? '전체 배경 이미지' : '상단 이미지'}</span><ImageUpload value={theme.coverUrl || ''} formId={projectId} onChange={(coverUrl) => patch({ coverUrl })} /></div>
    </div>
  )
}
