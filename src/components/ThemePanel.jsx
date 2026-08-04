import { Check, MagicWand, Sparkle } from '@phosphor-icons/react'
import { ACCENT_PRESETS, EFFECT_PRESETS, FONT_PRESETS, FONT_STACKS, MOTION_PRESETS, THEME_PRESETS, TRANSITION_PRESETS } from '../lib/maker'
import ImageUpload from './ImageUpload'

const fontGroups = [...new Set(FONT_PRESETS.map(([, , group]) => group))]

export default function ThemePanel({ project, projectId, onChange }) {
  const theme = project.theme || {}
  const patch = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  const applyTheme = (preset) => patch(preset.theme)
  const hasImage = Boolean(theme.coverUrl)

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
                <span className={`theme-preset-art theme-preset-art-${preset.art || 'form'}`} style={{ '--preset-bg': preset.theme.background, '--preset-card': preset.theme.card, '--preset-accent': preset.theme.accent }}><i /><b /><em /></span>
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

      <div className="theme-group transition-section">
        <div className="theme-section-title"><span>화면 전환</span><small>질문을 넘길 때</small></div>
        <div className="transition-picker">
          {TRANSITION_PRESETS.map(([value, label]) => (
            <button className={(theme.transition || 'rise') === value ? `transition-option transition-demo-${value} active` : `transition-option transition-demo-${value}`} type="button" key={value} onClick={() => patch({ transition: value })}>
              <i><b /></i>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <label className="studio-control font-size-control transition-speed-control"><span>전환 속도</span><input type="range" min="180" max="900" step="20" value={theme.transitionSpeed ?? 440} onChange={(event) => patch({ transitionSpeed: Number(event.target.value) })} /><small>{theme.transitionSpeed ?? 440}ms</small></label>
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
      <div className="theme-group image-settings">
        <div className="theme-section-title"><span>이미지 배치</span><small>크기와 초점까지 세밀하게</small></div>
        <ImageUpload value={theme.coverUrl || ''} formId={projectId} onChange={(coverUrl) => patch({ coverUrl })} />
        {hasImage ? (
          <div className="image-detail-controls">
            <div className="image-mode-picker" aria-label="이미지 위치">
              {[['background', '전체 배경'], ['banner', '상단 배너'], ['card', '카드 상단']].map(([value, label]) => <button className={(theme.imageMode || ((theme.layout || 'focus') === 'card' ? 'banner' : 'background')) === value ? 'active' : ''} type="button" key={value} onClick={() => patch({ imageMode: value })}>{label}</button>)}
            </div>
            <label className="studio-control"><span>맞춤 방식</span><select value={theme.imageFit || 'cover'} onChange={(event) => patch({ imageFit: event.target.value })}><option value="cover">빈틈없이 채우기</option><option value="contain">이미지 전체 보기</option></select></label>
            {(theme.imageMode || ((theme.layout || 'focus') === 'card' ? 'banner' : 'background')) !== 'background' ? <label className="studio-control image-range-control"><span>영역 높이</span><input type="range" min="120" max="420" step="10" value={theme.imageHeight ?? 220} onChange={(event) => patch({ imageHeight: Number(event.target.value) })} /><small>{theme.imageHeight ?? 220}px</small></label> : null}
            <label className="studio-control image-range-control"><span>이미지 확대</span><input type="range" min="100" max="180" step="5" value={theme.imageScale ?? 100} onChange={(event) => patch({ imageScale: Number(event.target.value) })} /><small>{theme.imageScale ?? 100}%</small></label>
            <label className="studio-control image-range-control"><span>가로 초점</span><input type="range" min="0" max="100" step="1" value={theme.imagePositionX ?? 50} onChange={(event) => patch({ imagePositionX: Number(event.target.value) })} /><small>{theme.imagePositionX ?? 50}%</small></label>
            <label className="studio-control image-range-control"><span>세로 초점</span><input type="range" min="0" max="100" step="1" value={theme.imagePositionY ?? 50} onChange={(event) => patch({ imagePositionY: Number(event.target.value) })} /><small>{theme.imagePositionY ?? 50}%</small></label>
            <label className="studio-control image-range-control"><span>이미지 밝기</span><input type="range" min="40" max="140" step="5" value={theme.imageBrightness ?? 100} onChange={(event) => patch({ imageBrightness: Number(event.target.value) })} /><small>{theme.imageBrightness ?? 100}%</small></label>
            <label className="studio-control image-range-control"><span>이미지 투명도</span><input type="range" min="20" max="100" step="5" value={theme.imageOpacity ?? 100} onChange={(event) => patch({ imageOpacity: Number(event.target.value) })} /><small>{theme.imageOpacity ?? 100}%</small></label>
            <label className="studio-control image-range-control"><span>어두운 덮개</span><input type="range" min="0" max="70" step="5" value={theme.imageOverlay ?? 28} onChange={(event) => patch({ imageOverlay: Number(event.target.value) })} /><small>{theme.imageOverlay ?? 28}%</small></label>
          </div>
        ) : <p className="control-note">이미지를 올리면 배치, 확대, 초점, 밝기 조절이 열립니다.</p>}
      </div>
    </div>
  )
}
