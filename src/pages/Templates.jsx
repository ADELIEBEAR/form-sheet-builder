import { ArrowRight, CalendarCheck, ChatCircleDots, ClipboardText, Plus, Star } from '@phosphor-icons/react'
import { useState } from 'react'
import AppFrame from '../components/AppFrame'
import WorkspaceSidebar from '../components/WorkspaceSidebar'
import { api } from '../lib/api'
import { Link, useNavigate } from '../lib/router'
import { createTemplateProject, FORM_TEMPLATES } from '../lib/templates'

const icons = {
  contact: ChatCircleDots,
  reservation: CalendarCheck,
  feedback: Star,
  event: ClipboardText,
}

export default function Templates() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState('')
  const [error, setError] = useState('')

  async function useTemplate(templateId) {
    setCreating(templateId)
    setError('')
    try {
      const data = await api('/maker/projects', { method: 'POST', body: JSON.stringify(createTemplateProject(templateId)) })
      navigate(`/studio/${data.project.id}`)
    } catch (caught) {
      setError(caught.message)
      setCreating('')
    }
  }

  return (
    <AppFrame sidebar={<WorkspaceSidebar active="templates" />} actions={<Link className="studio-primary header-new" to="/studio/new"><Plus weight="bold" /> 새 폼</Link>}>
      <main className="workspace-main templates-main">
        <div className="workspace-heading"><div><span className="page-eyebrow">빠른 시작</span><h1>템플릿</h1><p>자주 쓰는 질문이 준비되어 있습니다. 선택한 뒤 내 상황에 맞게 바로 고치세요.</p></div></div>
        {error ? <div className="inline-alert">{error}</div> : null}
        <section className="template-grid" aria-label="폼 템플릿 목록">
          {FORM_TEMPLATES.map((template, index) => {
            const Icon = icons[template.id]
            return (
              <article className={`template-card template-${template.id}`} key={template.id}>
                <div className="template-preview" style={{ '--template-accent': template.accent }}>
                  <span className="template-number">0{index + 1}</span>
                  <Icon weight="duotone" />
                  <i /><i /><i />
                </div>
                <div className="template-copy">
                  <div><strong>{template.title}</strong><span>{template.questions}개 질문</span></div>
                  <p>{template.description}</p>
                  <button type="button" onClick={() => useTemplate(template.id)} disabled={Boolean(creating)}>{creating === template.id ? '만드는 중' : '이 템플릿 사용'} <ArrowRight /></button>
                </div>
              </article>
            )
          })}
        </section>
      </main>
    </AppFrame>
  )
}
