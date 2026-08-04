import { ArrowRight, CheckCircle, Plus, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { FIELD_GROUPS, FONT_STACKS, TYPE_LABEL } from '../lib/maker'
import InlineFieldEditor from './InlineFieldEditor'

export const COVER_VIEW = '__cover__'
export const SUCCESS_VIEW = '__success__'

export default function InlineFormCanvas({ project, pageIndex, selectedFieldId, onProjectChange, onPageChange, onFieldSelect, onFieldChange, onFieldAdd, onFieldDuplicate, onFieldDelete, onFieldMove }) {
  const [adding, setAdding] = useState(false)
  const page = project.pages[pageIndex]
  if (!page) return null

  const selectedIndex = page.fields.findIndex((field) => field.id === selectedFieldId)
  const selectedField = selectedIndex >= 0 ? page.fields[selectedIndex] : null
  const isCover = selectedFieldId === COVER_VIEW
  const isSuccess = selectedFieldId === SUCCESS_VIEW
  const style = {
    '--preview-accent': project.theme?.accent || '#7156d9',
    '--preview-bg': project.theme?.background || '#f0edfb',
    '--preview-card': project.theme?.card || '#ffffff',
    '--preview-text': project.theme?.text || '#222131',
    '--preview-radius': `${project.theme?.radius ?? 24}px`,
    '--preview-font': FONT_STACKS[project.theme?.font] || FONT_STACKS.pretendard,
  }
  const add = (type) => {
    onFieldAdd(type)
    setAdding(false)
  }

  return (
    <div className="inline-form-canvas smore-editor-canvas" style={style}>
      {project.theme?.coverUrl ? <div className="focus-image" style={{ backgroundImage: `url("${project.theme.coverUrl}")` }} /> : null}
      <div className="focus-tint" />
      <div className="focus-shell studio-focus-shell">
        <header className="focus-topbar">
          <span className="focus-brand-mark"><i /><i /><i /></span>
          <div className="focus-progress"><span style={{ width: isCover ? '0%' : isSuccess ? '100%' : `${((selectedIndex + 1) / Math.max(page.fields.length, 1)) * 100}%` }} /></div>
          <small>{isCover ? '시작' : isSuccess ? '완료' : `${selectedIndex + 1} / ${page.fields.length}`}</small>
        </header>

        {isCover ? (
          <main className="focus-content-card focus-cover-card studio-cover-editor">
            <span className="focus-kicker">WELCOME</span>
            <textarea className="focus-editor-title" rows="1" value={project.title} onChange={(event) => onProjectChange({ ...project, title: event.target.value })} aria-label="폼 제목" placeholder="폼 제목을 입력하세요" />
            <textarea className="focus-editor-description" rows="2" value={project.description || ''} onChange={(event) => onProjectChange({ ...project, description: event.target.value })} aria-label="폼 설명" placeholder="응답자에게 보여줄 안내를 입력하세요" />
            <button className="focus-primary" type="button" disabled>시작하기 <ArrowRight /></button>
          </main>
        ) : null}

        {isSuccess ? (
          <main className="focus-content-card focus-success-card studio-success-editor">
            <div className="success-symbol"><CheckCircle weight="fill" /></div>
            <textarea className="focus-editor-success-title" rows="1" value={project.settings.successTitle} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successTitle: event.target.value } })} aria-label="제출 완료 제목" />
            <textarea className="focus-editor-description" rows="2" value={project.settings.successMessage} onChange={(event) => onProjectChange({ ...project, settings: { ...project.settings, successMessage: event.target.value } })} aria-label="제출 완료 안내" />
          </main>
        ) : null}

        {!isCover && !isSuccess ? (
          <main className="focus-content-card studio-question-editor">
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
