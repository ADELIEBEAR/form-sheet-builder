export default function BrandMark({ className = '' }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path className="brand-mark-line" d="M8.5 9.5h15M8.5 15.5h9.5M8.5 21.5h6" />
        <path className="brand-mark-check" d="m19 20.5 2.3 2.3 4.2-5" />
      </svg>
    </span>
  )
}
