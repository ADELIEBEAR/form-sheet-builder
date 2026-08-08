export const HISTORY_LIMIT = 80
export const HISTORY_MERGE_WINDOW = 500

export function createUndoHistory() {
  return { past: [], future: [], lastRecordedAt: 0 }
}

export function recordUndoSnapshot(history, snapshot, now = Date.now()) {
  const startsNewAction = !history.lastRecordedAt || now - history.lastRecordedAt > HISTORY_MERGE_WINDOW || history.future.length > 0
  if (startsNewAction) {
    history.past.push(snapshot)
    if (history.past.length > HISTORY_LIMIT) history.past.shift()
  }
  history.future = []
  history.lastRecordedAt = now
  return history
}

export function undoSnapshot(history, current) {
  const snapshot = history.past.pop()
  if (!snapshot) return null
  history.future.push(current)
  history.lastRecordedAt = 0
  return snapshot
}

export function redoSnapshot(history, current) {
  const snapshot = history.future.pop()
  if (!snapshot) return null
  history.past.push(current)
  history.lastRecordedAt = 0
  return snapshot
}
