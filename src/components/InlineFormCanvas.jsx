import { ArrowLeft, ArrowRight, CheckCircle, Plus, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { FIELD_GROUPS, FONT_STACKS, TYPE_LABEL, formSteps } from '../lib/maker'
import FocusEffects from './FocusEffects'
import InlineFieldEditor from './InlineFieldEditor'

export const COVER_VIEW = '__cover__'
export const SUCCESS_VIEW = '__success__'

export default function InlineFormCanvas({ project, pageIndex, selectedFieldId, onProjectChange, onPageChange, onNavigate, onFieldSelect, onFieldChange, onFieldAdd, onFieldDuplicate, onFieldDelete, onFieldMove }) {
  const [adding, setAdding] = useState(false)
  const page = project.pages[pageIndex]
  if (!page) return null

  const selectedIndex = page.fields.findIndex((field) => field.id === selectedFieldId)
  const selectedField = selectedIndex >= 0 ? page.fields[selectedIndex] : null
  const isCover = selectedFieldId === COVER_VIEW
  const isSuccess = selectedFieldId === SUCCESS_VIEW
  const steps = formSteps(project)
  const globalIndex = steps.findIndex(({ field }) => field.id === selectedFieldId)
  const navigateToStep = (nextIndex) => {
    if (nextIndex < 0) {
      onNavigate?.(0, COVER_VIEW)
      return
    }
    if (nextIndex >= steps.length) {
      onNavigate?.(Math.max(project.pages.length - 1, 0), SUCCESS_VIEW)
      return
    }
    const next = steps[nextIndex]
    onNavigate?.(next.pageIndex, next.field.id)
  }
  const style = {
    '--preview-accent': project.theme?.accent || '#7156d9',
    '--preview-bg': project.theme?.background || '#f0edfb',
    '--preview-card': project.theme?.card || '#ffffff',
    '--preview-text': project.theme?.text || '#222131',
    '--preview-radius': `${project.theme?.radius ?? 24}px`,
    '--preview-font': FONT_STACKS[project.theme?.font] || FONT_STACKS.pretendard,
    '--preview-title-size': `${project.theme?.titleSize ?? 56}px`,
    '--preview-question-size': `${project.theme?.questionSize ?? 32}px`,
    '--preview-body-size': `${project.theme?.bodySize ?? 16}px`,
  }
  const add = (type) => {
    onFieldAdd(type)
    setAdding(false)
  }

  return (
    <div className="inline-form-canvas smore-editor-canvas" style={style}>
      {project.theme?.coverUrl ? <div className="focus-image" style={{ backgroundImage: `url("${project.theme.coverUrl}")` }} /> : null}
      <div className="focus-tint" />
      <FocusEffects theme={project.theme} />
      <div className="focus-shell studio-focus-shell">
        <header className="focus-topbar">
          <button className="focus-brand-mark focus-brand-button" type="button" onClick={() => onNavigate?.(0, COVER_VIEW)} aria-label="시작 화면으로"><i /><i /><i /></button>
          {project.theme?.showProgress !== false ? <div className="focus-progress"><span style={{ width: isCover ? '0%' : isSuccess ? '100%' : `${((globalIndex + 1) / Math.max(steps.length, 1)) * 100}%` }} /></div> : <span />}
          <small>{isCover ? '시작' : isSuccess ? '완료' : `${globalIndex + 1} / ${steps.length}`}</small>
        </header>

        {isCover ? (
          <main className="focus-content-card focus-cover-card studio-cover-editor focus-card-enter" key="studio-cover">
            <span className="focus-kicker">WELCOME</span>
            <textarea className="focus-editor-title" rows="1" value={project.title} onChange={(event) => onProjectChange({ ...project, title: event.target.value })} aria-label="폼 제목" placeholder="폼 제목을 입력하세요" />
            <textarea className="focus-editor-description" rows="2" value={project.description || ''} onChange={(event) => onProjectChange({ ...project, description: event.target.value })} aria-label="폼 설명" placeholder="응답자에게 보여줄 안내를 입력하세요" />
            <button className="focus-primary" type="button" onClick={() => navigateToStep(0)} disabled={!steps.length}>시작하기 <ArrowRight /></button>
          </main>
        ) : null}

        {isSuccess ? (
          <main className="focus-content-card focus-success-card studio-success-editor focus-card-enter" key="studio-success">
            <div className="success-symbol"><CheckCircle weight="fill" /></div>
            <textarea className="focus-editor-success-title" rows="1" value={project.settings.successTitle} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successTitle: event.target.value } })} aria-label="제출 완료 제목" />
            <textarea className="focus-editor-description" rows="2" value={project.settings.successMessage} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successMessage: event.target.value } })} aria-label="제출 완료 안내" />
            <button className="focus-restart" type="button" onClick={() => onNavigate?.(0, COVER_VIEW)}>처음부터 보기</button>
          </main>
        ) : null}

        {!isCover && !isSuccess ? (
          <main className="focus-content-card studio-question-editor focus-card-enter" key={selectedFieldId}>
            <div className="studio-page-meta">
              <span>PAGE {pageIndex + 1}</span>
              <input value={page.title || ''} onChange={(event) => onPageChange({ ...page, title: event.target.value })} aria-label="페이지 제목" placeholder={`페이지 ${pageIndex + 1}`} />
              <textarea rows="1" value={page.description || ''} onChange={(event) => onPageChange({ ...page, description: event.target.value })} aria-label="페이지 설명" placeholder="페이지 안내는 선택 사항입니다" />
            </div>
            {selectedField ? (
              <InlineFieldEditor
                field={selectedField}
                index={selectedIndex}
                total={page.fields.length}
                selected
                accent={project.theme?.accent}
                onSelect={() => onFieldSelect(selectedField.id)}
                onChange={(next) => onFieldChange(selectedField.id, next)}
                onDuplicate={() => onFieldDuplicate(selectedField.id)}
                onDelete={() => onFieldDelete(selectedField.id)}
                onMove={(direction) => onFieldMove(selectedField.id, direction)}
              />
            ) : <div className="studio-no-question"><strong>이 페이지가 비어 있습니다</strong><p>아래에서 첫 질문을 추가하세요.</p></div>}
            {selectedField ? <footer className="focus-actions studio-flow-actions">
              <button className="focus-back" type="button" onClick={() => navigateToStep(globalIndex - 1)} aria-label="이전"><ArrowLeft /></button>
              <button className="focus-primary" type="button" onClick={() => navigateToStep(globalIndex + 1)}>{globalIndex < steps.length - 1 ? <>다음 <ArrowRight /></> : project.settings?.submitLabel || '제출하기'}</button>
            </footer> : null}
            <div className={`inline-add-field ${adding ? 'open' : ''}`}>
              <button className="inline-add-trigger" type="button" onClick={() => setAdding((current) => !current)}>{adding ? <X /> : <Plus />}{adding ? '닫기' : '질문 추가'}</button>
              {adding ? <div className="inline-add-menu">{FIELD_GROUPS.map((group) => <div key={group.label}><span>{group.label}</span><div>{group.types.map((type) => <button type="button" key={type} onClick={() => add(type)}><Plus /> {TYPE_LABEL[type]}</button>)}</div></div>)}</div> : null}
            </div>
          </main>
        ) : null}
      </div>
    </div>
  )
}
