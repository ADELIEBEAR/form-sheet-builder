import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Copy,
  DotsSixVertical,
  EyeSlash,
  ImageSquare,
  ShieldCheck,
  Trash,
} from '@phosphor-icons/react'
import { createContext, useContext, useState } from 'react'
import { resolveDirectTextStyle } from '../lib/maker'
import { SITE_BLOCKS, siteThemeStyle } from '../lib/siteMaker'
import ColoredText from './ColoredText'
import DirectCanvasText, { directTextVariables } from './DirectCanvasText'
import LandingFormEmbed from './LandingFormEmbed'

const SiteEditContext = createContext(null)

function textFallback(publicAs, className = '') {
  if (className.includes('eyebrow')) return { size: 12, width: 100, align: 'left' }
  if (className.includes('hero-title') || publicAs === 'h1') return { size: 64, width: 100, align: 'left' }
  if (publicAs === 'h2') return { size: 44, width: 100, align: 'left' }
  if (publicAs === 'h3') return { size: 22, width: 100, align: 'left' }
  if (publicAs === 'strong') return { size: 20, width: 100, align: 'left' }
  if (publicAs === 'span') return { size: 15, width: 100, align: 'left' }
  return { size: 17, width: 100, align: 'left' }
}

function responsiveTextVariables(desktopValue, desktopFallback, mobileValue, mobileFallback) {
  const variables = directTextVariables(desktopValue, desktopFallback)
  Object.entries(directTextVariables(mobileValue, mobileFallback)).forEach(([key, value]) => {
    variables[key.replace('--direct-', '--mobile-direct-')] = value
  })
  return variables
}

function Editable({ value, onChange, as = 'input', publicAs, className = '', label }) {
  const context = useContext(SiteEditContext)
  const storedStyle = context?.section?.textStyles?.[label]
  const sectionAlign = ['left', 'center', 'right'].includes(context?.section?.style?.align) ? context.section.style.align : 'left'
  const desktopFallback = { ...textFallback(publicAs, className), align: sectionAlign }
  const mobileSize = className.includes('eyebrow') ? 11 : publicAs === 'h1' ? 42 : publicAs === 'h2' ? 30 : publicAs === 'h3' || publicAs === 'strong' ? 19 : publicAs === 'span' ? 13 : 15
  const mobileFallback = { ...desktopFallback, size: mobileSize }
  const desktopStyle = storedStyle ? (() => { const { mobile: _mobile, ...style } = storedStyle; return style })() : undefined
  const inheritedMobileStyle = desktopStyle ? {
    ...desktopStyle,
    size: Math.min(Number(desktopStyle.size || mobileSize), mobileSize),
    width: publicAs === 'h1' ? Math.max(Number(desktopStyle.width || 100), 78) : publicAs === 'h2' ? Math.max(Number(desktopStyle.width || 100), 70) : desktopStyle.width,
    offsetX: Math.min(28, Math.max(-28, Number(desktopStyle.offsetX || 0))),
    offsetY: Math.min(48, Math.max(-48, Number(desktopStyle.offsetY || 0))),
  } : undefined
  const mobileStyle = storedStyle?.mobile || inheritedMobileStyle
  const styleValue = context?.mobile ? mobileStyle : desktopStyle
  const fallback = context?.mobile ? mobileFallback : desktopFallback
  if (!onChange) {
    const Tag = publicAs || (as === 'textarea' ? 'p' : as)
    if (!storedStyle) return <Tag className={className}>{value}</Tag>
    const resolvedDesktop = resolveDirectTextStyle(desktopStyle, desktopFallback)
    const resolvedMobile = resolveDirectTextStyle(mobileStyle, mobileFallback)
    return <Tag className={`site-styled-copy ${className}`} style={responsiveTextVariables(desktopStyle, desktopFallback, mobileStyle, mobileFallback)}><ColoredText text={String(value ?? '')} desktopStyle={resolvedDesktop} mobileStyle={resolvedMobile} /></Tag>
  }
  const commitStyle = (next) => {
    if (context?.mobile) {
      if (next) context?.onTextStyleChange?.(context.section.id, label, { ...(storedStyle || {}), mobile: next })
      else {
        const { mobile: _mobile, ...desktopOnly } = storedStyle || {}
        context?.onTextStyleChange?.(context.section.id, label, Object.keys(desktopOnly).length ? desktopOnly : null)
      }
      return
    }
    if (next) context?.onTextStyleChange?.(context.section.id, label, { ...next, ...(storedStyle?.mobile ? { mobile: storedStyle.mobile } : {}) })
    else context?.onTextStyleChange?.(context.section.id, label, storedStyle?.mobile ? { mobile: storedStyle.mobile } : null)
  }
  const Tag = as === 'textarea' ? 'textarea' : 'input'
  return <DirectCanvasText
    className="site-direct-copy"
    value={styleValue}
    fallback={fallback}
    minSize={8}
    maxSize={publicAs === 'h1' ? 120 : publicAs === 'h2' ? 88 : 56}
    label={label}
    selected={Boolean(context?.selected && context?.activeTextLabel === label)}
    onSelect={() => context?.onTextSelect?.(label)}
    onChange={commitStyle}
    snapToGrid={context?.snapToGrid}
    mobile={context?.mobile}
  >
    <Tag className={`site-inline-edit ${className}`} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} rows={as === 'textarea' ? 1 : undefined} />
  </DirectCanvasText>
}

function goToForm() {
  document.getElementById('site-application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function imageFrameStyle(data) {
  const ratio = { portrait: '4 / 5', square: '1 / 1', landscape: '16 / 9' }[data?.imageRatio] || '4 / 5'
  return {
    '--site-image-x': `${Number(data?.imageFocus ?? 50)}%`,
    '--site-image-y': `${Number(data?.imagePositionY ?? 50)}%`,
    '--site-image-scale': Number(data?.imageScale ?? 100) / 100,
    aspectRatio: ratio,
  }
}

function Hero({ section, edit }) {
  const data = section.data
  const editing = Boolean(edit('title'))
  const cinematic = section.style?.layout === 'cinematic'
  return (
    <section className="site-section site-hero">
      <div className="site-hero-copy">
        <Editable as="span" publicAs="span" className="site-hero-eyebrow" value={data.eyebrow} onChange={edit('eyebrow')} label="첫 화면 작은 제목" />
        <Editable as="textarea" publicAs="h1" className="site-hero-title" value={data.title} onChange={edit('title')} label="첫 화면 제목" />
        <Editable as="textarea" publicAs="p" className="site-hero-description" value={data.description} onChange={edit('description')} label="첫 화면 설명" />
        {editing ? <div className="site-main-cta is-editor-control"><Editable as="span" publicAs="span" value={data.buttonLabel} onChange={edit('buttonLabel')} label="신청 버튼 문구" /><ArrowDown weight="bold" /></div> : <button type="button" className="site-main-cta" onClick={goToForm}><span>{data.buttonLabel}</span><ArrowDown weight="bold" /></button>}
      </div>
      {!cinematic && (data.imageUrl ? <figure className="site-hero-image" style={imageFrameStyle(data)}><img src={data.imageUrl} alt={data.imageAlt || ''} /></figure> : <div className="site-signal-art" aria-hidden="true"><span /><span /><span /><b /></div>)}
    </section>
  )
}

function Ticker({ section, edit, editing }) {
  const items = section.data.items || []
  const displayedItems = editing ? items : [...items, ...items]
  return <section className="site-section site-ticker" aria-label="주요 안내"><div className="site-ticker-track">{displayedItems.map((item, index) => <span key={`${index}-${item}`}><Editable value={item} onChange={editing ? edit(`items.${index}`) : undefined} publicAs="strong" label={`${(index % items.length) + 1}번째 알림 문구`} /></span>)}</div></section>
}

function Benefits({ section, edit }) {
  const data = section.data
  return (
    <section className="site-section site-benefits">
      <header>
        <Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="핵심 안내 제목" />
        <Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="핵심 안내 설명" />
      </header>
      <div className="site-benefit-grid">
        {data.items.map((item, index) => <article key={index}>
          <Editable as="textarea" publicAs="h3" value={item.title} onChange={edit(`items.${index}.title`)} label={`${index + 1}번째 핵심 제목`} />
          <Editable as="textarea" publicAs="p" value={item.description} onChange={edit(`items.${index}.description`)} label={`${index + 1}번째 핵심 설명`} />
        </article>)}
      </div>
    </section>
  )
}

function Story({ section, edit, editing }) {
  const data = section.data
  return (
    <section className={`site-section site-story image-${data.imagePosition || 'right'} ${!data.imageUrl ? 'without-image' : ''}`}>
      <div className="site-story-copy">
        <Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="상세 설명 제목" />
        <Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="상세 설명 내용" />
      </div>
      {data.imageUrl ? <figure style={imageFrameStyle(data)}><img src={data.imageUrl} alt={data.imageAlt || ''} /></figure> : editing ? <div className="site-image-placeholder"><ImageSquare /><span>속성 패널에서 이미지를 추가할 수 있어요</span></div> : null}
    </section>
  )
}

function Cards({ section, edit }) {
  const data = section.data
  return <section className="site-section site-cards"><header><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="카드 영역 제목" /><Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="카드 영역 설명" /></header><div className="site-card-mosaic">{data.items.map((item, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><Editable as="textarea" publicAs="h3" value={item.title} onChange={edit(`items.${index}.title`)} label={`${index + 1}번째 카드 제목`} /><Editable as="textarea" publicAs="p" value={item.description} onChange={edit(`items.${index}.description`)} label={`${index + 1}번째 카드 설명`} /></article>)}</div></section>
}

function Stats({ section, edit }) {
  const data = section.data
  return <section className="site-section site-stats"><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="핵심 수치 제목" /><div>{data.items.map((item, index) => <article key={index}><Editable value={item.value} publicAs="strong" onChange={edit(`items.${index}.value`)} label={`${index + 1}번째 강조 값`} /><Editable value={item.label} publicAs="span" onChange={edit(`items.${index}.label`)} label={`${index + 1}번째 강조 설명`} /></article>)}</div></section>
}

function Steps({ section, edit }) {
  const data = section.data
  return <section className="site-section site-steps"><header><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="진행 과정 제목" /><Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="진행 과정 설명" /></header><ol>{data.items.map((item, index) => <li key={index}><span>{index + 1}</span><div><Editable value={item.title} publicAs="h3" onChange={edit(`items.${index}.title`)} label={`${index + 1}번째 과정 제목`} /><Editable as="textarea" publicAs="p" value={item.description} onChange={edit(`items.${index}.description`)} label={`${index + 1}번째 과정 설명`} /></div></li>)}</ol></section>
}

function Quote({ section, edit }) {
  const data = section.data
  return <section className="site-section site-quote"><blockquote><Editable as="textarea" publicAs="p" value={data.quote} onChange={edit('quote')} label="인용 문구" /></blockquote><div><Editable value={data.name} publicAs="strong" onChange={edit('name')} label="인용 이름" /><Editable value={data.role} publicAs="span" onChange={edit('role')} label="인용 설명" /></div></section>
}

function Faq({ section, edit, editing }) {
  const data = section.data
  return <section className="site-section site-faq"><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="자주 묻는 질문 제목" /><div>{data.items.map((item, index) => editing ? <article key={index}><Editable value={item.question} publicAs="h3" onChange={edit(`items.${index}.question`)} label={`${index + 1}번째 질문`} /><Editable as="textarea" publicAs="p" value={item.answer} onChange={edit(`items.${index}.answer`)} label={`${index + 1}번째 답변`} /></article> : <details key={index} open={index === 0}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div></section>
}

function FormSection({ section, edit, project, preview, mobile }) {
  const data = section.data
  const changeFieldStyles = edit('fieldStyles')
  return (
    <section className="site-section site-form-section" id="site-application-form">
      <header>
        <Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="신청 폼 제목" />
        <Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="신청 폼 설명" />
      </header>
      {project ? <LandingFormEmbed project={project} preview={preview} mobile={mobile} settings={data} onFieldOrderChange={edit('fieldOrder')} onFieldStyleChange={(fieldId, value) => changeFieldStyles?.({ ...(data.fieldStyles || {}), [fieldId]: value })} /> : <div className="site-form-empty"><ShieldCheck weight="fill" /><strong>{data.emptyMessage}</strong></div>}
    </section>
  )
}

function Cta({ section, edit }) {
  const data = section.data
  const editing = Boolean(edit('title'))
  return <section className="site-section site-cta"><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="신청 유도 제목" /><Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="신청 유도 설명" />{editing ? <div className="site-main-cta is-editor-control"><Editable value={data.buttonLabel} onChange={edit('buttonLabel')} publicAs="span" label="신청 유도 버튼" /><ArrowRight /></div> : <button type="button" className="site-main-cta" onClick={goToForm}><span>{data.buttonLabel}</span><ArrowRight /></button>}</section>
}

function Notice({ section, edit }) {
  const data = section.data
  return <section className="site-section site-notice"><ShieldCheck weight="fill" /><div><Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="안내사항 제목" /><Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="안내사항 내용" /></div></section>
}

function Divider({ section, edit }) {
  return <section className="site-section site-divider"><span /><Editable value={section.data.label} publicAs="strong" onChange={edit('label')} label="구분선 문구" /><span /></section>
}

function BlockToolbar({ section, index, count, onMoveSection, onDuplicateSection, onToggleSection, onDeleteSection }) {
  const locked = ['hero', 'form'].includes(section.type)
  return <div className="site-block-toolbar" role="toolbar" aria-label="선택한 블록 도구" onClick={(event) => event.stopPropagation()}>
    <span className="site-toolbar-grip"><DotsSixVertical weight="bold" /></span>
    <button type="button" onClick={() => onMoveSection?.(section.id, -1)} disabled={index === 0} title="위로 이동" aria-label="위로 이동"><ArrowUp /></button>
    <button type="button" onClick={() => onMoveSection?.(section.id, 1)} disabled={index === count - 1} title="아래로 이동" aria-label="아래로 이동"><ArrowDown /></button>
    <button type="button" onClick={() => onDuplicateSection?.(section.id)} disabled={section.type === 'form'} title="복제" aria-label="블록 복제"><Copy /></button>
    <button type="button" onClick={() => onToggleSection?.(section.id)} title="숨기기" aria-label="블록 숨기기"><EyeSlash /></button>
    <button className="danger" type="button" onClick={() => onDeleteSection?.(section.id)} disabled={locked} title="삭제" aria-label="블록 삭제"><Trash /></button>
  </div>
}

function SectionResizeHandles({ section, onStyleChange }) {
  const widthValues = ['narrow', 'normal', 'wide']
  const spacingValues = ['compact', 'normal', 'air']
  function startResize(event, kind) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const values = kind === 'width' ? widthValues : spacingValues
    const current = kind === 'width' ? (section.style?.width || 'wide') : (section.style?.spacing || 'normal')
    const startIndex = Math.max(0, values.indexOf(current))
    let applied = startIndex
    const move = (moveEvent) => {
      const distance = kind === 'width' ? moveEvent.clientX - startX : moveEvent.clientY - startY
      const nextIndex = Math.max(0, Math.min(values.length - 1, startIndex + Math.round(distance / 64)))
      if (nextIndex === applied) return
      applied = nextIndex
      onStyleChange?.(section.id, kind === 'width' ? 'width' : 'spacing', values[nextIndex])
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.classList.remove('site-section-resizing')
    }
    document.body.classList.add('site-section-resizing')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }
  return <>
    <button className="site-section-resize site-section-resize-width" type="button" onPointerDown={(event) => startResize(event, 'width')} aria-label="블록 너비 드래그 조절" title="좌우로 드래그해 반응형 너비 조절" />
    <button className="site-section-resize site-section-resize-space" type="button" onPointerDown={(event) => startResize(event, 'spacing')} aria-label="블록 세로 간격 드래그 조절" title="위아래로 드래그해 세로 간격 조절" />
    <span className="site-section-size-badge">{section.style?.width === 'narrow' ? '좁게' : section.style?.width === 'normal' ? '보통' : '넓게'}</span>
  </>
}

function sectionClass(section) {
  const style = section.style || {}
  return ['site-block-shell', `site-type-${section.type}`, `site-tone-${style.tone || 'inherit'}`, `site-space-${style.spacing || 'normal'}`, `site-width-${style.width || 'wide'}`, `site-align-${style.align || 'left'}`, `site-pattern-${style.pattern || 'none'}`, `site-layout-${style.layout || 'default'}`, `site-elevation-${style.elevation || 'flat'}`, `site-motion-${style.motion || 'none'}`].join(' ')
}

export default function SiteRenderer({ site, project, editing = false, selectedSectionId = '', snapToGrid = false, mobile = false, onSelectSection, onSectionChange, onSectionStyleChange, onTextStyleChange, onMoveSection, onDuplicateSection, onToggleSection, onDeleteSection }) {
  const [activeTextLabel, setActiveTextLabel] = useState('')
  const sections = site.content?.sections || []
  const visibleSections = sections.filter((section) => section.enabled !== false)
  const cinematicHero = visibleSections.find((section) => section.type === 'hero' && section.style?.layout === 'cinematic')
  const cinematicForm = cinematicHero ? visibleSections.find((section) => section.type === 'form') : null
  const brandName = site.content?.brandName || 'SIGNAL NOTE'
  function change(section, path) {
    if (!onSectionChange) return undefined
    return (value) => onSectionChange(section.id, path, value)
  }
  function select(event, sectionId) {
    if (!editing) return
    event.stopPropagation()
    if (selectedSectionId !== sectionId) setActiveTextLabel('')
    onSelectSection?.(sectionId)
  }
  function renderSection(section, extraClass = '') {
    const edit = (path) => change(section, path)
    const selected = selectedSectionId === section.id
    const sectionIndex = sections.findIndex((item) => item.id === section.id)
    return <SiteEditContext.Provider value={{ section, selected, activeTextLabel, onTextSelect: setActiveTextLabel, onTextStyleChange, snapToGrid, mobile }} key={section.id}><div className={`${sectionClass(section)} ${extraClass} ${selected ? 'is-selected' : ''}`} onClick={(event) => select(event, section.id)}>
      {editing ? <span className="site-block-label">{SITE_BLOCKS.find((block) => block.type === section.type)?.label || '블록'}</span> : null}
      {editing && selected ? <BlockToolbar section={section} index={sectionIndex} count={sections.length} onMoveSection={onMoveSection} onDuplicateSection={onDuplicateSection} onToggleSection={onToggleSection} onDeleteSection={onDeleteSection} /> : null}
      {editing && selected ? <SectionResizeHandles section={section} onStyleChange={onSectionStyleChange} /> : null}
      {section.type === 'hero' ? <Hero section={section} edit={edit} /> : null}
      {section.type === 'ticker' ? <Ticker section={section} edit={edit} editing={editing} /> : null}
      {section.type === 'benefits' ? <Benefits section={section} edit={edit} /> : null}
      {section.type === 'story' ? <Story section={section} edit={edit} editing={editing} /> : null}
      {section.type === 'cards' ? <Cards section={section} edit={edit} /> : null}
      {section.type === 'stats' ? <Stats section={section} edit={edit} /> : null}
      {section.type === 'steps' ? <Steps section={section} edit={edit} /> : null}
      {section.type === 'quote' ? <Quote section={section} edit={edit} /> : null}
      {section.type === 'faq' ? <Faq section={section} edit={edit} editing={editing} /> : null}
      {section.type === 'form' ? <FormSection section={section} edit={edit} project={project} preview={editing} mobile={mobile} /> : null}
      {section.type === 'cta' ? <Cta section={section} edit={edit} /> : null}
      {section.type === 'notice' ? <Notice section={section} edit={edit} /> : null}
      {section.type === 'divider' ? <Divider section={section} edit={edit} /> : null}
    </div></SiteEditContext.Provider>
  }
  const cinematicImage = cinematicHero?.data?.imageUrl || '/assets/finance-signal-hero-v1.webp'
  const cinematicStyle = cinematicHero ? {
    backgroundImage: `url("${String(cinematicImage).replace(/["\\]/g, '\\$&')}")`,
    '--site-cinematic-overlay': Number(cinematicHero.data?.overlayStrength || 72) / 100,
    '--site-cinematic-focus-x': `${Number(cinematicHero.data?.imageFocus ?? 50)}%`,
    '--site-cinematic-focus-y': `${Number(cinematicHero.data?.imagePositionY ?? 50)}%`,
  } : undefined
  return (
    <div className={`site-renderer ${site.theme?.mode === 'light' ? 'is-light' : 'is-dark'} ${editing ? 'is-editing' : ''} ${cinematicHero && cinematicForm ? 'has-cinematic-hero' : ''}`} style={siteThemeStyle(site.theme)} onClick={() => onSelectSection?.('')}>
      <nav className="site-public-nav">
        <strong>{brandName}</strong>
        <a href="#site-application-form">신청하기 <ArrowRight /></a>
      </nav>
      <main>
        {visibleSections.map((section) => {
          if (cinematicForm && section.id === cinematicForm.id) return null
          if (cinematicHero && cinematicForm && section.id === cinematicHero.id) return <div className="site-cinematic-stage" style={cinematicStyle} key={section.id}>
            {renderSection(cinematicHero, 'site-cinematic-hero-shell')}
            {renderSection(cinematicForm, 'site-cinematic-form-shell')}
          </div>
          return renderSection(section)
        })}
      </main>
      <footer className="site-public-footer">
        {site.settings?.showBrand !== false ? <strong>{brandName}</strong> : <span />}
        <p>{site.settings?.footerText || ''}</p>
      </footer>
      {!editing && site.settings?.stickyCta !== false ? <button className="site-mobile-sticky-cta" type="button" onClick={goToForm}>신청하기 <ArrowRight weight="bold" /></button> : null}
    </div>
  )
}
