import { ArrowRight, Copy, DotsThree, Eye, FilePlus, LinkSimple, Plus, Trash } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from '../lib/router'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import { api } from '../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menu, setMenu] = useState(null)

  useEffect(() => {
    api('/api/forms').then((data) => setForms(data.forms)).catch((caught) => setError(caught.message)).finally(() => setLoading(false))
  }, [])

  async function duplicate(id) {
    const data = await api(`/api/forms/${id}/duplicate`, { method: 'POST' })
    setForms((current) => [data.form, ...current])
    setMenu(null)
  }

  async function remove(id) {
    if (!window.confirm('이 폼과 모든 응답을 삭제할까요?')) return
    await api(`/api/forms/${id}`, { method: 'DELETE' })
    setForms((current) => current.filter((form) => form.id !== id))
    setMenu(null)
  }

  return (
    <AppShell actions={<Link className="button primary compact" to="/builder/new"><Plus weight="bold" /> 새 폼</Link>}>
      <main className="dashboard container">
        <div className="page-heading"><div><h1>내 폼</h1><p>만들고, 공유하고, 응답을 한곳에서 확인하세요.</p></div></div>
        {error ? <div className="error-panel">{error}</div> : null}
        {loading ? <div className="form-grid"><div className="skeleton form-card-skeleton" /><div className="skeleton form-card-skeleton" /></div> : null}
        {!loading && forms.length === 0 ? <EmptyState title="첫 폼을 만들어보세요" body="질문을 추가하고 Google Sheet를 연결하는 데 몇 분이면 충분합니다." action={<Link className="button primary" to="/builder/new"><FilePlus /> 새 폼 만들기</Link>} /> : null}
        <div className="form-grid">
          {forms.map((form) => (
            <article className="form-card" key={form.id}>
              <button className="form-card-main" type="button" onClick={() => navigate(`/builder/${form.id}`)}>
                <div className="form-card-cover" style={form.theme?.coverUrl ? { backgroundImage: `url(${form.theme.coverUrl})` } : { backgroundColor: form.theme?.surface || '#f3f7f6' }}>
                  {!form.theme?.coverUrl ? <FilePlus size={30} /> : null}
                  <span className={`status-badge ${form.isPublished ? '' : 'muted'}`}>{form.isPublished ? '게시 중' : '초안'}</span>
                </div>
                <div className="form-card-info"><h2>{form.title}</h2><p>응답 {form.responseCount.toLocaleString()}개 <span>최근 수정 {new Date(form.updatedAt).toLocaleDateString('ko-KR')}</span></p></div>
              </button>
              <div className="form-card-footer">
                <Link to={`/responses/${form.id}`}><Eye /> 응답 보기</Link>
                <button className="icon-button" type="button" onClick={() => setMenu(menu === form.id ? null : form.id)} aria-label="더 보기"><DotsThree size={22} /></button>
                {menu === form.id ? <div className="context-menu"><button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`)}><LinkSimple /> 링크 복사</button><button type="button" onClick={() => duplicate(form.id)}><Copy /> 폼 복제</button><button className="danger" type="button" onClick={() => remove(form.id)}><Trash /> 삭제</button></div> : null}
              </div>
            </article>
          ))}
          {forms.length > 0 ? <Link className="new-form-card" to="/builder/new"><span><Plus size={24} /></span><strong>새 폼 만들기</strong><small>빈 폼에서 시작</small><ArrowRight className="new-arrow" /></Link> : null}
        </div>
      </main>
    </AppShell>
  )
}
