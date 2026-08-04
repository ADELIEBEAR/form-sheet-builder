import { ArrowRight, Check, GoogleLogo } from '@phosphor-icons/react'
import { Navigate } from '../lib/router'
import { useAuth } from '../lib/auth'
import FormCanvas from '../components/FormCanvas'

const previewProject = {
  title: '프로젝트 신청서',
  description: '필요한 내용을 남겨주시면 확인 후 연락드릴게요.',
  pages: [{ id: 'sample-page', title: '기본 정보', fields: [
    { id: 'sample-name', type: 'short', label: '이름을 알려주세요', required: true, placeholder: '홍길동' },
    { id: 'sample-type', type: 'single', label: '어떤 작업이 필요한가요?', required: true, options: ['브랜드 디자인', '웹사이트', '기타'] },
  ] }],
  theme: { accent: '#7156d9', background: '#f0edfb', card: '#ffffff', text: '#222131', radius: 24, showProgress: true, layout: 'focus', font: 'pretendard' },
  settings: { submitLabel: '신청서 보내기' },
}

export default function Landing() {
  const { user, loading, login } = useAuth()
  if (!loading && user) return <Navigate to="/workspace" replace />
  return (
    <main className="new-landing">
      <nav className="landing-bar">
        <a className="maker-logo dark-logo" href="/"><span className="maker-glyph"><i /><i /><i /></span><strong>폼메이커</strong></a>
        <button className="landing-login" type="button" onClick={() => login()}>로그인</button>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">폼 제작부터 응답 정리까지</span>
          <h1>질문을 만들고,<br />답변에 바로 집중하세요.</h1>
          <p>여러 페이지로 구성한 폼을 링크로 공유하고, 들어온 응답을 Google Sheet에 차곡차곡 기록합니다.</p>
          <button className="landing-cta" type="button" onClick={() => login('/workspace')}><GoogleLogo weight="bold" /> Google로 시작하기 <ArrowRight weight="bold" /></button>
          <div className="landing-checks"><span><Check weight="bold" /> 응답 먼저 안전하게 저장</span><span><Check weight="bold" /> 이미지는 DB와 분리</span></div>
        </div>
        <div className="landing-demo" aria-label="새 폼메이커 실제 폼 미리보기"><div className="demo-browser"><span /><span /><span /><small>formmaker.app/s/project</small></div><FormCanvas project={previewProject} pageIndex={2} preview selectedFieldId="sample-type" /></div>
      </section>
      <section className="landing-story">
        <strong>작성 화면은 단순하게</strong>
        <p>폼 화면에서 제목과 질문을 바로 누르고 고칩니다. 설정창을 오갈 필요 없이 만드는 흐름에만 집중할 수 있어요.</p>
        <div className="story-steps"><article><span>직접 편집</span><h2>보이는 화면에서<br />누르고 바로 수정하세요.</h2></article><article><span>고정 편집 도구</span><h2>디자인과 설정은<br />항상 옆에서 바꾸세요.</h2></article><article><span>응답 정리</span><h2>Supabase에 보관하고<br />Google Sheet로 옮기세요.</h2></article></div>
      </section>
    </main>
  )
}
