import { describe, expect, it } from 'vitest'
import { EXTERNAL_SUBMIT_URL, externalAssistantPrompt, externalFields, externalResponseUrl, externalSubmitSnippet } from '../src/lib/externalIntegration'

const project = {
  id: 'project-1',
  slug: 'stock-application',
  pages: [{ fields: [
    { id: 'heading', type: 'heading', label: '안내' },
    { id: 'name-id', type: 'short', label: '이름', required: true },
    { id: 'email-id', type: 'email', label: '이메일', required: true },
    { id: 'agree-id', type: 'consent', label: '개인정보 동의', required: true },
  ] }],
}

describe('external site integration helpers', () => {
  it('lists only answerable fields', () => {
    expect(externalFields(project).map((field) => field.id)).toEqual(['name-id', 'email-id', 'agree-id'])
  })

  it('builds a key-free browser snippet for the correct form', () => {
    const snippet = externalSubmitSnippet(project)
    expect(snippet).toContain(externalResponseUrl(project))
    expect(externalResponseUrl(project)).toBe(`${EXTERNAL_SUBMIT_URL}?form=stock-application`)
    expect(snippet).toContain('"이름"')
    expect(snippet).not.toContain('form:')
    expect(snippet).not.toContain('SUPABASE_ANON_KEY')
  })

  it('builds an AI-ready connection request with exact question labels', () => {
    const prompt = externalAssistantPrompt(project)
    expect(prompt).toContain(`폼 응답 연결 링크: ${externalResponseUrl(project)}`)
    expect(prompt).toContain('- 이름 (필수)')
    expect(prompt).toContain('- 개인정보 동의 (필수)')
  })
})
