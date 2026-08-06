import { ArrowRight, Check, CheckCircle, FileXls, FolderOpen, GoogleLogo, LockKey, MagicWand, PencilSimple, Sparkle, WarningOctagon } from '@phosphor-icons/react'
import BrandMark from '../components/BrandMark'
import FormCanvas from '../components/FormCanvas'
import { useAuth } from '../lib/auth'
import { Navigate } from '../lib/router'

const previewProject = {
  title: '프로젝트 신청서',
  description: '필요한 내용을 남겨주시면 확인 후 연락드릴게요.',
  pages: [{ id: 'sample-page', title: '기본 정보', description: '신청 내용을 간단히 알려주세요.', fields: [
    { id: 'sample-name', type: 'short', label: '이름을 알려주세요', required: true, placeholder: '홍길동' },
    { id: 'sample-type', type: 'single', label: '어떤 작업이 필요한가요?', description: '가장 가까운 항목을 하나 골라주세요.', required: true, options: ['브랜드 디자인', '웹사이트', '기타'] },
  ] }],
  theme: { accent: '#735bd6', background: '#eeebfa', card: '#fffefa', text: '#292633', radius: 24, showProgress: true, layout: 'focus', font: 'pretendard', questionSize: 29, bodySize: 14 },
  settings: { submitLabel: '신청서 보내기', requiredLabel: '필수' },
}

const flowItems = [
  ['01', '질문을 누르고', '보이는 폼 안에서 제목과 질문을 바로 고칩니다.'],
  ['02', '디자인을 맞추고', '페이지마다 글자와 분위기를 세밀하게 조절합니다.'],
  ['03', '답변만 확인', '중복·불량 응답을 자동으로 나눠 필요한 답만 봅니다.'],
]

export default function Landing() {
  const { user, loading, login } = useAuth()
  if (!loading && user) return <Navigate to="/workspace" replace />
  const begin = () => login('/workspace')

  return (
    <main className="new-landing">
      <a className="landing-skip" href="#landing-main">본문으로 바로가기</a>
      <nav className="landing-bar" aria-label="메인 메뉴">
        <a className="maker-logo landing-logo" href="/" aria-label="폼메이커 홈"><BrandMark /><span className="maker-wordmark"><strong>폼메이커</strong></span></a>
        <div className="landing-nav-actions">
          <button className="landing-login" type="button" onClick={() => login()} disabled={loading}>로그인</button>
          <button className="landing-nav-cta" type="button" onClick={begin} disabled={loading}>무료로 시작하기 <ArrowRight weight="bold" /></button>
        </div>
      </nav>

      <section className="landing-hero" id="landing-main">
        <div className="landing-copy">
          <span className="landing-kicker"><Sparkle weight="fill" /> 폼 제작과 응답 관리를 한곳에서</span>
          <h1><span>보이는 그대로</span><br />만들고, 답을 받으세요.</h1>
          <p>설정창을 헤매지 않고 폼 화면을 직접 눌러 만드세요. 들어온 응답은 중복과 불량까지 알아서 정리합니다.</p>
          <div className="landing-actions">
            <button className="landing-cta" type="button" onClick={begin} disabled={loading}><GoogleLogo weight="bold" /> {loading ? '로그인 준비 중' : 'Google로 무료 시작'} <ArrowRight weight="bold" /></button>
            <a className="landing-text-link" href="#how-it-works">어떻게 만드는지 보기 <ArrowRight /></a>
          </div>
          <div className="landing-checks" aria-label="주요 장점"><span><Check weight="bold" /> 카드 등록 없이 시작</span><span><Check weight="bold" /> 모바일 폼 기본 지원</span><span><Check weight="bold" /> 엑셀 저장</span></div>
        </div>

        <div className="landing-product-stage" aria-label="폼메이커 실제 제작 화면 미리보기">
          <span className="landing-orbit orbit-one" /><span className="landing-orbit orbit-two" />
          <div className="landing-demo">
            <div className="demo-browser"><span /><span /><span /><small>formmaker.app/studio</small><em>자동 저장됨</em></div>
            <div className="landing-studio-demo">
              <aside className="landing-mini-outline">
                <small>콘텐츠</small>
                <div><i>01</i><span><strong>시작 화면</strong><small>제목과 소개</small></span></div>
                <div className="active"><i>1</i><span><strong>기본 정보</strong><small>2개 항목</small></span></div>
                <p>이 페이지의 질문</p>
                <button type="button" tabIndex="-1"><i>1</i><span>이름을 알려주세요</span></button>
                <button className="selected" type="button" tabIndex="-1"><i>2</i><span>어떤 작업이 필요한가요?</span></button>
              </aside>
              <div className="landing-live-form"><FormCanvas project={previewProject} pageIndex={2} preview selectedFieldId="sample-type" /></div>
              <aside className="landing-mini-type">
                <header><MagicWand weight="fill" /><span><small>DESIGN</small><strong>글자 디자인</strong></span></header>
                <label>현재 페이지 <span>질문</span></label>
                <div className="mini-type-sample">어떤 작업이<br />필요한가요?</div>
                <div className="mini-control"><span>크기</span><i><b style={{ width: '68%' }} /></i><strong>29</strong></div>
                <div className="mini-control"><span>굵기</span><i><b style={{ width: '76%' }} /></i><strong>760</strong></div>
                <div className="mini-control"><span>행간</span><i><b style={{ width: '46%' }} /></i><strong>128</strong></div>
              </aside>
            </div>
          </div>
          <div className="landing-float-card float-edit"><PencilSimple weight="fill" /><span><small>직접 편집</small><strong>누르면 바로 수정</strong></span><CheckCircle weight="fill" /></div>
          <div className="landing-float-card float-response"><WarningOctagon weight="fill" /><span><small>응답 자동 판정</small><strong>중복 DB 2건 분리</strong></span></div>
        </div>
      </section>

      <section className="landing-capability-strip" aria-label="폼메이커 기능">
        <span>직접 편집</span><i /> <span>페이지별 디자인</span><i /> <span>외부 사이트 연결</span><i /> <span>중복·불량 자동 판정</span><i /> <span>CSV·엑셀 저장</span>
      </section>

      <section className="landing-workflow" id="how-it-works">
        <div className="landing-section-heading">
          <span>만드는 흐름</span>
          <h2>복잡한 설정 대신,<br /><em>세 번의 자연스러운 흐름.</em></h2>
          <p>처음 만드는 사람도 설명 없이 쓸 수 있도록 제작부터 응답 확인까지 같은 언어로 이어집니다.</p>
        </div>
        <div className="landing-flow-list">
          {flowItems.map(([number, title, description]) => <article key={number}><small>{number}</small><div><h3>{title}</h3><p>{description}</p></div><ArrowRight /></article>)}
        </div>
      </section>

      <section className="landing-feature-grid">
        <article className="landing-feature feature-editor">
          <div className="feature-copy"><span><PencilSimple weight="fill" /> 보이는 화면에서 편집</span><h2>입력창을 찾지 말고<br />글자를 직접 누르세요.</h2><p>제목, 안내문, 질문, 선택지, 동의 문구까지 신청자가 보는 바로 그 화면에서 수정합니다.</p></div>
          <div className="feature-editor-demo"><span>PAGE 1</span><input aria-label="랜딩 예시 질문" readOnly value="연락받을 전화번호를 알려주세요" /><p>클릭한 곳이 바로 편집됩니다</p><i><PencilSimple weight="fill" /> 지금 수정 중</i></div>
        </article>

        <article className="landing-feature feature-design">
          <div className="feature-copy"><span><MagicWand weight="fill" /> 페이지별 디자인</span><h2>폼 전체도,<br />한 페이지만도.</h2><p>글꼴·크기·굵기·행간·자간을 미리보며 바로 조절합니다.</p></div>
          <div className="feature-type-demo"><strong>질문</strong><span>32 px</span><i><b /></i><div><button type="button" tabIndex="-1">제목</button><button className="active" type="button" tabIndex="-1">질문</button><button type="button" tabIndex="-1">본문</button></div></div>
        </article>

        <article className="landing-feature feature-responses">
          <div className="feature-copy"><span><FolderOpen weight="fill" /> 응답 관리자</span><h2>들어온 답은<br />이미 정리되어 있어요.</h2><p>폴더와 메모로 나눠 보고, 중복·불량 응답은 자동으로 표시합니다.</p></div>
          <div className="feature-response-list">
            <div><i className="status-normal"><CheckCircle weight="fill" /></i><span><strong>김민지</strong><small>오늘 오후 2:18</small></span><em>정상</em></div>
            <div><i className="status-duplicate"><WarningOctagon weight="fill" /></i><span><strong>박도윤</strong><small>전화번호 중복</small></span><em>중복 DB</em></div>
            <div><i className="status-invalid"><WarningOctagon weight="fill" /></i><span><strong>이서현</strong><small>필수 답변 불완전</small></span><em>불량 DB</em></div>
          </div>
        </article>

        <article className="landing-feature feature-safe">
          <div className="feature-copy"><span><LockKey weight="fill" /> 관리자 전용</span><h2>응답은 잠그고,<br />필요할 때 꺼내세요.</h2><p>관리자 권한으로 응답을 보호하고 CSV와 엑셀 파일로 저장할 수 있습니다.</p></div>
          <div className="feature-export"><LockKey weight="fill" /><span><small>응답 관리자</small><strong>권한이 확인되었습니다</strong></span><button type="button" tabIndex="-1"><FileXls weight="fill" /> 엑셀 저장</button></div>
        </article>
      </section>

      <section className="landing-final-cta">
        <div><span>첫 폼은 금방 만들 수 있어요</span><h2>질문부터 하나<br />써볼까요?</h2></div>
        <div><p>Google 계정으로 시작하고, 완성될 때까지 무료로 테스트하세요.</p><button className="landing-cta final" type="button" onClick={begin} disabled={loading}><GoogleLogo weight="bold" /> 폼메이커 시작하기 <ArrowRight weight="bold" /></button></div>
      </section>

      <footer className="landing-footer"><a className="maker-logo landing-logo" href="/"><BrandMark /><span className="maker-wordmark"><strong>폼메이커</strong></span></a><p>폼 제작과 응답 정리를 더 단순하게.</p><small>© 2026 폼메이커</small></footer>
    </main>
  )
}
