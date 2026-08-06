import { ArrowDown, ArrowRight, ImageSquare, ShieldCheck } from '@phosphor-icons/react'
import { siteThemeStyle } from '../lib/siteMaker'
import LandingFormEmbed from './LandingFormEmbed'

function Editable({ value, onChange, as = 'input', publicAs, className = '', label }) {
  if (!onChange) {
    const Tag = publicAs || (as === 'textarea' ? 'p' : as)
    return <Tag className={className}>{value}</Tag>
  }
  const Tag = as === 'textarea' ? 'textarea' : 'input'
  return <Tag className={`site-inline-edit ${className}`} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} rows={as === 'textarea' ? 3 : undefined} />
}

function Hero({ section, edit }) {
  const data = section.data
  const editing = Boolean(edit('title'))
  function goToForm() {
    document.getElementById('site-application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <section className={`site-section site-hero ${data.align === 'center' ? 'is-centered' : ''}`}>
      <div className="site-hero-copy">
        <Editable as="span" publicAs="span" className="site-hero-eyebrow" value={data.eyebrow} onChange={edit('eyebrow')} label="첫 화면 작은 제목" />
        <Editable as="textarea" publicAs="h1" className="site-hero-title" value={data.title} onChange={edit('title')} label="첫 화면 제목" />
        <Editable as="textarea" publicAs="p" className="site-hero-description" value={data.description} onChange={edit('description')} label="첫 화면 설명" />
        {editing ? <div className="site-main-cta is-editor-control"><Editable as="span" publicAs="span" value={data.buttonLabel} onChange={edit('buttonLabel')} label="신청 버튼 문구" /><ArrowDown weight="bold" /></div> : <button type="button" className="site-main-cta" onClick={goToForm}><span>{data.buttonLabel}</span><ArrowDown weight="bold" /></button>}
      </div>
      {data.imageUrl ? <figure className="site-hero-image"><img src={data.imageUrl} alt={data.imageAlt || ''} /></figure> : <div className="site-signal-art" aria-hidden="true"><span /><span /><span /><b /></div>}
    </section>
  )
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
      {data.imageUrl ? <figure><img src={data.imageUrl} alt={data.imageAlt || ''} /></figure> : editing ? <div className="site-image-placeholder"><ImageSquare /><span>오른쪽 설정에서 이미지를 추가할 수 있어요</span></div> : null}
    </section>
  )
}

function FormSection({ section, edit, project, preview }) {
  const data = section.data
  return (
    <section className="site-section site-form-section" id="site-application-form">
      <header>
        <Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="신청 폼 제목" />
        <Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="신청 폼 설명" />
      </header>
      {project ? <LandingFormEmbed project={project} preview={preview} /> : <div className="site-form-empty"><ShieldCheck weight="fill" /><strong>{data.emptyMessage}</strong></div>}
    </section>
  )
}

function Notice({ section, edit }) {
  const data = section.data
  return (
    <section className="site-section site-notice">
      <ShieldCheck weight="fill" />
      <div>
        <Editable as="textarea" publicAs="h2" value={data.title} onChange={edit('title')} label="안내사항 제목" />
        <Editable as="textarea" publicAs="p" value={data.description} onChange={edit('description')} label="안내사항 내용" />
      </div>
    </section>
  )
}

export default function SiteRenderer({ site, project, editing = false, selectedSectionId = '', onSelectSection, onSectionChange }) {
  const sections = site.content?.sections || []
  const brandName = site.content?.brandName || 'SIGNAL NOTE'
  function change(section, path) {
    if (!onSectionChange) return undefined
    return (value) => onSectionChange(section.id, path, value)
  }
  function select(event, sectionId) {
    if (!editing) return
    event.stopPropagation()
    onSelectSection?.(sectionId)
  }
  return (
    <div className={`site-renderer ${site.theme?.mode === 'light' ? 'is-light' : 'is-dark'} ${editing ? 'is-editing' : ''}`} style={siteThemeStyle(site.theme)} onClick={() => onSelectSection?.('')}>
      <nav className="site-public-nav">
        <strong>{brandName}</strong>
        <a href="#site-application-form">신청하기 <ArrowRight /></a>
      </nav>
      <main>
        {sections.filter((section) => section.enabled !== false).map((section) => (
          <div className={`site-block-shell ${selectedSectionId === section.id ? 'is-selected' : ''}`} key={section.id} onClick={(event) => select(event, section.id)}>
            {editing ? <span className="site-block-label">{section.type === 'hero' ? '첫 화면' : section.type === 'benefits' ? '핵심 안내' : section.type === 'story' ? '상세 설명' : section.type === 'form' ? '신청 폼' : '안내사항'}</span> : null}
            {section.type === 'hero' ? <Hero section={section} edit={(path) => change(section, path)} /> : null}
            {section.type === 'benefits' ? <Benefits section={section} edit={(path) => change(section, path)} /> : null}
            {section.type === 'story' ? <Story section={section} edit={(path) => change(section, path)} editing={editing} /> : null}
            {section.type === 'form' ? <FormSection section={section} edit={(path) => change(section, path)} project={project} preview={editing} /> : null}
            {section.type === 'notice' ? <Notice section={section} edit={(path) => change(section, path)} /> : null}
          </div>
        ))}
      </main>
      <footer className="site-public-footer">
        {site.settings?.showBrand !== false ? <strong>{brandName}</strong> : <span />}
        <p>{site.settings?.footerText || ''}</p>
      </footer>
    </div>
  )
}
