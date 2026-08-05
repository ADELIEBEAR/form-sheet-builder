import { Check, Code, Copy, LinkSimple, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { externalAssistantPrompt, externalFields, externalResponseUrl, externalSubmitSnippet } from '../lib/externalIntegration'

export default function ExternalConnectPanel({ project }) {
  const [tab, setTab] = useState('easy')
  const [copied, setCopied] = useState('')
  const fields = useMemo(() => externalFields(project), [project])
  const responseUrl = useMemo(() => externalResponseUrl(project), [project])
  const prompt = useMemo(() => externalAssistantPrompt(project), [project])
  const code = useMemo(() => externalSubmitSnippet(project), [project])

  async function copy(value, key) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1600)
  }

  return (
    <div className="inspector-panel external-connect-panel">
      <div className="panel-heading">
        <span>외부 사이트</span>
        <strong>다른 사이트의 신청도 이 폼으로 받기</strong>
        <p>사이트 화면은 그대로 두고, 제출된 답변만 이 폼의 응답 관리자와 백업 시트로 보냅니다.</p>
      </div>

      <div className={`external-status ${project?.status === 'published' ? 'ready' : 'draft'}`}>
        {project?.status === 'published' ? <Check weight="bold" /> : <WarningCircle weight="fill" />}
        <div><strong>{project?.status === 'published' ? '지금 연결할 수 있어요' : '게시한 뒤 연결할 수 있어요'}</strong><small>{project?.status === 'published' ? `폼 주소값 · ${project.slug}` : '초안에는 외부 응답이 저장되지 않습니다.'}</small></div>
      </div>

      <div className="external-endpoint">
        <span><LinkSimple /> 이 폼 전용 응답 연결 링크</span>
        <code>{responseUrl}</code>
        <button type="button" onClick={() => copy(responseUrl, 'url')}>{copied === 'url' ? <Check /> : <Copy />} {copied === 'url' ? '복사됨' : '링크 복사'}</button>
        <small>사이트를 만들 때 “신청 내용을 이 링크로 보내줘”라고 이 주소만 붙여넣으면 됩니다.</small>
      </div>

      <div className="external-tabs" role="tablist" aria-label="외부 사이트 연결 방법">
        <button className={tab === 'easy' ? 'active' : ''} type="button" onClick={() => setTab('easy')}><LinkSimple /> 쉬운 연결</button>
        <button className={tab === 'code' ? 'active' : ''} type="button" onClick={() => setTab('code')}><Code /> 직접 코드</button>
      </div>

      {tab === 'easy' ? (
        <div className="external-tab-content">
          <ol className="external-steps"><li>아래 요청문을 복사하세요.</li><li>외부 사이트를 편집하는 AI 채팅에 그대로 붙여넣으세요.</li><li>사이트를 다시 게시하면 연결이 끝납니다.</li></ol>
          <textarea className="external-code" rows="12" readOnly value={prompt} aria-label="AI 사이트 편집기에 붙여넣을 연결 요청문" />
          <button className="external-copy-primary" type="button" disabled={!project?.id} onClick={() => copy(prompt, 'prompt')}>{copied === 'prompt' ? <Check weight="bold" /> : <Copy />} {copied === 'prompt' ? '요청문 복사됨' : 'AI 연결 요청문 복사'}</button>
        </div>
      ) : (
        <div className="external-tab-content">
          <p className="external-help">개발자가 있는 사이트라면 제출 처리 부분에 이 코드를 넣으면 됩니다. 질문명 대신 아래 내부 코드를 보내도 됩니다.</p>
          <pre className="external-code"><code>{code}</code></pre>
          <button className="external-copy-primary" type="button" disabled={!project?.id} onClick={() => copy(code, 'code')}>{copied === 'code' ? <Check weight="bold" /> : <Copy />} {copied === 'code' ? '코드 복사됨' : '연결 코드 복사'}</button>
        </div>
      )}

      <details className="external-fields">
        <summary>연결할 질문 {fields.length}개 확인</summary>
        <div>{fields.map((field) => <p key={field.id}><span>{field.label}</span><code>{field.id}</code></p>)}</div>
      </details>
    </div>
  )
}
