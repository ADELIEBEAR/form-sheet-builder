import { ArrowLeft, ArrowRight, Plus, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { FIELD_GROUPS, TYPE_LABEL } from '../lib/maker'
import InlineFieldEditor from './InlineFieldEditor'

export default function InlineFormCanvas({ project, pageIndex, selectedFieldId, onProjectChange, onPageChange, onFieldSelect, onFieldChange, onFieldAdd, onFieldDuplicate, onFieldDelete, onFieldMove }) {
  const [adding, setAdding] = useState(false)
  const page = project.pages[pageIndex]
  if (!page) return null
  const style = {
    '--preview-accent': project.theme?.accent || '#2f6757',
    '--preview-bg': project.theme?.background || '#efede7',
    '--preview-card': project.theme?.card || '#fffdfa',
    '--preview-text': project.theme?.text || '#232724',
    '--preview-radius': `${project.theme?.radius ?? 14}px`,
  }
  const patchPage = (next) => onPageChange({ ...page, ...next })
  const add = (type) => {
    onFieldAdd(type)
    setAdding(false)
  }

  return (
    <div className="inline-form-canvas" style={style}>
      {project.theme?.coverUrl ? <img className="canvas-cover" src={project.theme.coverUrl} alt="폼 상단 배경" /> : null}
      <div className="inline-canvas-content">
        {project.theme?.showProgress && project.pages.length > 1 ? <div className="page-progress"><span style={{ width: `${((pageIndex + 1) / project.pages.length) * 100}%` }} /></div> : null}
        <header className="inline-canvas-intro">
          {pageIndex === 0 ? <>
            <textarea className="inline-form-title" rows="1" value={project.title} onChange={(event) => onProjectChange({ ...project, title: event.target.value })} aria-label="폼 제목" placeholder="폼 제목을 입력하세요" />
            <textarea className="inline-form-description" rows="2" value={project.description || ''} onChange={(event) => onProjectChange({ ...project, description: event.target.value })} aria-label="폼 설명" placeholder="응답자에게 보여줄 간단한 안내를 입력하세요" />
          </> : null}
          {project.pages.length > 1 ? <div className="inline-page-copy"><small>{pageIndex + 1} / {project.pages.length}</small><input value={page.title || ''} onChange={(event) => patchPage({ title: event.target.value })} aria-label="페이지 제목" placeholder={`페이지 ${pageIndex + 1}`} /><textarea rows="1" value={page.description || ''} onChange={(event) => patchPage({ description: event.target.value })} aria-label="페이지 설명" placeholder="이 페이지에 대한 안내를 추가하세요" /></div> : null}
        </header>

        <section className="inline-fields" aria-label="질문 목록">
          {page.fields.map((field, index) => <InlineFieldEditor key={field.id} field={field} index={index} total={page.fields.length} selected={selectedFieldId === field.id} accent={project.theme?.accent} onSelect={() => onFieldSelect(field.id)} onChange={(next) => onFieldChange(field.id, next)} onDuplicate={() => onFieldDuplicate(field.id)} onDelete={() => onFieldDelete(field.id)} onMove={(direction) => onFieldMove(field.id, direction)} />)}
        </section>

        <div className={`inline-add-field ${adding ? 'open' : ''}`}>
          <button className="inline-add-trigger" type="button" onClick={() => setAdding((current) => !current)}>{adding ? <X /> : <Plus />}{adding ? '닫기' : '질문 추가'}</button>
          {adding ? <div className="inline-add-menu">{FIELD_GROUPS.map((group) => <div key={group.label}><span>{group.label}</span><div>{group.types.map((type) => <button type="button" key={type} onClick={() => add(type)}><Plus /> {TYPE_LABEL[type]}</button>)}</div></div>)}</div> : null}
        </div>

        <footer className="canvas-actions inline-canvas-actions">
          {pageIndex > 0 ? <button className="canvas-secondary" type="button" onClick={() => onPage(pageIndex - 1)}><ArrowLeft /> 이전</button> : <span />}
          {pageIndex < project.pages.length - 1 ? <button className="canvas-primary" type="button" onClick={() => onPage(pageIndex + 1)}>다음 <ArrowRight /></button> : <button className="canvas-primary" type="button" disabled>{project.settings?.submitLabel || '제출하기'}</button>}
        </footer>
      </div>
    </div>
  )
}
