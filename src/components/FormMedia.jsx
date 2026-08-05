import { TRANSITION_PRESETS } from '../lib/maker'

const transitionIds = new Set(TRANSITION_PRESETS.map(([transition]) => transition))

export function mediaMode(theme) {
  if (['background', 'banner', 'card'].includes(theme?.imageMode)) return theme.imageMode
  return theme?.layout === 'card' ? 'banner' : 'background'
}

export function mediaVariables(theme) {
  return {
    '--preview-image-x': `${theme?.imagePositionX ?? 50}%`,
    '--preview-image-y': `${theme?.imagePositionY ?? 50}%`,
    '--preview-image-scale': (theme?.imageScale ?? 100) / 100,
    '--preview-image-height': `${theme?.imageHeight ?? 220}px`,
    '--preview-image-opacity': (theme?.imageOpacity ?? 100) / 100,
    '--preview-image-brightness': (theme?.imageBrightness ?? 100) / 100,
    '--preview-image-overlay': (theme?.imageOverlay ?? 28) / 100,
    '--preview-image-fit': theme?.imageFit === 'contain' ? 'contain' : 'cover',
  }
}

export function transitionClass(theme) {
  const transition = transitionIds.has(theme?.transition) ? theme.transition : 'rise'
  return `form-screen-enter transition-${transition}`
}

export default function FormMedia({ theme, placement, className = '' }) {
  if (!theme?.coverUrl || mediaMode(theme) !== placement) return null

  return (
    <div className={`form-media form-media-${placement} ${className}`.trim()} aria-hidden="true">
      <img src={theme.coverUrl} alt="" />
    </div>
  )
}
