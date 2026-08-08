export default function FocusEffects({ theme = {} }) {
  const effect = theme.effect || 'aurora'
  if (effect === 'none') return null
  const motion = theme.motion || 'soft'
  return (
    <div className={`focus-effects effect-${effect} motion-${motion}`} aria-hidden="true">
      <i /><i /><i />
    </div>
  )
}
