function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function colorMapFromRanges(length, ranges = []) {
  const colors = Array.from({ length }, () => '')
  ranges.forEach((range) => {
    const start = clamp(Math.round(Number(range.start) || 0), 0, length)
    const end = clamp(Math.round(Number(range.end) || 0), start, length)
    if (!/^#[0-9a-f]{6}$/i.test(range.color || '')) return
    for (let index = start; index < end; index += 1) colors[index] = range.color
  })
  return colors
}

export function rangesFromColorMap(colors) {
  const ranges = []
  let start = 0
  while (start < colors.length) {
    const color = colors[start]
    let end = start + 1
    while (end < colors.length && colors[end] === color) end += 1
    if (color) ranges.push({ start, end, color })
    start = end
  }
  return ranges
}

export function applyTextColorRange(ranges, textLength, start, end, color) {
  const colors = colorMapFromRanges(textLength, ranges)
  const safeStart = clamp(Math.min(start, end), 0, textLength)
  const safeEnd = clamp(Math.max(start, end), safeStart, textLength)
  for (let index = safeStart; index < safeEnd; index += 1) colors[index] = color
  return rangesFromColorMap(colors)
}

export function rebaseTextColorRanges(ranges, previousText, nextText) {
  if (!ranges?.length || previousText === nextText) return ranges || []
  let prefix = 0
  while (prefix < previousText.length && prefix < nextText.length && previousText[prefix] === nextText[prefix]) prefix += 1
  let suffix = 0
  while (suffix < previousText.length - prefix && suffix < nextText.length - prefix && previousText[previousText.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]) suffix += 1
  const previousColors = colorMapFromRanges(previousText.length, ranges)
  const nextColors = Array.from({ length: nextText.length }, () => '')
  for (let index = 0; index < prefix; index += 1) nextColors[index] = previousColors[index]
  for (let index = 0; index < suffix; index += 1) nextColors[nextText.length - 1 - index] = previousColors[previousText.length - 1 - index]
  const inherited = previousColors[Math.max(0, prefix - 1)] || previousColors[prefix] || ''
  for (let index = prefix; index < nextText.length - suffix; index += 1) nextColors[index] = inherited
  return rangesFromColorMap(nextColors)
}

export function effectiveTextColorRanges(style, text) {
  if (!style?.colorRanges?.length) return []
  return rebaseTextColorRanges(style.colorRanges, String(style.colorText ?? text), text)
}

export function textColorSegments(text, ranges) {
  const colors = colorMapFromRanges(text.length, ranges)
  const segments = []
  let start = 0
  while (start < text.length) {
    const color = colors[start]
    let end = start + 1
    while (end < text.length && colors[end] === color) end += 1
    segments.push({ start, end, color, text: text.slice(start, end) })
    start = end
  }
  return segments
}
