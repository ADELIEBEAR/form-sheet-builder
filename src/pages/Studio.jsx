import {
  ArrowSquareOut,
  Check,
  DeviceMobile,
  Desktop,
  DotsSixVertical,
  Eye,
  FloppyDisk,
  Gear,
  LinkSimple,
  PaintBrush,
  Plus,
  SpinnerGap,
  Trash,
  X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '../lib/router'
import AppFrame from '../components/AppFrame'
import ExternalConnectPanel from '../components/ExternalConnectPanel'
import FormCopyPanel from '../components/FormCopyPanel'
import InlineFormCanvas, { COVER_VIEW, SUCCESS_VIEW } from '../components/InlineFormCanvas'
import ProjectColorPicker from '../components/ProjectColorPicker'
import SharePreviewPanel from '../components/SharePreviewPanel'
import ThemePanel from '../components/ThemePanel'
import { api } from '../lib/api'
import { emptyProject, makeField, makePage, moveItem, TYPE_LABEL } from '../lib/maker'

export default function Studio() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(emptyProject)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedFieldId, setSelectedFieldId] = useState(COVER_VIEW)
  const [drawer, setDrawer] = useState('design')
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false)
  const [device, setDevice] = useState('desktop')
  const [loading, setLoading] = useState(Boolean(projectId))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [dragState, setDragState] = useState(null)
  const pointerSortRef = useRef(null)
  const sortClickGuardRef = useRef(false)

  useEffect(() => {
    if (!projectId) {
      setSelectedFieldId(COVER_VIEW)
      return
    }

    api(`/maker/projects/${projectId}`)
      .then((data) => {
        setProject(data.project)
        setSelectedFieldId(COVER_VIEW)
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!saving) save()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [project, projectId, saving])

  const page = project.pages[pageIndex]
  const canPublish = useMemo(
    () => project.title.trim() && project.pages.some((item) => item.fields.some((field) => field.type !== 'heading')),
    [project],
  )

  function changeProject(nextProject) {
    setProject(nextProject)
    setSaved(false)
  }

  async function save(status = project.status) {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const payload = { ...project, status }
      const data = projectId
        ? await api(`/maker/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/maker/projects', { method: 'POST', body: JSON.stringify(payload) })
      setProject(data.project)
      setSaved(true)
      if (!projectId) navigate(`/studio/${data.project.id}`, { replace: true })
      window.setTimeout(() => setSaved(false), 1700)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }

  function updatePage(nextPage) {
    changeProject({
      ...project,
      pages: project.pages.map((item, index) => (index === pageIndex ? nextPage : item)),
    })
  }

  function addField(type) {
    const field = makeField(type)
    updatePage({ ...page, fields: [...page.fields, field] })
    setSelectedFieldId(field.id)
  }

  function addPage() {
    const next = makePage(project.pages.length)
    changeProject({ ...project, pages: [...project.pages, next] })
    setPageIndex(project.pages.length)
    setSelectedFieldId(next.fields[0]?.id || COVER_VIEW)
  }

  function selectPage(index) {
    setPageIndex(index)
    setSelectedFieldId(project.pages[index]?.fields[0]?.id || COVER_VIEW)
  }

  function selectField(fieldId, scrollToField = false) {
    setSelectedFieldId(fieldId)
    if (!scrollToField) return
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-field-id="${fieldId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function navigateCanvas(nextPageIndex, nextFieldId) {
    setPageIndex(nextPageIndex)
    setSelectedFieldId(nextFieldId)
  }

  function removePage(index) {
    if (project.pages.length === 1) {
      setError('페이지는 하나 이상 필요합니다.')
      return
    }

    const nextPages = project.pages.filter((_, itemIndex) => itemIndex !== index)
    changeProject({ ...project, pages: nextPages })
    const nextIndex = Math.max(0, Math.min(index, nextPages.length - 1))
    setPageIndex(nextIndex)
    setSelectedFieldId(nextPages[nextIndex]?.fields[0]?.id || COVER_VIEW)
  }

  function updateField(fieldId, nextField) {
    updatePage({
      ...page,
      fields: page.fields.map((field) => (field.id === fieldId ? nextField : field)),
    })
  }

  function deleteField(fieldId) {
    const fieldIndex = page.fields.findIndex((field) => field.id === fieldId)
    if (fieldIndex < 0) return

    const next = page.fields.filter((field) => field.id !== fieldId)
    updatePage({ ...page, fields: next })
    setSelectedFieldId(next[Math.min(fieldIndex, next.length - 1)]?.id || COVER_VIEW)
  }

  function duplicateField(fieldId) {
    const fieldIndex = page.fields.findIndex((field) => field.id === fieldId)
    if (fieldIndex < 0) return

    const source = page.fields[fieldIndex]
    const copy = { ...source, id: crypto.randomUUID(), label: `${source.label} 복사본` }
    const next = [...page.fields.slice(0, fieldIndex + 1), copy, ...page.fields.slice(fieldIndex + 1)]
    updatePage({ ...page, fields: next })
    setSelectedFieldId(copy.id)
  }

  function moveField(fieldId, direction) {
    const fieldIndex = page.fields.findIndex((field) => field.id === fieldId)
    if (fieldIndex < 0) return
    updatePage({ ...page, fields: moveItem(page.fields, fieldIndex, fieldIndex + direction) })
  }

  function reorderPages(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    const selectedPageId = project.pages[pageIndex]?.id
    const nextPages = moveItem(project.pages, fromIndex, toIndex)
    changeProject({ ...project, pages: nextPages })
    const nextPageIndex = nextPages.findIndex((item) => item.id === selectedPageId)
    setPageIndex(Math.max(0, nextPageIndex))
  }

  function reorderFields(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    updatePage({ ...page, fields: moveItem(page.fields, fromIndex, toIndex) })
  }

  function startSort(kind, index, event) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${kind}:${index}`)
    setDragState({ kind, from: index, over: index })
  }

  function moveSortTarget(kind, index, event) {
    if (dragState?.kind !== kind) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragState.over !== index) setDragState({ ...dragState, over: index })
  }

  function finishSort(kind, toIndex, event) {
    event.preventDefault()
    const [sourceKind, sourceIndex] = event.dataTransfer.getData('text/plain').split(':')
    const fromIndex = Number(sourceIndex)
    if (sourceKind === kind && Number.isInteger(fromIndex)) {
      if (kind === 'page') reorderPages(fromIndex, toIndex)
      if (kind === 'field') reorderFields(fromIndex, toIndex)
    }
    setDragState(null)
  }

  function startPointerSort(kind, index, event) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointerSortRef.current = {
      kind,
      from: index,
      over: index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      handle: event.currentTarget,
      moved: false,
    }
  }

  function movePointerSort(event) {
    const active = pointerSortRef.current
    if (!active || active.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY)
    if (!active.moved && distance < 5) return

    event.preventDefault()
    event.stopPropagation()
    active.moved = true
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(`[data-sort-kind="${active.kind}"]`)
    const over = Number(target?.dataset.sortIndex)
    if (Number.isInteger(over) && over !== active.over) active.over = over
    setDragState({ kind: active.kind, from: active.from, over: active.over })
  }

  function endPointerSort(event) {
    const active = pointerSortRef.current
    if (!active || active.pointerId !== event.pointerId) return
    active.handle?.releasePointerCapture?.(event.pointerId)
    pointerSortRef.current = null

    if (active.moved) {
      event.preventDefault()
      event.stopPropagation()
      sortClickGuardRef.current = true
      window.setTimeout(() => {
        sortClickGuardRef.current = false
      }, 0)
      if (active.kind === 'page') reorderPages(active.from, active.over)
      if (active.kind === 'field') reorderFields(active.from, active.over)
    }
    setDragState(null)
  }

  function cancelPointerSort(event) {
    const active = pointerSortRef.current
    if (!active || active.pointerId !== event.pointerId) return
    active.handle?.releasePointerCapture?.(event.pointerId)
    pointerSortRef.current = null
    setDragState(null)
  }

  function consumeSortClick(event) {
    if (!sortClickGuardRef.current) return false
    event.preventDefault()
    event.stopPropagation()
    sortClickGuardRef.current = false
    return true
  }

  function keyboardSort(kind, index, event) {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? -1 : 1
    if (kind === 'page') reorderPages(index, index + direction)
    if (kind === 'field') reorderFields(index, index + direction)
  }

  function sortClass(base, kind, index) {
    const classes = [base, 'sortable-row']
    if (dragState?.kind === kind && dragState.from === index) classes.push('sorting')
    if (dragState?.kind === kind && dragState.over === index && dragState.from !== index) {
      classes.push(index < dragState.from ? 'sort-drop-before' : 'sort-drop-after')
    }
    return classes.filter(Boolean).join(' ')
  }

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${project.slug}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('링크를 복사하지 못했습니다. 공개 폼을 연 뒤 주소를 복사해 주세요.')
    }
  }

  if (loading) {
    return <div className="studio-loading"><SpinnerGap className="spin" /><span>편집기를 불러오는 중입니다</span></div>
  }

  const center = (
    <div className="studio-name">
      <strong>{project.title || '제목 없는 폼'}</strong>
      <span className={project.status}>{project.status === 'published' ? '게시 중' : '초안'}</span>
    </div>
  )

  const actions = (
    <>
      <span className={`saved-note ${saved ? 'show' : ''}`}><Check weight="bold" /> 저장됨</span>
      {projectId ? <Link className="header-text-button" to={`/responses/${projectId}`}>응답 보기</Link> : null}
      {project.status === 'published' ? (
        <a className="square-button" href={`/s/${project.slug}`} target="_blank" rel="noreferrer" aria-label="공개 폼 열기"><Eye /></a>
      ) : null}
      <button className="studio-secondary header-save" type="button" onClick={() => save()} disabled={saving}>
        {saving ? <SpinnerGap className="spin" /> : <FloppyDisk />} 저장
      </button>
      <button
        className="studio-primary header-publish"
        type="button"
        onClick={() => save(project.status === 'published' ? 'draft' : 'published')}
        disabled={saving || !canPublish}
      >
        {project.status === 'published' ? '게시 중지' : '게시하기'}
      </button>
    </>
  )

  return (
    <AppFrame backTo="/workspace" center={center} actions={actions}>
      <main className="studio-layout">
        <aside className="studio-outline">
          <div className="outline-heading">
            <strong>콘텐츠</strong>
            <button type="button" onClick={addPage}><Plus /> 추가</button>
          </div>

          <button className={selectedFieldId === COVER_VIEW ? 'outline-special active' : 'outline-special'} type="button" onClick={() => setSelectedFieldId(COVER_VIEW)}><span>01</span><div><strong>시작 화면</strong><small>제목과 소개</small></div></button>

          <div className="page-list">
            {project.pages.length > 1 ? <span className="sort-helper"><DotsSixVertical weight="bold" /> 페이지를 끌어 순서 변경</span> : null}
            {project.pages.map((item, index) => (
              <div
                className={sortClass(pageIndex === index ? 'page-item active' : 'page-item', 'page', index)}
                key={item.id}
                data-sort-kind="page"
                data-sort-index={index}
                onDragOver={(event) => moveSortTarget('page', index, event)}
                onDrop={(event) => finishSort('page', index, event)}
              >
                <button
                  type="button"
                  draggable={project.pages.length > 1}
                  onDragStart={(event) => startSort('page', index, event)}
                  onDragEnd={() => setDragState(null)}
                  onKeyDown={(event) => keyboardSort('page', index, event)}
                  onClick={(event) => {
                    if (!consumeSortClick(event)) selectPage(index)
                  }}
                  title={project.pages.length > 1 ? '끌어서 이동 · Alt + 방향키' : undefined}
                >
                  <span>{index + 1}</span>
                  <strong>{item.title || `페이지 ${index + 1}`}</strong>
                  <small>{item.fields.length}개 항목</small>
                  {project.pages.length > 1 ? (
                    <span
                      className="outline-drag-handle"
                      onPointerDown={(event) => startPointerSort('page', index, event)}
                      onPointerMove={movePointerSort}
                      onPointerUp={endPointerSort}
                      onPointerCancel={cancelPointerSort}
                      title="잡고 위아래로 이동"
                    ><DotsSixVertical weight="bold" /></span>
                  ) : null}
                </button>
                {project.pages.length > 1 ? (
                  <button className="page-remove" type="button" onClick={() => removePage(index)} aria-label="페이지 삭제" title="페이지 삭제"><Trash /></button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="outline-fields">
            <div className="outline-fields-label"><span>이 페이지의 질문</span>{page.fields.length > 1 ? <small><DotsSixVertical weight="bold" /> 끌어서 정렬</small> : null}</div>
            <div className="outline-field-list">
              {page.fields.map((field, index) => (
                <div
                  className={sortClass('outline-field-item', 'field', index)}
                  key={field.id}
                  data-sort-kind="field"
                  data-sort-index={index}
                  onDragOver={(event) => moveSortTarget('field', index, event)}
                  onDrop={(event) => finishSort('field', index, event)}
                >
                  <button
                    className={selectedFieldId === field.id ? 'outline-field-button active' : 'outline-field-button'}
                    type="button"
                    draggable={page.fields.length > 1}
                    onDragStart={(event) => startSort('field', index, event)}
                    onDragEnd={() => setDragState(null)}
                    onKeyDown={(event) => keyboardSort('field', index, event)}
                    onClick={(event) => {
                      if (!consumeSortClick(event)) selectField(field.id, true)
                    }}
                    title={page.fields.length > 1 ? '끌어서 이동 · Alt + 방향키' : undefined}
                  >
                    <i>{index + 1}</i>
                    <span><strong>{field.label || '제목 없는 항목'}</strong><small>{TYPE_LABEL[field.type]}</small></span>
                    {page.fields.length > 1 ? (
                      <span
                        className="outline-drag-handle"
                        onPointerDown={(event) => startPointerSort('field', index, event)}
                        onPointerMove={movePointerSort}
                        onPointerUp={endPointerSort}
                        onPointerCancel={cancelPointerSort}
                        title="잡고 위아래로 이동"
                      ><DotsSixVertical weight="bold" /></span>
                    ) : null}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button className={selectedFieldId === SUCCESS_VIEW ? 'outline-special active success' : 'outline-special success'} type="button" onClick={() => setSelectedFieldId(SUCCESS_VIEW)}><span>✓</span><div><strong>완료 화면</strong><small>제출 후 안내</small></div></button>
        </aside>

        <section className="studio-stage">
          {error ? <div className="studio-error">{error}<button type="button" onClick={() => setError('')}>닫기</button></div> : null}

          <div className="stage-toolbar">
            <div className="studio-toolbar-copy">
              <strong>한 화면에 한 질문</strong>
              <span>응답자가 보는 화면을 직접 눌러 편집하세요</span>
            </div>
            <div className="studio-toolbar-actions">
              <div className="device-switch" aria-label="미리보기 화면 크기">
                <button className={device === 'desktop' ? 'active' : ''} type="button" onClick={() => setDevice('desktop')} aria-label="데스크톱 보기"><Desktop /></button>
                <button className={device === 'mobile' ? 'active' : ''} type="button" onClick={() => setDevice('mobile')} aria-label="모바일 보기"><DeviceMobile /></button>
              </div>
              <button className={drawer === 'design' ? 'toolbar-action active' : 'toolbar-action'} type="button" onClick={() => { setDrawer('design'); setMobileInspectorOpen(true) }}><PaintBrush /> 디자인</button>
              <button className={drawer === 'settings' ? 'toolbar-action active' : 'toolbar-action'} type="button" onClick={() => { setDrawer('settings'); setMobileInspectorOpen(true) }}><Gear /> 설정</button>
            </div>
          </div>

          <div className={`preview-frame inline-preview-frame ${device}`}>
            <InlineFormCanvas
              project={project}
              pageIndex={pageIndex}
              selectedFieldId={selectedFieldId}
              onProjectChange={changeProject}
              onPageChange={updatePage}
              onNavigate={navigateCanvas}
              onFieldSelect={selectField}
              onFieldChange={updateField}
              onFieldAdd={addField}
              onFieldDuplicate={duplicateField}
              onFieldDelete={deleteField}
              onFieldMove={moveField}
            />
          </div>
        </section>

        <aside className={`studio-drawer studio-drawer-docked ${mobileInspectorOpen ? 'mobile-open' : ''}`} aria-label={drawer === 'design' ? '디자인 설정' : '폼 설정'}>
              <div className="drawer-heading">
                <div><span>{drawer === 'design' ? 'FORM STYLE' : 'FORM SETTINGS'}</span><strong>{drawer === 'design' ? '디자인' : '설정 및 연동'}</strong></div>
                <small>항상 열림</small>
                <button className="mobile-drawer-close" type="button" onClick={() => setMobileInspectorOpen(false)} aria-label="설정 닫기"><X /></button>
              </div>

              <div className="drawer-tabs" role="tablist" aria-label="편집 도구">
                <button className={drawer === 'design' ? 'active' : ''} type="button" onClick={() => setDrawer('design')}><PaintBrush /> 디자인</button>
                <button className={drawer === 'settings' ? 'active' : ''} type="button" onClick={() => setDrawer('settings')}><Gear /> 설정</button>
              </div>

              {drawer === 'design' ? <ThemePanel project={project} projectId={projectId} pageIndex={pageIndex} onChange={changeProject} /> : null}

              {drawer === 'settings' ? (
                <div className="settings-stack">
                  <div className="inspector-panel">
                    <div className="panel-heading"><span>관리 정보</span><strong>목록에서 알아보기</strong><p>폼 목록에만 보이며 신청자에게는 표시되지 않습니다.</p></div>
                    <div className="studio-project-color"><span>내 폼 구분 색상</span><ProjectColorPicker value={project.memoColor} onChange={(memoColor) => changeProject({ ...project, memoColor })} /><small>여러 사람이 함께 사용할 때 색으로 폼을 빠르게 구분할 수 있어요.</small></div>
                    <label className="studio-control"><span>분류</span><input value={project.folder || ''} maxLength="80" onChange={(event) => changeProject({ ...project, folder: event.target.value })} placeholder="예: 주식 신청" /></label>
                    <label className="studio-control"><span>한 줄 설명</span><input maxLength="160" value={project.memo || ''} onChange={(event) => changeProject({ ...project, memo: event.target.value })} placeholder="이 폼이 어떤 용도인지 간단히 적어주세요." /></label>
                  </div>
                  <SharePreviewPanel project={project} onChange={changeProject} />
                  <ExternalConnectPanel project={project} />
                  <FormCopyPanel project={project} onChange={changeProject} />
                  <div className="inspector-panel">
                    <div className="panel-heading"><span>공개 설정</span><strong>공개 주소</strong></div>
                    <label className="studio-control">
                      <span>공개 주소</span>
                      <div className="slug-input">
                        <span>/s/</span>
                        <input
                          value={project.slug || ''}
                          onChange={(event) => changeProject({ ...project, slug: event.target.value.toLowerCase().replace(/[^a-z0-9가-힣-]/g, '-') })}
                          placeholder="my-form"
                        />
                      </div>
                    </label>
                    {project.status === 'published' ? (
                      <div className="published-link-actions">
                        <button className="copy-link-button" type="button" onClick={copyPublicLink}><LinkSimple /> {copied ? '복사됨' : '공개 링크 복사'}</button>
                        <a className="open-public-button" href={`/s/${project.slug}`} target="_blank" rel="noreferrer"><ArrowSquareOut /> 열기</a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
        </aside>
      </main>
    </AppFrame>
  )
}
