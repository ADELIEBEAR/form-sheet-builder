import { ArrowCounterClockwise, Check, Minus, Plus, TextAa } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { FONT_PRESETS, FONT_STACKS, resolvePageTypography } from '../lib/maker'

const fontGroups = [...new Set(FONT_PRESETS.map(([, , group]) => group))]

const ROLES = {
  title: { label: '제목', sizeKey: 'titleSize', weightKey: 'titleWeight', lineKey: 'titleLineHeight', trackingKey: 'titleTracking', minSize: 28, maxSize: 72 },
  question: { label: '질문', sizeKey: 'questionSize', weightKey: 'questionWeight', lineKey: 'questionLineHeight', trackingKey: 'questionTracking', minSize: 20, maxSize: 48 },
  body: { label: '본문', sizeKey: 'bodySize', weightKey: 'bodyWeight', lineKey: 'bodyLineHeight', trackingKey: 'bodyTracking', minSize: 12, maxSize: 22 },
}

const TYPE_PRESETS = [
  ['compact', '단정하게', { titleSize: 48, questionSize: 28, bodySize: 15, titleWeight: 820, questionWeight: 760, bodyWeight: 430, titleLineHeight: 105, questionLineHeight: 125, bodyLineHeight: 158, titleTracking: -5, questionTracking: -3.5, bodyTracking: 0 }],
  ['balanced', '편안하게', { titleSize: 56, questionSize: 32, bodySize: 16, titleWeight: 820, questionWeight: 760, bodyWeight: 400, titleLineHeight: 106, questionLineHeight: 128, bodyLineHeight: 165, titleTracking: -5.8, questionTracking: -4.5, bodyTracking: 0 }],
  ['clear', '또렷하게', { titleSize: 52, questionSize: 30, bodySize: 16, titleWeight: 720, questionWeight: 680, bodyWeight: 430, titleLineHeight: 115, questionLineHeight: 136, bodyLineHeight: 172, titleTracking: -3, questionTracking: -2, bodyTracking: .2 }],
  ['editorial', '감각적으로', { titleSize: 60, questionSize: 34, bodySize: 17, titleWeight: 760, questionWeight: 650, bodyWeight: 400, titleLineHeight: 103, questionLineHeight: 128, bodyLineHeight: 178, titleTracking: -5.5, questionTracking: -3, bodyTracking: .5 }],
]

function clamp(value, min, max) {
  const number = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min))
}

function NumberControl({ label, value, min, max, step = 1, unit, onChange }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = (next) => {
    const safe = clamp(next, min, max)
    setDraft(String(safe))
    onChange(safe)
  }

  return (
    <div className="type-number-control">
      <div className="type-control-label"><span>{label}</span><small>{min}–{max}{unit}</small></div>
      <div className="type-control-row">
        <button type="button" onClick={() => commit(Number(value) - step)} aria-label={`${label} 줄이기`}><Minus weight="bold" /></button>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => commit(event.target.value)} aria-label={`${label} 슬라이더`} />
        <label><input type="number" min={min} max={max} step={step} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => commit(draft)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} aria-label={`${label} 직접 입력`} /><span>{unit}</span></label>
        <button type="button" onClick={() => commit(Number(value) + step)} aria-label={`${label} 늘리기`}><Plus weight="bold" /></button>
      </div>
    </div>
  )
}

export default function TypographyWorkbench({ project, pageIndex = 0, onChange }) {
  const [scope, setScope] = useState('global')
  const [role, setRole] = useState('question')
  const theme = project.theme || {}
  const page = project.pages?.[pageIndex]
  const pageTypography = page?.typography || null
  const resolved = useMemo(() => resolvePageTypography(project, scope === 'page' ? page : null), [project, page, scope])
  const roleConfig = ROLES[role]

  const patchTheme = (next) => onChange({ ...project, theme: { ...theme, ...next } })
  const patchPage = (next) => {
    if (!page) return
    const pages = project.pages.map((item, index) => index === pageIndex ? { ...item, typography: { ...(item.typography || {}), ...next } } : item)
    onChange({ ...project, pages })
  }
  const patchActive = (next) => scope === 'page' ? patchPage(next) : patchTheme(next)
  const resetPage = () => {
    if (!page) return
    const pages = project.pages.map((item, index) => index === pageIndex ? { ...item, typography: null } : item)
    onChange({ ...project, pages })
  }
  const activeValues = scope === 'page' ? resolved : resolvePageTypography(project, null)

  return (
    <section className="typography-workbench" aria-label="타이포그래피 디자인 도구">
      <header className="type-workbench-header">
        <span className="type-tool-icon"><TextAa weight="bold" /></span>
        <span><small>TYPOGRAPHY</small><strong>글자 디자인</strong></span>
        <em>화면에서 바로 확인</em>
      </header>

      <div className="type-font-control">
        <div className="type-control-label"><span>전체 폼 글꼴</span><small>{FONT_PRESETS.length}가지</small></div>
        <select value={theme.font || 'pretendard'} onChange={(event) => patchTheme({ font: event.target.value })}>
          {fontGroups.map((group) => <optgroup label={group} key={group}>{FONT_PRESETS.filter(([, , itemGroup]) => itemGroup === group).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</optgroup>)}
        </select>
        <div className="type-live-sample" style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.pretendard }}>가나다라 · Form 123</div>
      </div>

      <div className="type-scope-block">
        <div className="type-control-label"><span>적용 범위</span><small>{scope === 'page' ? `${pageIndex + 1}페이지` : '모든 페이지'}</small></div>
        <div className="type-segmented type-scope-tabs">
          <button className={scope === 'global' ? 'active' : ''} type="button" onClick={() => setScope('global')}>폼 전체</button>
          <button className={scope === 'page' ? 'active' : ''} type="button" onClick={() => setScope('page')} disabled={!page}>현재 페이지</button>
        </div>
        {scope === 'page' ? <div className={`type-page-state${pageTypography ? ' overridden' : ''}`}>
          <span>{pageTypography ? <><Check weight="bold" /> 이 페이지에 별도 설정 적용 중</> : '아직 전체 설정을 따르고 있어요'}</span>
          {pageTypography ? <button type="button" onClick={resetPage}><ArrowCounterClockwise /> 전체 설정으로 되돌리기</button> : null}
        </div> : null}
      </div>

      <div className="type-preset-block">
        <div className="type-control-label"><span>빠른 스타일</span><small>크기·간격을 한 번에</small></div>
        <div className="type-preset-list">
          {TYPE_PRESETS.map(([id, label, values]) => <button type="button" key={id} onClick={() => patchActive(values)}><i className={`type-preset-glyph preset-${id}`}>가</i><span>{label}</span></button>)}
        </div>
      </div>

      <div className="type-detail-block">
        <div className="type-control-label"><span>세부 조절</span><small>수치를 눌러 직접 입력</small></div>
        <div className="type-segmented type-role-tabs">
          {Object.entries(ROLES).map(([value, config]) => <button className={role === value ? 'active' : ''} type="button" key={value} onClick={() => setRole(value)}>{config.label}</button>)}
        </div>
        <div className="type-role-preview" style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.pretendard, fontSize: `${Math.min(activeValues[roleConfig.sizeKey], 34)}px`, fontWeight: activeValues[roleConfig.weightKey], lineHeight: activeValues[roleConfig.lineKey] / 100, letterSpacing: `${activeValues[roleConfig.trackingKey] / 100}em`, textAlign: activeValues.textAlign }}>
          {role === 'title' ? project.title || '폼 제목' : role === 'question' ? page?.fields?.find((field) => field.type !== 'heading')?.label || '질문을 입력해 주세요' : page?.description || project.description || '응답자에게 필요한 안내 문구입니다.'}
        </div>
        <NumberControl label="크기" value={activeValues[roleConfig.sizeKey]} min={roleConfig.minSize} max={roleConfig.maxSize} step={1} unit="px" onChange={(value) => patchActive({ [roleConfig.sizeKey]: value })} />
        <NumberControl label="굵기" value={activeValues[roleConfig.weightKey]} min={300} max={900} step={10} unit="" onChange={(value) => patchActive({ [roleConfig.weightKey]: value })} />
        <NumberControl label="행간" value={activeValues[roleConfig.lineKey]} min={90} max={200} step={1} unit="%" onChange={(value) => patchActive({ [roleConfig.lineKey]: value })} />
        <NumberControl label="자간" value={activeValues[roleConfig.trackingKey]} min={-8} max={12} step={0.1} unit="%" onChange={(value) => patchActive({ [roleConfig.trackingKey]: value })} />
        <div className="type-align-control">
          <div className="type-control-label"><span>정렬</span><small>글자만 정렬돼요</small></div>
          <div className="type-segmented"><button className={activeValues.textAlign === 'left' ? 'active' : ''} type="button" onClick={() => patchActive({ textAlign: 'left' })}>왼쪽</button><button className={activeValues.textAlign === 'center' ? 'active' : ''} type="button" onClick={() => patchActive({ textAlign: 'center' })}>가운데</button></div>
        </div>
      </div>

      <p className="type-mobile-note">모바일은 글자가 잘리지 않도록 선택한 값을 기준으로 화면 폭에 맞춰 안전하게 줄어듭니다.</p>
    </section>
  )
}
