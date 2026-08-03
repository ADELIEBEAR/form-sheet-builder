import { FilePlus } from '@phosphor-icons/react'

export default function EmptyState({ title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><FilePlus size={28} /></div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  )
}
