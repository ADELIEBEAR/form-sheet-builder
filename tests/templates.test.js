import { describe, expect, it } from 'vitest'
import { createTemplateProject, FORM_TEMPLATES } from '../src/lib/templates'
import { sanitizeProject } from '../src/lib/validation'

describe('form templates', () => {
  it('creates every template as a valid editable project', () => {
    for (const template of FORM_TEMPLATES) {
      const project = sanitizeProject(createTemplateProject(template.id))
      expect(project.title).toBe(template.title)
      expect(project.pages.flatMap((page) => page.fields).length).toBe(template.questions)
      expect(project.status).toBe('draft')
    }
  })
})
