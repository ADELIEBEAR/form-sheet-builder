import {
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowSquareOut,
  Cards,
  ChartBar,
  Check,
  ClipboardText,
  Copy,
  Desktop,
  DeviceMobile,
  DotsSixVertical,
  Eye,
  EyeSlash,
  FloppyDisk,
  GlobeHemisphereWest,
  GridFour,
  Image,
  ListNumbers,
  Megaphone,
  Minus,
  PaintBrush,
  Plus,
  Question,
  Quotes,
  Rows,
  ShieldCheck,
  SidebarSimple,
  SlidersHorizontal,
  SpinnerGap,
  TextT,
  Trash,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppFrame from '../components/AppFrame'
import ImageUpload from '../components/ImageUpload'
import SiteRenderer from '../components/SiteRenderer'
import { api } from '../lib/api'
import { AUTO_SAVE_INTERVAL } from '../lib/autosave'
import { FONT_PRESETS } from '../lib/maker'
import { useNavigate, useParams } from '../lib/router'
import { publicSiteUrl } from '../lib/share'
import { emptySite, makeSiteSection, SECTION_STYLE_OPTIONS, SITE_BLOCKS, SITE_THEME_PRESETS } from '../lib/siteMaker'

const BLOCK_ICONS = {
  hero: Image,
  ticker: Megaphone,
  benefits: GridFour,
  story: TextT,
  cards: Cards,
  stats: ChartBar,
  steps: ListNumbers,
  quote: Quotes,
  faq: Question,
  form: ClipboardText,
  cta: Megaphone,
  notice: ShieldCheck,
  divider: Minus,
}

function setAtPath(source, path, value) {
  const keys = path.split('.')
  const next = structuredClone(source)
  let cursor = next
  keys.forEach((key, index) => {
    if (index === keys.length - 1) cursor[key] = value
    else cursor = cursor[key]
  })
  return next
}

function move(items, from, to) {
  if (from === to || from < 0 || to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function formatDataSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

export default function SiteStudio() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(emptySite)
  const [projects, setProjects] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [device, setDevice] = useState('desktop')
  const [panel, setPanel] = useState('object')
  const [leftMode, setLeftMode] = useState('layers')
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [zoom, setZoom] = useState(75)
  const [guides, setGuides] = useState(false)
  const [loading, setLoading] = useState(Boolean(siteId))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('저장됨')
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState(-1)
  const [historyVersion, setHistoryVersion] = useState(0)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const revisionRef = useRef(0)
  const saveRef = useRef(null)
  const undoRef = useRef([])
  const redoRef = useRef([])
  const sectionClipboardRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const siteRequest = siteId ? api(`/maker/sites/${siteId}`) : Promise.resolve({ site: emptySite() })
    Promise.allSettled([siteRequest, api('/maker/projects')]).then(([siteResult, projectResult]) => {
      if (cancelled) return
      if (siteResult.status === 'fulfilled') {
        setSite(siteResult.value.site)
        setSelectedSectionId(siteResult.value.site.content?.sections?.[0]?.id || '')
      } else setError(siteResult.reason?.message || '사이트를 불러오지 못했습니다.')
      if (projectResult.status === 'fulfilled') setProjects(projectResult.value.projects)
      else if (!siteId) setError(projectResult.reason?.message || '신청 폼 목록을 불러오지 못했습니다.')
      dirtyRef.current = false
      setDirty(false)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [siteId])

  useEffect(() => {
    const timer = window.setInterval(() => saveRef.current?.(undefined, true), AUTO_SAVE_INTERVAL)
    return () => window.clearInterval(timer)
  }, [])

  const selectedSection = useMemo(() => site.content?.sections?.find((section) => section.id === selectedSectionId), [selectedSectionId, site.content?.sections])
  const linkedProject = useMemo(() => projects.find((project) => project.id === site.formProjectId) || null, [projects, site.formProjectId])
  const storageSummary = useMemo(() => {
    const bytes = new TextEncoder().encode(JSON.stringify({ content: site.content, theme: site.theme, settings: site.settings })).length
    const imageCount = (site.content?.sections || []).filter((section) => section.data?.imageUrl).length
    return { bytes, imageCount }
  }, [site.content, site.settings, site.theme])

  function markDirty() {
    revisionRef.current += 1
    dirtyRef.current = true
    setDirty(true)
    setNotice('저장 필요')
  }

  function syncHistory() {
    setHistoryVersion((value) => value + 1)
  }

  function changeSite(nextOrUpdater, { history = true } = {}) {
    setSite((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater
      if (history) {
        undoRef.current.push(structuredClone(current))
        if (undoRef.current.length > 80) undoRef.current.shift()
        redoRef.current = []
        syncHistory()
      }
      return next
    })
    markDirty()
  }

  function undo() {
    const previous = undoRef.current.pop()
    if (!previous) return
    setSite((current) => {
      redoRef.current.push(structuredClone(current))
      return previous
    })
    markDirty()
    syncHistory()
  }

  function redo() {
    const next = redoRef.current.pop()
    if (!next) return
    setSite((current) => {
      undoRef.current.push(structuredClone(current))
      return next
    })
    markDirty()
    syncHistory()
  }

  function updateSection(sectionId, path, value) {
    changeSite((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: current.content.sections.map((section) => section.id === sectionId ? { ...section, data: setAtPath(section.data, path, value) } : section),
      },
    }))
  }

  function updateSectionPatch(sectionId, patch) {
    changeSite((current) => ({
      ...current,
      content: { ...current.content, sections: current.content.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section) },
    }))
  }

  function updateSelectedStyle(key, value) {
    if (!selectedSection) return
    updateSectionPatch(selectedSection.id, { style: { ...selectedSection.style, [key]: value } })
  }

  function addBlock(type) {
    if (type === 'form' && site.content.sections.some((section) => section.type === 'form')) {
      setError('신청 폼 블록은 한 개만 사용할 수 있습니다.')
      return
    }
    const section = makeSiteSection(type)
    changeSite((current) => {
      const sections = [...current.content.sections]
      const selectedIndex = sections.findIndex((item) => item.id === selectedSectionId)
      sections.splice(selectedIndex < 0 ? sections.length : selectedIndex + 1, 0, section)
      return { ...current, content: { ...current.content, sections } }
    })
    setSelectedSectionId(section.id)
    setPanel('object')
    setLeftMode('layers')
  }

  function duplicateSection(sectionId = selectedSectionId) {
    const source = site.content.sections.find((section) => section.id === sectionId)
    if (!source || source.type === 'form') return
    const copy = { ...structuredClone(source), id: crypto.randomUUID() }
    changeSite((current) => {
      const index = current.content.sections.findIndex((section) => section.id === sectionId)
      const sections = [...current.content.sections]
      sections.splice(index + 1, 0, copy)
      return { ...current, content: { ...current.content, sections } }
    })
    setSelectedSectionId(copy.id)
  }

  function cleanupSectionAsset(section) {
    const url = section?.data?.imageUrl
    if (url) api('/maker/assets', { method: 'DELETE', body: { url } }).catch(() => {})
  }

  function deleteSection(sectionId = selectedSectionId) {
    const source = site.content.sections.find((section) => section.id === sectionId)
    if (!source || ['hero', 'form'].includes(source.type)) {
      setError('첫 화면과 신청 폼 블록은 삭제할 수 없습니다.')
      return
    }
    const index = site.content.sections.findIndex((section) => section.id === sectionId)
    const nextSelection = site.content.sections[index - 1]?.id || site.content.sections[index + 1]?.id || ''
    changeSite((current) => ({ ...current, content: { ...current.content, sections: current.content.sections.filter((section) => section.id !== sectionId) } }))
    cleanupSectionAsset(source)
    setSelectedSectionId(nextSelection)
  }

  function toggleSection(sectionId = selectedSectionId) {
    const source = site.content.sections.find((section) => section.id === sectionId)
    if (!source) return
    updateSectionPatch(sectionId, { enabled: source.enabled === false })
  }

  function reorder(from, to) {
    changeSite((current) => ({ ...current, content: { ...current.content, sections: move(current.content.sections, from, to) } }))
  }

  function moveSection(sectionId, direction) {
    const index = site.content.sections.findIndex((section) => section.id === sectionId)
    reorder(index, index + direction)
  }

  function copySection() {
    if (!selectedSection || selectedSection.type === 'form') return
    sectionClipboardRef.current = structuredClone(selectedSection)
    setNotice('블록 복사됨')
  }

  function pasteSection() {
    const source = sectionClipboardRef.current
    if (!source || source.type === 'form') return
    const copy = { ...structuredClone(source), id: crypto.randomUUID() }
    changeSite((current) => {
      const index = current.content.sections.findIndex((section) => section.id === selectedSectionId)
      const sections = [...current.content.sections]
      sections.splice(index < 0 ? sections.length : index + 1, 0, copy)
      return { ...current, content: { ...current.content, sections } }
    })
    setSelectedSectionId(copy.id)
  }

  useEffect(() => {
    function keydown(event) {
      const command = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (command && key === 's') {
        event.preventDefault()
        saveRef.current?.()
      } else if (command && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((command && key === 'z' && event.shiftKey) || (command && key === 'y')) {
        event.preventDefault()
        redo()
      } else if (command && key === 'c' && !isTypingTarget(event.target)) {
        event.preventDefault()
        copySection()
      } else if (command && key === 'v' && !isTypingTarget(event.target)) {
        event.preventDefault()
        pasteSection()
      } else if (command && key === 'd' && !isTypingTarget(event.target)) {
        event.preventDefault()
        duplicateSection()
      } else if (event.altKey && event.key === 'ArrowUp' && selectedSectionId) {
        event.preventDefault()
        moveSection(selectedSectionId, -1)
      } else if (event.altKey && event.key === 'ArrowDown' && selectedSectionId) {
        event.preventDefault()
        moveSection(selectedSectionId, 1)
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedSectionId && !isTypingTarget(event.target)) {
        event.preventDefault()
        deleteSection()
      } else if (event.key === 'Escape') setSelectedSectionId('')
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [selectedSectionId, site])

  async function save(nextStatus = site.status, automatic = false) {
    if (savingRef.current || (automatic && (!dirtyRef.current || loading))) return
    if (nextStatus === 'published' && !linkedProject) {
      setError('공개하려면 먼저 신청 폼을 연결해 주세요.')
      setPanel('site')
      setInspectorOpen(true)
      return
    }
    if (nextStatus === 'published' && linkedProject.status !== 'published') {
      setError('연결한 신청 폼을 먼저 공개해 주세요.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setError('')
    const revision = revisionRef.current
    try {
      const payload = { ...site, status: nextStatus }
      const data = siteId
        ? await api(`/maker/sites/${siteId}`, { method: 'PUT', body: payload })
        : await api('/maker/sites', { method: 'POST', body: payload })
      if (revisionRef.current === revision) {
        setSite(data.site)
        dirtyRef.current = false
        setDirty(false)
      } else setSite((current) => ({ ...current, id: data.site.id, status: data.site.status, updatedAt: data.site.updatedAt }))
      setNotice(automatic ? '자동 저장됨' : '저장됨')
      if (!siteId) navigate(`/site/${data.site.id}`, { replace: true })
    } catch (caught) {
      setError(caught.message)
      setNotice('저장 실패')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  saveRef.current = save

  if (loading) return <div className="public-loading"><SpinnerGap className="spin" /><span>사이트 편집기를 준비하는 중입니다</span></div>

  const selectedInfo = SITE_BLOCKS.find((block) => block.type === selectedSection?.type)
  const canUndo = historyVersion >= 0 && undoRef.current.length > 0
  const canRedo = historyVersion >= 0 && redoRef.current.length > 0
  const availableBlocks = SITE_BLOCKS.filter((block) => block.type !== 'hero' && !(block.type === 'form' && site.content.sections.some((section) => section.type === 'form')))

  return (
    <AppFrame backTo="/sites" center={<div className="site-studio-title"><input value={site.title} onChange={(event) => changeSite({ ...site, title: event.target.value })} aria-label="사이트 관리용 제목" /><span className={dirty ? 'is-dirty' : ''}>{notice}</span></div>} actions={<>
      <div className="site-history-tools" role="group" aria-label="편집 기록"><button type="button" onClick={undo} disabled={!canUndo} title="실행 취소 Ctrl+Z"><ArrowCounterClockwise /></button><button type="button" onClick={redo} disabled={!canRedo} title="다시 실행 Ctrl+Shift+Z"><ArrowClockwise /></button></div>
      <div className="site-device-switch" role="group" aria-label="미리보기 화면"><button className={device === 'desktop' ? 'active' : ''} type="button" onClick={() => setDevice('desktop')} aria-label="PC 미리보기"><Desktop /></button><button className={device === 'mobile' ? 'active' : ''} type="button" onClick={() => setDevice('mobile')} aria-label="모바일 미리보기"><DeviceMobile /></button></div>
      <button className={`site-top-icon ${outlineOpen ? 'active' : ''}`} type="button" onClick={() => setOutlineOpen((value) => !value)} title="왼쪽 패널"><SidebarSimple /></button>
      <button className={`site-top-icon ${inspectorOpen ? 'active' : ''}`} type="button" onClick={() => setInspectorOpen((value) => !value)} title="속성 패널"><SlidersHorizontal /></button>
      {site.status === 'published' && site.id ? <a className="studio-secondary site-open-public" href={publicSiteUrl(site)} target="_blank" rel="noreferrer"><ArrowSquareOut /> 공개 페이지</a> : null}
      <button className="studio-secondary site-save" type="button" onClick={() => save()} disabled={saving}>{saving ? <SpinnerGap className="spin" /> : <FloppyDisk />} 저장</button>
      <button className="studio-primary site-publish" type="button" onClick={() => save(site.status === 'published' ? 'draft' : 'published')} disabled={saving}><GlobeHemisphereWest weight="fill" /> {site.status === 'published' ? '비공개로 전환' : '공개하기'}</button>
    </>}>
      <main className={`site-studio ${outlineOpen ? '' : 'outline-closed'} ${inspectorOpen ? '' : 'inspector-closed'}`}>
        <aside className="site-outline-panel" aria-hidden={!outlineOpen}>
          <nav className="site-left-tabs"><button className={leftMode === 'layers' ? 'active' : ''} type="button" onClick={() => setLeftMode('layers')}><Rows /> 레이어</button><button className={leftMode === 'blocks' ? 'active' : ''} type="button" onClick={() => setLeftMode('blocks')}><Plus /> 블록</button></nav>
          {leftMode === 'layers' ? <>
            <header><div><strong>페이지 구성</strong><span>끌어서 순서를 바꾸거나 캔버스에서 바로 편집하세요</span></div><button type="button" onClick={() => setLeftMode('blocks')} aria-label="블록 추가"><Plus /></button></header>
            <div className="site-outline-list">
              {site.content.sections.map((section, index) => {
                const info = SITE_BLOCKS.find((block) => block.type === section.type)
                const Icon = BLOCK_ICONS[section.type] || Rows
                return <button className={`${selectedSectionId === section.id ? 'active' : ''} ${section.enabled === false ? 'disabled-block' : ''}`} type="button" key={section.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { reorder(dragIndex, index); setDragIndex(-1) }} onClick={() => { setSelectedSectionId(section.id); setPanel('object'); setInspectorOpen(true) }}><DotsSixVertical /><Icon /><span><strong>{info?.label}</strong><small>{section.data?.title || section.data?.eyebrow || section.data?.label || info?.description}</small></span>{section.enabled !== false ? <Eye /> : <EyeSlash />}</button>
              })}
            </div>
            <button className="site-add-block-primary" type="button" onClick={() => setLeftMode('blocks')}><Plus /> 블록 추가</button>
          </> : <div className="site-block-library">
            <header><strong>블록 라이브러리</strong><span>선택한 블록 바로 아래에 추가됩니다</span></header>
            {Array.from(new Set(availableBlocks.map((block) => block.category))).map((category) => <section key={category}><h3>{category}</h3><div>{availableBlocks.filter((block) => block.category === category).map((block) => {
              const Icon = BLOCK_ICONS[block.type] || Rows
              return <button type="button" key={block.type} onClick={() => addBlock(block.type)}><span className={`site-block-thumb type-${block.type}`}><Icon /></span><strong>{block.label}</strong><small>{block.description}</small></button>
            })}</div></section>)}
          </div>}
        </aside>

        <section className={`site-canvas-stage device-${device} ${guides ? 'show-guides' : ''}`} onClick={() => setSelectedSectionId('')}>
          <div className="site-canvas-controls" onClick={(event) => event.stopPropagation()}>
            <button className={guides ? 'active' : ''} type="button" onClick={() => setGuides((value) => !value)}><GridFour /> 그리드</button>
            <label><span>확대</span><select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value="60">60%</option><option value="75">75%</option><option value="90">90%</option><option value="100">100%</option><option value="110">110%</option></select></label>
            <span className="site-shortcut-hint">Ctrl+Z 실행 취소 · Ctrl+D 복제 · Alt+↑↓ 이동</span>
          </div>
          <div className="site-canvas-frame" style={{ '--site-editor-zoom': zoom / 100, '--site-editor-width': device === 'mobile' ? '390px' : `${10000 / zoom}%` }}><SiteRenderer site={site} project={linkedProject} editing selectedSectionId={selectedSectionId} onSelectSection={(id) => { setSelectedSectionId(id); if (id) { setPanel('object'); setInspectorOpen(true) } }} onSectionChange={updateSection} onMoveSection={moveSection} onDuplicateSection={duplicateSection} onToggleSection={toggleSection} onDeleteSection={deleteSection} /></div>
        </section>

        <aside className="site-inspector" aria-hidden={!inspectorOpen}>
          <nav><button className={panel === 'object' ? 'active' : ''} type="button" onClick={() => setPanel('object')}><SlidersHorizontal /> 블록</button><button className={panel === 'theme' ? 'active' : ''} type="button" onClick={() => setPanel('theme')}><PaintBrush /> 테마</button><button className={panel === 'site' ? 'active' : ''} type="button" onClick={() => setPanel('site')}><GlobeHemisphereWest /> 사이트</button></nav>
          {error ? <div className="inline-alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="오류 닫기">×</button></div> : null}
          {panel === 'object' ? <div className="site-inspector-scroll">
            {selectedSection ? <>
              <section className="site-selection-head"><div><span>{selectedInfo?.category}</span><h2>{selectedInfo?.label}</h2><p>{selectedInfo?.description}</p></div><label className="site-switch"><input type="checkbox" checked={selectedSection.enabled !== false} onChange={(event) => updateSectionPatch(selectedSection.id, { enabled: event.target.checked })} /><span /></label></section>
              <section className="site-setting-group"><h3>레이아웃</h3><div className="site-segment-field"><span>폭</span><div>{SECTION_STYLE_OPTIONS.width.map(([value, label]) => <button className={selectedSection.style?.width === value ? 'active' : ''} type="button" key={value} onClick={() => updateSelectedStyle('width', value)}>{label}</button>)}</div></div><div className="site-segment-field"><span>간격</span><div>{SECTION_STYLE_OPTIONS.spacing.map(([value, label]) => <button className={selectedSection.style?.spacing === value ? 'active' : ''} type="button" key={value} onClick={() => updateSelectedStyle('spacing', value)}>{label}</button>)}</div></div><div className="site-segment-field"><span>정렬</span><div>{SECTION_STYLE_OPTIONS.align.map(([value, label]) => <button className={selectedSection.style?.align === value ? 'active' : ''} type="button" key={value} onClick={() => updateSelectedStyle('align', value)}>{label}</button>)}</div></div></section>
              <section className="site-setting-group"><h3>표면과 효과</h3><div className="site-choice-grid">{SECTION_STYLE_OPTIONS.tone.map(([value, label]) => <button className={`${selectedSection.style?.tone === value ? 'active' : ''} tone-${value}`} type="button" key={value} onClick={() => updateSelectedStyle('tone', value)}><i /><span>{label}</span></button>)}</div><label>배경 패턴<select value={selectedSection.style?.pattern || 'none'} onChange={(event) => updateSelectedStyle('pattern', event.target.value)}>{SECTION_STYLE_OPTIONS.pattern.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>
              {['hero', 'story'].includes(selectedSection.type) ? <section className="site-setting-group"><h3>이미지</h3><ImageUpload value={selectedSection.data.imageUrl} formId={site.id} maxEdge={1600} quality={0.76} maxBytes={2 * 1024 * 1024} label="섹션 이미지" onChange={(url) => updateSection(selectedSection.id, 'imageUrl', url)} /><label>이미지 설명<input value={selectedSection.data.imageAlt || ''} onChange={(event) => updateSection(selectedSection.id, 'imageAlt', event.target.value)} /></label>{selectedSection.type === 'story' ? <label>이미지 위치<select value={selectedSection.data.imagePosition || 'right'} onChange={(event) => updateSection(selectedSection.id, 'imagePosition', event.target.value)}><option value="right">오른쪽</option><option value="left">왼쪽</option></select></label> : null}</section> : null}
              <section className="site-setting-group"><h3>빠른 작업</h3><div className="site-section-actions"><button type="button" onClick={() => duplicateSection()} disabled={selectedSection.type === 'form'}><Copy /> 복제</button><button type="button" onClick={() => toggleSection()}>{selectedSection.enabled === false ? <Eye /> : <EyeSlash />} {selectedSection.enabled === false ? '표시' : '숨김'}</button><button className="danger" type="button" onClick={() => deleteSection()} disabled={['hero', 'form'].includes(selectedSection.type)}><Trash /> 삭제</button></div></section>
            </> : <div className="site-no-selection"><SlidersHorizontal /><strong>캔버스에서 블록을 선택하세요</strong><p>글자는 바로 수정하고, 이곳에서는 폭과 간격, 배경 효과를 조절할 수 있습니다.</p><button type="button" onClick={() => { setLeftMode('blocks'); setOutlineOpen(true) }}><Plus /> 블록 추가</button></div>}
          </div> : null}
          {panel === 'theme' ? <div className="site-inspector-scroll">
            <section className="site-setting-group"><div className="site-group-heading"><div><h3>완성형 테마</h3><p>색, 글꼴, 형태를 한 번에 적용합니다</p></div></div><div className="site-theme-list">{SITE_THEME_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => changeSite({ ...site, theme: { ...preset.theme } })}><span style={{ background: preset.theme.background, color: preset.theme.text }}><i style={{ background: preset.theme.accent }} /></span><span><strong>{preset.name}</strong><small>{preset.description}</small></span>{site.theme.accent === preset.theme.accent && site.theme.background === preset.theme.background ? <Check /> : null}</button>)}</div></section>
            <section className="site-setting-group"><h3>색상</h3><div className="site-color-grid">{[['accent', '강조'], ['background', '배경'], ['surface', '표면'], ['text', '글자']].map(([key, label]) => <label key={key}><span>{label}</span><input type="color" value={site.theme[key]} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, [key]: event.target.value } })} /></label>)}</div></section>
            <section className="site-setting-group"><h3>타이포그래피</h3><label>글꼴<select value={site.theme.font} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, font: event.target.value } })}>{FONT_PRESETS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>제목 크기 <span>{Math.round((site.theme.displayScale || 1) * 100)}%</span><input type="range" min="75" max="135" value={Math.round((site.theme.displayScale || 1) * 100)} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, displayScale: Number(event.target.value) / 100 } })} /></label><label>본문 크기 <span>{Math.round((site.theme.bodyScale || 1) * 100)}%</span><input type="range" min="80" max="125" value={Math.round((site.theme.bodyScale || 1) * 100)} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, bodyScale: Number(event.target.value) / 100 } })} /></label><label>전체 여백 <span>{Math.round((site.theme.sectionScale || 1) * 100)}%</span><input type="range" min="70" max="135" value={Math.round((site.theme.sectionScale || 1) * 100)} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, sectionScale: Number(event.target.value) / 100 } })} /></label><label>모서리 <span>{site.theme.radius}px</span><input type="range" min="0" max="32" value={site.theme.radius} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, radius: Number(event.target.value) } })} /></label></section>
          </div> : null}
          {panel === 'site' ? <div className="site-inspector-scroll">
            <section className="site-setting-group"><h3>기본 설정</h3><label>브랜드 이름<input value={site.content.brandName} onChange={(event) => changeSite({ ...site, content: { ...site.content, brandName: event.target.value } })} /></label><label>공개 주소<div className="site-slug-input"><span>/p/</span><input value={site.slug} onChange={(event) => changeSite({ ...site, slug: event.target.value })} placeholder="signal-note" /></div></label><label>연결할 신청 폼<select value={site.formProjectId} onChange={(event) => changeSite({ ...site, formProjectId: event.target.value })}><option value="">폼을 선택해 주세요</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} {project.status === 'published' ? '(공개)' : '(초안)'}</option>)}</select></label>{linkedProject?.status === 'draft' ? <p className="site-setting-help">사이트를 공개하려면 이 폼도 먼저 공개해야 합니다.</p> : null}</section>
            <section className="site-setting-group"><h3>하단 안내</h3><label>문구<textarea rows="4" value={site.settings.footerText} onChange={(event) => changeSite({ ...site, settings: { ...site.settings, footerText: event.target.value } })} /></label><label className="site-check-row"><input type="checkbox" checked={site.settings.showBrand !== false} onChange={(event) => changeSite({ ...site, settings: { ...site.settings, showBrand: event.target.checked } })} /><span><strong>하단 브랜드 표시</strong><small>페이지 끝에 브랜드 이름을 보여줍니다.</small></span></label></section>
            <section className="site-storage-card"><div><strong>저장 용량</strong><span>{formatDataSize(storageSummary.bytes)} 설정 · 이미지 {storageSummary.imageCount}개</span></div><p>테마, 패턴, 레이아웃은 작은 설정값으로 저장됩니다. 이미지는 올릴 때 자동으로 WebP 압축하고, 교체하거나 삭제하면 이전 파일도 정리합니다.</p></section>
          </div> : null}
        </aside>
      </main>
    </AppFrame>
  )
}
