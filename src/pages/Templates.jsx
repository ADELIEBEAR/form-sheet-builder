import { ArrowRight, Briefcase, CalendarCheck, ChartLineUp, ChatCircleDots, ClipboardText, CurrencyBtc, EnvelopeOpen, GraduationCap, HandHeart, Hourglass, Plus, Receipt, ShoppingBag, Smiley, Star } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
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
  job: Briefcase,
  quote: Receipt,
  class: GraduationCap,
  waitlist: Hourglass,
  order: ShoppingBag,
  rsvp: EnvelopeOpen,
  volunteer: HandHeart,
  checkin: Smiley,
  'stock-application': ChartLineUp,
  'crypto-application': CurrencyBtc,
}

const categories = ['전체', ...new Set(FORM_TEMPLATES.map((template) => template.category))]

export default function Templates() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState('')
  const [category, setCategory] = useState('전체')
  const [error, setError] = useState('')
  const filteredTemplates = useMemo(() => category === '전체' ? FORM_TEMPLATES : FORM_TEMPLATES.filter((template) => template.category === category), [category])

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
        <div className="workspace-heading"><div><span className="page-eyebrow">빠른 시작 · {FORM_TEMPLATES.length}가지</span><h1>어떤 폼이 필요하세요?</h1><p>자주 쓰는 질문과 어울리는 디자인까지 준비했습니다. 고른 뒤 내 상황에 맞게 바로 바꾸세요.</p></div></div>
        <div className="template-filters" aria-label="템플릿 종류">
          {categories.map((item) => <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => setCategory(item)}>{item}<span>{item === '전체' ? FORM_TEMPLATES.length : FORM_TEMPLATES.filter((template) => template.category === item).length}</span></button>)}
        </div>
        {error ? <div className="inline-alert">{error}</div> : null}
        <section className="template-grid" aria-label="폼 템플릿 목록">
          {filteredTemplates.map((template, index) => {
            const Icon = icons[template.id] || ClipboardText
            return (
              <article className={`template-card template-${template.id}`} key={template.id}>
                <div className="template-preview" style={{ '--template-accent': template.accent }}>
                  <span className="template-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="template-category">{template.category}</span>
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
