export const TEXT_EFFECT_PRESETS = [
  ['none', '없음'],
  ['shadow', '부드러운'],
  ['hard-shadow', '선명한'],
  ['outline', '외곽선'],
  ['glow', '네온'],
  ['depth', '입체'],
]

export const TEXT_EFFECT_TYPES = new Set(TEXT_EFFECT_PRESETS.map(([effect]) => effect))

const DEFAULT_EFFECT_COLOR = '#5f50a4'

function clamp(value, min, max, fallback) {
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function safeColor(value, fallback = DEFAULT_EFFECT_COLOR) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback
}

export function resolveTextEffect(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const base = fallback && typeof fallback === 'object' ? fallback : {}
  return {
    textEffect: TEXT_EFFECT_TYPES.has(source.textEffect)
      ? source.textEffect
      : (TEXT_EFFECT_TYPES.has(base.textEffect) ? base.textEffect : 'none'),
    effectColor: safeColor(source.effectColor, safeColor(base.effectColor)),
    effectStrength: clamp(source.effectStrength, 10, 100, clamp(base.effectStrength, 10, 100, 58)),
    effectBlur: clamp(source.effectBlur, 0, 32, clamp(base.effectBlur, 0, 32, 10)),
    effectDistance: clamp(source.effectDistance, 0, 18, clamp(base.effectDistance, 0, 18, 4)),
  }
}

function tinted(color, strength, multiplier = 1) {
  const amount = Math.round(Math.min(100, Math.max(5, strength * multiplier)))
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`
}

function rounded(value) {
  return Math.round(value * 10) / 10
}

export function textEffectCss(value, fallback) {
  const resolved = resolveTextEffect(value, fallback)
  const { textEffect, effectColor, effectStrength, effectBlur, effectDistance } = resolved
  const color = tinted(effectColor, effectStrength)

  if (textEffect === 'shadow') {
    return {
      textShadow: `${rounded(effectDistance * 0.65)}px ${rounded(effectDistance)}px ${rounded(effectBlur)}px ${color}`,
      WebkitTextStroke: '0 transparent',
    }
  }

  if (textEffect === 'hard-shadow') {
    return {
      textShadow: `${rounded(Math.max(1, effectDistance))}px ${rounded(Math.max(1, effectDistance))}px 0 ${color}`,
      WebkitTextStroke: '0 transparent',
    }
  }

  if (textEffect === 'outline') {
    const width = rounded(0.5 + (effectDistance / 18) * 3.5)
    return {
      textShadow: 'none',
      WebkitTextStroke: `${width}px ${color}`,
    }
  }

  if (textEffect === 'glow') {
    const near = rounded(Math.max(2, effectBlur * 0.55))
    const middle = rounded(Math.max(5, effectBlur + 5))
    const far = rounded(Math.max(9, effectBlur * 1.65 + 8))
    return {
      textShadow: `0 0 ${near}px ${color}, 0 0 ${middle}px ${tinted(effectColor, effectStrength, 0.72)}, 0 0 ${far}px ${tinted(effectColor, effectStrength, 0.38)}`,
      WebkitTextStroke: '0 transparent',
    }
  }

  if (textEffect === 'depth') {
    const layers = Math.max(2, Math.min(10, Math.round(effectDistance || 2)))
    const shadows = Array.from({ length: layers }, (_, index) => {
      const offset = rounded(((index + 1) / layers) * Math.max(2, effectDistance))
      return `${offset}px ${offset}px 0 ${tinted(effectColor, effectStrength, 0.82 + (index / layers) * 0.18)}`
    })
    return {
      textShadow: shadows.join(', '),
      WebkitTextStroke: '0 transparent',
    }
  }

  return { textShadow: 'none', WebkitTextStroke: '0 transparent' }
}
