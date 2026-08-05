import { effectiveTextColorRanges, textColorSegments } from '../lib/richText'

function Layer({ text, style, ranges, className }) {
  const segments = textColorSegments(text, ranges)
  return (
    <span className={className} style={style?.color ? { color: style.color } : undefined}>
      {segments.map((segment) => <span style={segment.color ? { color: segment.color } : undefined} key={`${segment.start}-${segment.end}`}>{segment.text}</span>)}
    </span>
  )
}

export default function ColoredText({ text: rawText, desktopStyle, mobileStyle }) {
  const text = String(rawText ?? '')
  const desktopRanges = effectiveTextColorRanges(desktopStyle, text)
  const mobileRanges = mobileStyle?.colorRanges?.length ? effectiveTextColorRanges(mobileStyle, text) : desktopRanges
  const hasDesktopColor = Boolean(desktopStyle?.color || desktopRanges.length)
  const hasMobileColor = Boolean(mobileStyle?.color || mobileRanges.length)
  if (!hasDesktopColor && !hasMobileColor) return text
  return (
    <>
      <Layer className="public-rich-desktop" text={text} style={desktopStyle} ranges={desktopRanges} />
      <Layer className="public-rich-mobile" text={text} style={mobileStyle?.color ? mobileStyle : desktopStyle} ranges={mobileRanges} />
    </>
  )
}
