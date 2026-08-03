import { ArrowRight, CheckCircle, CloudArrowUp, GoogleLogo, ImageSquare, SquaresFour } from '@phosphor-icons/react'
import { Navigate } from '../lib/router'
import { useAuth } from '../lib/auth'

export default function Landing() {
  const { user, loading, login } = useAuth()
  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <main className="landing">
      <nav className="landing-nav">
        <a className="brand" href="/"><span className="brand-mark"><SquaresFour weight="fill" /></span><span>폼메이커</span></a>
        <button className="button secondary compact" type="button" onClick={() => login()}>로그인</button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Google Sheets 연동 폼 제작기</span>
          <h1>폼을 만들면,<br />응답 정리는 끝.</h1>
          <p>링크로 응답을 받고 Google Sheet에 바로 쌓으세요. 이미지 트래픽은 분리해 비용 걱정도 줄였습니다.</p>
          <button className="button primary hero-button" type="button" onClick={() => login()}>Google로 시작하기 <ArrowRight weight="bold" /></button>
        </div>

        <div className="hero-product" aria-label="폼 제작기 기능 미리보기">
          <div className="product-top"><span>신규 상담 신청</span><span className="status-badge">게시 중</span></div>
          <div className="product-body">
            <div className="mini-sidebar"><span className="active"><SquaresFour /> 질문</span><span><ImageSquare /> 디자인</span><span><GoogleLogo /> 시트</span></div>
            <div className="mini-form">
              <div className="mini-heading" />
              <div className="mini-copy" />
              <div className="mini-question"><strong>이름을 알려주세요</strong><span /></div>
              <div className="mini-question"><strong>연락처를 입력해주세요</strong><span /></div>
              <div className="mini-submit">제출하기</div>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits" aria-label="주요 기능">
        <article><CloudArrowUp size={26} /><div><h2>응답을 안전하게</h2><p>D1에 먼저 저장해 시트 오류가 나도 응답을 잃지 않습니다.</p></div></article>
        <article><GoogleLogo size={26} /><div><h2>Google Sheet 자동 기록</h2><p>질문이 바뀌면 헤더도 맞추고 새 응답을 다음 행에 추가합니다.</p></div></article>
        <article><CheckCircle size={26} /><div><h2>이미지는 가볍게</h2><p>WebP로 압축한 뒤 R2에 저장해 DB와 전송량을 아낍니다.</p></div></article>
      </section>
    </main>
  )
}
