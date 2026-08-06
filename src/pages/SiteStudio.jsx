import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  Check,
  Copy,
  Desktop,
  DeviceMobile,
  DotsSixVertical,
  Eye,
  FloppyDisk,
  GlobeHemisphereWest,
  PaintBrush,
  Plus,
  SpinnerGap,
  Trash,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AppFrame from '../components/AppFrame'
import ImageUpload from '../components/ImageUpload'
import SiteRenderer from '../components/SiteRenderer'
import { api } from '../lib/api'
import { AUTO_SAVE_INTERVAL } from '../lib/autosave'
import { Link, useNavigate, useParams } from '../lib/router'
import { publicSiteUrl } from '../lib/share'
import { emptySite, makeSiteSection, SITE_BLOCKS, SITE_THEME_PRESETS } from '../lib/siteMaker'

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

export default function SiteStudio() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(emptySite)
  const [projects, setProjects] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [device, setDevice] = useState('desktop')
  const [panel, setPanel] = useState('content')
  const [loading, setLoading] = useState(Boolean(siteId))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('저장됨')
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState(-1)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const revisionRef = useRef(0)
  const saveRef = useRef(null)
  const undoRef = useRef([])
  const redoRef = useRef([])

  useEffect(() => {
    let cancelled = false
    Promise.all([siteId ? api(`/maker/sites/${siteId}`) : Promise.resolve({ site: emptySite() }), api('/maker/projects')])
      .then(([siteData, projectData]) => {
        if (cancelled) return
        setSite(siteData.site)
        setProjects(projectData.projects)
        setSelectedSectionId(siteData.site.content?.sections?.[0]?.id || '')
        dirtyRef.current = false
        setDirty(false)
      })
      .catch((caught) => { if (!cancelled) setError(caught.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [siteId])

  useEffect(() => {
    const timer = window.setInterval(() => saveRef.current?.(undefined, true), AUTO_SAVE_INTERVAL)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function keydown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current?.()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        const previous = undoRef.current.pop()
        if (!previous) return
        redoRef.current.push(site)
        setSite(previous)
        dirtyRef.current = true
        setDirty(true)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [site])

  const selectedSection = useMemo(() => site.content?.sections?.find((section) => section.id === selectedSectionId), [selectedSectionId, site.content?.sections])
  const linkedProject = useMemo(() => projects.find((project) => project.id === site.formProjectId) || null, [projects, site.formProjectId])

  function changeSite(nextOrUpdater, { history = true } = {}) {
    setSite((current) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater
      if (history) {
        undoRef.current.push(structuredClone(current))
        if (undoRef.current.length > 50) undoRef.current.shift()
        redoRef.current = []
      }
      return next
    })
    revisionRef.current += 1
    dirtyRef.current = true
    setDirty(true)
    setNotice('저장 필요')
  }

  async function save(nextStatus = site.status, automatic = false) {
    if (savingRef.current || (automatic && (!dirtyRef.current || loading))) return
    if (nextStatus === 'published' && !linkedProject) {
      setError('공개하려면 먼저 신청 폼을 연결해 주세요.')
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
      } else {
        setSite((current) => ({ ...current, id: data.site.id, status: data.site.status, updatedAt: data.site.updatedAt }))
      }
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

  function updateSection(sectionId, path, value) {
    changeSite((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: current.content.sections.map((section) => section.id === sectionId ? { ...section, data: setAtPath(section.data, path, value) } : section),
      },
    }))
  }

  function updateSelected(patch) {
    if (!selectedSection) return
    changeSite((current) => ({
      ...current,
      content: { ...current.content, sections: current.content.sections.map((section) => section.id === selectedSection.id ? { ...section, ...patch } : section) },
    }))
  }

  function addBlock(type) {
    if (type === 'form' && site.content.sections.some((section) => section.type === 'form')) {
      setError('신청 폼 블록은 한 개만 사용할 수 있습니다.')
      return
    }
    const section = makeSiteSection(type)
    changeSite((current) => ({ ...current, content: { ...current.content, sections: [...current.content.sections, section] } }))
    setSelectedSectionId(section.id)
    setPanel('content')
  }

  function duplicateSelected() {
    if (!selectedSection || selectedSection.type === 'form') return
    const copy = { ...structuredClone(selectedSection), id: crypto.randomUUID() }
    const index = site.content.sections.findIndex((section) => section.id === selectedSection.id)
    changeSite((current) => ({ ...current, content: { ...current.content, sections: [...current.content.sections.slice(0, index + 1), copy, ...current.content.sections.slice(index + 1)] } }))
    setSelectedSectionId(copy.id)
  }

  function deleteSelected() {
    if (!selectedSection || selectedSection.type === 'hero' || selectedSection.type === 'form') {
      setError('첫 화면과 신청 폼 블록은 삭제할 수 없습니다.')
      return
    }
    const next = site.content.sections.filter((section) => section.id !== selectedSection.id)
    changeSite((current) => ({ ...current, content: { ...current.content, sections: next } }))
    setSelectedSectionId(next[0]?.id || '')
  }

  function reorder(from, to) {
    changeSite((current) => ({ ...current, content: { ...current.content, sections: move(current.content.sections, from, to) } }))
  }

  if (loading) return <div className="public-loading"><SpinnerGap className="spin" /><span>사이트 편집기를 준비하는 중입니다</span></div>

  return (
    <AppFrame backTo="/sites" center={<div className="site-studio-title"><input value={site.title} onChange={(event) => changeSite({ ...site, title: event.target.value })} aria-label="사이트 관리용 제목" /><span className={dirty ? 'is-dirty' : ''}>{notice}</span></div>} actions={<>
      <div className="site-device-switch" role="group" aria-label="미리보기 화면"><button className={device === 'desktop' ? 'active' : ''} type="button" onClick={() => setDevice('desktop')} aria-label="PC 미리보기"><Desktop /></button><button className={device === 'mobile' ? 'active' : ''} type="button" onClick={() => setDevice('mobile')} aria-label="모바일 미리보기"><DeviceMobile /></button></div>
      {site.status === 'published' && site.id ? <a className="studio-secondary site-open-public" href={publicSiteUrl(site)} target="_blank" rel="noreferrer"><ArrowSquareOut /> 공개 페이지</a> : null}
      <button className="studio-secondary site-save" type="button" onClick={() => save()} disabled={saving}>{saving ? <SpinnerGap className="spin" /> : <FloppyDisk />} 저장</button>
      <button className="studio-primary site-publish" type="button" onClick={() => save(site.status === 'published' ? 'draft' : 'published')} disabled={saving}><GlobeHemisphereWest weight="fill" /> {site.status === 'published' ? '비공개로 전환' : '공개하기'}</button>
    </>}>
      <main className="site-studio">
        <aside className="site-outline-panel">
          <header><div><strong>페이지 구성</strong><span>끌어서 순서를 바꿀 수 있어요</span></div></header>
          <div className="site-outline-list">
            {site.content.sections.map((section, index) => {
              const info = SITE_BLOCKS.find((block) => block.type === section.type)
              return <button className={`${selectedSectionId === section.id ? 'active' : ''} ${section.enabled === false ? 'disabled-block' : ''}`} type="button" key={section.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { reorder(dragIndex, index); setDragIndex(-1) }} onClick={() => { setSelectedSectionId(section.id); setPanel('content') }}><DotsSixVertical /><span><strong>{info?.label}</strong><small>{section.data?.title || section.data?.eyebrow || info?.description}</small></span>{section.enabled !== false ? <Eye /> : null}</button>
            })}
          </div>
          <div className="site-add-block"><strong>블록 추가</strong>{SITE_BLOCKS.filter((block) => block.type !== 'hero' && !(block.type === 'form' && site.content.sections.some((section) => section.type === 'form'))).map((block) => <button type="button" key={block.type} onClick={() => addBlock(block.type)}><Plus />{block.label}<small>{block.description}</small></button>)}</div>
        </aside>

        <section className={`site-canvas-stage device-${device}`} onClick={() => setSelectedSectionId('')}>
          <div className="site-canvas-frame"><SiteRenderer site={site} project={linkedProject} editing selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} onSectionChange={updateSection} /></div>
        </section>

        <aside className="site-inspector">
          <nav><button className={panel === 'content' ? 'active' : ''} type="button" onClick={() => setPanel('content')}><Eye /> 내용</button><button className={panel === 'design' ? 'active' : ''} type="button" onClick={() => setPanel('design')}><PaintBrush /> 디자인</button></nav>
          {error ? <div className="inline-alert">{error}</div> : null}
          {panel === 'content' ? <div className="site-inspector-scroll">
            <section className="site-setting-group"><h3>사이트 기본 설정</h3><label>브랜드 이름<input value={site.content.brandName} onChange={(event) => changeSite({ ...site, content: { ...site.content, brandName: event.target.value } })} /></label><label>공개 주소<div className="site-slug-input"><span>/p/</span><input value={site.slug} onChange={(event) => changeSite({ ...site, slug: event.target.value })} placeholder="signal-note" /></div></label><label>연결할 신청 폼<select value={site.formProjectId} onChange={(event) => changeSite({ ...site, formProjectId: event.target.value })}><option value="">폼을 선택해 주세요</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} {project.status === 'published' ? '(공개)' : '(초안)'}</option>)}</select></label>{linkedProject?.status === 'draft' ? <p className="site-setting-help">사이트를 공개하려면 이 폼도 먼저 공개해야 합니다.</p> : null}</section>
            {selectedSection ? <section className="site-setting-group"><div className="site-setting-heading"><div><h3>{SITE_BLOCKS.find((block) => block.type === selectedSection.type)?.label}</h3><p>화면의 글자를 직접 눌러 수정할 수 있어요.</p></div><label className="site-switch"><input type="checkbox" checked={selectedSection.enabled !== false} onChange={(event) => updateSelected({ enabled: event.target.checked })} /><span /></label></div>
              {['hero', 'story'].includes(selectedSection.type) ? <><ImageUpload value={selectedSection.data.imageUrl} formId={site.id} onChange={(url) => updateSection(selectedSection.id, 'imageUrl', url)} /><label>이미지 설명<input value={selectedSection.data.imageAlt || ''} onChange={(event) => updateSection(selectedSection.id, 'imageAlt', event.target.value)} /></label></> : null}
              {selectedSection.type === 'hero' ? <label>문구 정렬<select value={selectedSection.data.align || 'left'} onChange={(event) => updateSection(selectedSection.id, 'align', event.target.value)}><option value="left">왼쪽 정렬</option><option value="center">가운데 정렬</option></select></label> : null}
              {selectedSection.type === 'story' ? <label>이미지 위치<select value={selectedSection.data.imagePosition || 'right'} onChange={(event) => updateSection(selectedSection.id, 'imagePosition', event.target.value)}><option value="right">오른쪽</option><option value="left">왼쪽</option></select></label> : null}
              <div className="site-section-actions"><button type="button" onClick={duplicateSelected} disabled={selectedSection.type === 'form'}><Copy /> 복제</button><button className="danger" type="button" onClick={deleteSelected} disabled={['hero', 'form'].includes(selectedSection.type)}><Trash /> 삭제</button></div>
            </section> : <div className="site-no-selection"><ArrowCounterClockwise /><strong>수정할 블록을 선택해 주세요</strong><p>가운데 화면이나 왼쪽 목록을 누르면 설정이 열립니다.</p></div>}
            <section className="site-setting-group"><h3>하단 안내</h3><label>문구<textarea rows="4" value={site.settings.footerText} onChange={(event) => changeSite({ ...site, settings: { ...site.settings, footerText: event.target.value } })} /></label><label className="site-check-row"><input type="checkbox" checked={site.settings.showBrand !== false} onChange={(event) => changeSite({ ...site, settings: { ...site.settings, showBrand: event.target.checked } })} /><span><strong>하단 브랜드 표시</strong><small>페이지 끝에 브랜드 이름을 보여줍니다.</small></span></label></section>
          </div> : <div className="site-inspector-scroll">
            <section className="site-setting-group"><h3>빠른 테마</h3><div className="site-theme-list">{SITE_THEME_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => changeSite({ ...site, theme: { ...preset.theme } })}><span style={{ background: preset.theme.background, color: preset.theme.text }}><i style={{ background: preset.theme.accent }} /></span><strong>{preset.name}</strong>{site.theme.accent === preset.theme.accent && site.theme.background === preset.theme.background ? <Check /> : null}</button>)}</div></section>
            <section className="site-setting-group"><h3>색상과 형태</h3><label className="site-color-setting">강조 색상<input type="color" value={site.theme.accent} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, accent: event.target.value } })} /></label><label className="site-color-setting">배경 색상<input type="color" value={site.theme.background} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, background: event.target.value } })} /></label><label>글꼴<select value={site.theme.font} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, font: event.target.value } })}><option value="pretendard">프리텐다드</option><option value="noto-sans">Noto Sans KR</option><option value="gowun">고운돋움</option><option value="hahmlet">함렛</option></select></label><label>모서리 둥글기 <span>{site.theme.radius}px</span><input type="range" min="0" max="32" value={site.theme.radius} onChange={(event) => changeSite({ ...site, theme: { ...site.theme, radius: Number(event.target.value) } })} /></label></section>
          </div>}
        </aside>
      </main>
    </AppFrame>
  )
}
