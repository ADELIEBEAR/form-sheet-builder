import { Check, MagicWand, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import { ACCENT_PRESETS, EFFECT_PRESETS, MOTION_PRESETS, THEME_PRESETS, TRANSITION_PRESETS } from '../lib/maker'
import ImageUpload from './ImageUpload'
import ImagePositionControl from './ImagePositionControl'

function FormImageSettings({ theme, projectId, patch }) {
  const hasImage = Boolean(theme.coverUrl)
  const mode = theme.imageMode || ((theme.layout || 'focus') === 'card' ? 'banner' : 'background')
  return (
    <section className="theme-group form-image-workspace">
      <div className="theme-section-title"><span>배경·이미지</span><small>사진 위에서 바로 조절</small></div>
      <ImageUpload value={theme.coverUrl || ''} formId={projectId} onChange={(coverUrl) => patch({ coverUrl })} />
      {hasImage ? <>
        <div className="image-mode-picker image-mode-cards" role="group" aria-label="이미지 표시 위치">
          {[['background', '전체 배경', '화면 전체를 채워요'], ['banner', '상단 배너', '폼 위에 넓게 보여요'], ['card', '카드 안', '내용 카드 안에 넣어요']].map(([value, label, description]) => <button className={mode === value ? 'active' : ''} type="button" key={value} onClick={() => patch({ imageMode: value })} aria-pressed={mode === value}><strong>{label}</strong><small>{description}</small></button>)}
        </div>
        <ImagePositionControl
          src={theme.coverUrl}
          x={theme.imagePositionX ?? 50}
          y={theme.imagePositionY ?? 50}
          scale={theme.imageScale ?? 100}
          fit={theme.imageFit || 'cover'}
          ratio={mode === 'background' ? '16 / 10' : '16 / 9'}
          overlay={mode === 'background' ? theme.imageOverlay ?? 28 : 0}
          brightness={theme.imageBrightness ?? 100}
          opacity={theme.imageOpacity ?? 100}
          label="폼 이미지 위치 조절"
          onChange={({ x, y, scale }) => patch({ imagePositionX: x, imagePositionY: y, imageScale: scale })}
        />
        <p className="image-direct-note">사진을 끌면 보이는 중심이 바뀝니다. 확대는 아래 − / + 버튼으로 조절하세요.</p>
        <details className="image-advanced-settings">
          <summary>세부 보정</summary>
          <div>
            <label className="studio-control"><span>맞춤 방식</span><select value={theme.imageFit || 'cover'} onChange={(event) => patch({ imageFit: event.target.value })}><option value="cover">빈틈없이 채우기</option><option value="contain">이미지 전체 보기</option></select></label>
            {mode !== 'background' ? <label className="studio-control image-range-control"><span>영역 높이</span><input type="range" min="120" max="420" step="10" value={theme.imageHeight ?? 220} onChange={(event) => patch({ imageHeight: Number(event.target.value) })} /><small>{theme.imageHeight ?? 220}px</small></label> : null}
            <label className="studio-control image-range-control"><span>밝기</span><input type="range" min="40" max="140" step="5" value={theme.imageBrightness ?? 100} onChange={(event) => patch({ imageBrightness: Number(event.target.value) })} /><small>{theme.imageBrightness ?? 100}%</small></label>
            <label className="studio-control image-range-control"><span>투명도</span><input type="range" min="20" max="100" step="5" value={theme.imageOpacity ?? 100} onChange={(event) => patch({ imageOpacity: Number(event.target.value) })} /><small>{theme.imageOpacity ?? 100}%</small></label>
            <label className="studio-control image-range-control"><span>어두운 덮개</span><input type="range" min="0" max="70" step="5" value={theme.imageOverlay ?? 28} onChange={(event) => patch({ imageOverlay: Number(event.target.value) })} /><small>{theme.imageOverlay ?? 28}%</small></label>
          </div>
        </details>
      </> : <p className="control-note">사진을 올리면 전체 배경·상단 배너·카드 안 배치를 바로 고를 수 있습니다.</p>}
    </section>
  )
}

export default function ThemePanel({ project, projectId, onChange }) {
  const [showAllThemes, setShowAllThemes] = useState(false)
  const theme = project.theme || {}
  const patch = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  const applyTheme = (preset) => patch(preset.theme)
  const featuredThemeIds = new Set(['lavender-soft', 'peach-sorbet', 'mint-soda', 'sky-cloud', 'stock-market', 'crypto-neon', 'mono-ink', 'night-velvet'])
  const visibleThemes = showAllThemes ? THEME_PRESETS : THEME_PRESETS.filter((preset) => featuredThemeIds.has(preset.id))

  return (
    <div className="inspector-panel theme-inspector">
      <div className="panel-heading"><span>디자인</span><strong>폼 전체 분위기</strong><p>전체 테마와 배경만 여기서 정리합니다.</p></div>
      <div className="canvas-edit-hint"><MagicWand /><span><strong>글자는 화면에서 직접</strong><small>글자를 선택하면 글꼴·크기·색상·위치 도구가 바로 열립니다.</small></span></div>

      <FormImageSettings theme={theme} projectId={projectId} patch={patch} />

      <div className="theme-group theme-preset-section">
        <div className="theme-section-title"><span>완성형 테마</span><small><MagicWand /> 한 번에 적용</small></div>
        <div className="theme-preset-grid">
          {visibleThemes.map((preset) => {
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
        <button className="theme-show-all" type="button" onClick={() => setShowAllThemes((current) => !current)}>{showAllThemes ? '대표 테마만 보기' : `전체 ${THEME_PRESETS.length}개 테마 보기`}</button>
      </div>

      <div className="theme-group"><span>응답 화면 방식</span><div className="layout-picker"><button className={(theme.layout || 'focus') === 'focus' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'focus' })}><strong>한 질문씩</strong><small>한 화면에 하나만 편안하게</small></button><button className={theme.layout === 'card' ? 'active' : ''} type="button" onClick={() => patch({ layout: 'card' })}><strong>한 페이지씩</strong><small>질문을 한 번에 빠르게</small></button></div></div>

      <details className="theme-group theme-collapse effect-section">
        <summary className="theme-section-title"><span>움직이는 배경</span><small><Sparkle /> 필요할 때 열기</small></summary>
        <div className="theme-collapse-body">
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
      </details>

      <details className="theme-group theme-collapse transition-section">
        <summary className="theme-section-title"><span>화면 전환</span><small>질문을 넘길 때</small></summary>
        <div className="theme-collapse-body">
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
      </details>

      <div className="theme-group"><span>포인트 색상</span><div className="swatches">{ACCENT_PRESETS.map((color) => <button style={{ background: color }} className={theme.accent === color ? 'active' : ''} type="button" key={color} onClick={() => patch({ accent: color })} aria-label={`${color} 선택`}>{theme.accent === color ? <Check weight="bold" /> : null}</button>)}</div></div>
      <div className="theme-grid"><label className="studio-control"><span>배경</span><input type="color" value={theme.background || '#f0edfb'} onChange={(event) => patch({ background: event.target.value })} /></label><label className="studio-control"><span>카드</span><input type="color" value={theme.card || '#ffffff'} onChange={(event) => patch({ card: event.target.value })} /></label><label className="studio-control"><span>글자</span><input type="color" value={theme.text || '#222131'} onChange={(event) => patch({ text: event.target.value })} /></label></div>
      <label className="studio-control"><span>모서리 둥글기</span><input type="range" min="0" max="32" step="2" value={theme.radius ?? 24} onChange={(event) => patch({ radius: Number(event.target.value) })} /><small>{theme.radius ?? 24}px</small></label>
      <label className="toggle-control"><input type="checkbox" checked={theme.showProgress !== false} onChange={(event) => patch({ showProgress: event.target.checked })} /><span><i />진행률 표시</span></label>
    </div>
  )
}
