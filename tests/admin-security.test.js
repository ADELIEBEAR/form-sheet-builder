import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('../src/lib/supabase', () => ({
  supabase: { functions: { invoke } },
}))

import { getResponseAdminToken, listResponseAdminSubmissions, lockResponseAdmin, responseAdminRequest } from '../src/lib/admin'

function makeSessionStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

describe('response administrator session', () => {
  beforeEach(() => {
    invoke.mockReset()
    global.window = { sessionStorage: makeSessionStorage() }
  })

  it('keeps the issued administrator token in tab-scoped storage and sends it with protected requests', async () => {
    invoke
      .mockResolvedValueOnce({ data: { unlocked: true, token: 'secure-tab-token-12345678901234567890' }, error: null })
      .mockResolvedValueOnce({ data: { submissions: [], hasMore: false }, error: null })

    await responseAdminRequest('unlock', { pin: '123456' })
    expect(getResponseAdminToken()).toBe('secure-tab-token-12345678901234567890')

    await listResponseAdminSubmissions('project-1')
    expect(invoke).toHaveBeenLastCalledWith('form-maker-admin', {
      body: expect.objectContaining({ action: 'submissions', projectId: 'project-1', token: 'secure-tab-token-12345678901234567890' }),
    })
  })

  it('removes the local administrator token even if server-side locking fails', async () => {
    window.sessionStorage.setItem('form-maker-response-admin-token', 'secure-tab-token-12345678901234567890')
    invoke.mockResolvedValueOnce({ data: null, error: new Error('network') })

    await expect(lockResponseAdmin()).rejects.toThrow('network')
    expect(getResponseAdminToken()).toBe('')
  })
})
