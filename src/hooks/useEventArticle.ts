import { useState, useEffect } from 'react'
import { fetchWikipediaSummary, type WikipediaSummary } from '@/services/wikidata'
import { getCached, setCached, TTL_MS_ENTITY } from '@/services/cache'

const ARTICLE_CACHE_PREFIX = 'article:'

export function useEventArticle(wikipediaTitle: string | undefined) {
  const [summary, setSummary] = useState<WikipediaSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wikipediaTitle) {
      setSummary(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setSummary(null)
    const load = async () => {
      const cacheKey = ARTICLE_CACHE_PREFIX + wikipediaTitle
      const cached = await getCached<WikipediaSummary>(cacheKey, { ttlMs: TTL_MS_ENTITY })
      if (cancelled) return
      if (cached) {
        setSummary(cached)
        setLoading(false)
        return
      }
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle.replace(/ /g, '_'))}`
      const result = await fetchWikipediaSummary(url)
      if (cancelled) return
      if (result) await setCached(cacheKey, result)
      setSummary(result ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [wikipediaTitle])

  return { summary, loading }
}
