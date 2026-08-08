import { describe, expect, it } from 'vitest'
import { createUndoHistory, recordUndoSnapshot, redoSnapshot, undoSnapshot } from '../src/lib/undoHistory'

describe('studio undo history', () => {
  it('merges continuous typing and dragging into one undo action', () => {
    const history = createUndoHistory()
    const before = { project: { title: '처음' }, pageIndex: 0, selectedFieldId: '__cover__' }
    const during = { project: { title: '처음 수' }, pageIndex: 0, selectedFieldId: '__cover__' }

    recordUndoSnapshot(history, before, 1000)
    recordUndoSnapshot(history, during, 1250)

    expect(history.past).toEqual([before])
  })

  it('undoes and redoes complete editor snapshots', () => {
    const history = createUndoHistory()
    const before = { project: { title: '처음' }, pageIndex: 0, selectedFieldId: '__cover__' }
    const after = { project: { title: '수정' }, pageIndex: 1, selectedFieldId: 'q1' }
    recordUndoSnapshot(history, before, 1000)

    expect(undoSnapshot(history, after)).toEqual(before)
    expect(redoSnapshot(history, before)).toEqual(after)
  })
})
