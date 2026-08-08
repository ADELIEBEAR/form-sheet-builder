import { SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import SiteRenderer from '../components/SiteRenderer'
import { api } from '../lib/api'
import { useParams } from '../lib/router'

export default function PublicSite() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api(`/maker/public-sites/${encodeURIComponent(slug)}`)
      .then((result) => { if (!cancelled) setData(result) })
      .catch((caught) => { if (!cancelled) setError(caught.message) })
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    if (!data?.site) return undefined
    const hero = data.site.content?.sections?.find((section) => section.type === 'hero')?.data
    const previousTitle = document.title
    const descriptionMeta = document.querySelector('meta[name="description"]')
    const previousDescription = descriptionMeta?.getAttribute('content') || ''
    document.title = data.site.title || hero?.title || '신청 안내'
    if (descriptionMeta) descriptionMeta.setAttribute('content', hero?.description || '')
    return () => {
      document.title = previousTitle
      if (descriptionMeta) descriptionMeta.setAttribute('content', previousDescription)
    }
  }, [data])

  if (!data && !error) return <div className="public-loading"><SpinnerGap className="spin" /><span>사이트를 불러오는 중입니다</span></div>
  if (error) return <main className="public-error"><WarningCircle /><h1>사이트를 열 수 없습니다</h1><p>{error}</p></main>
  return <SiteRenderer site={data.site} project={data.project} />
}
