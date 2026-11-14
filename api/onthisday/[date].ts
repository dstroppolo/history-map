import { Redis } from '@upstash/redis'

export const config = { runtime: 'edge' }

const CACHE_TTL_SECONDS = 24 * 60 * 60 // 24 hours
const ON_THIS_DAY_LIMIT = 20
const WIKIPEDIA_REST = 'https://en.wikipedia.org/api/rest_v1'

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: string
  category: string
  location?: string
  wikipediaTitle?: string
}

async function fetchOnThisDay(month: number, day: number): Promise<TimelineEvent[]> {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const url = `${WIKIPEDIA_REST}/feed/onthisday/events/${mm}/${dd}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Wikipedia on-this-day failed: ${res.status}`)
  const json = await res.json()

  return (json.events ?? [])
    .slice(0, ON_THIS_DAY_LIMIT)
    .map((item: { text?: string; year?: number; pages?: { title?: string; description?: string }[] }, i: number) => {
      const page = item.pages?.[0]
      return {
        id: page?.title || `otd-${item.year}-${i}`,
        title: item.text || '',
        description: page?.description || '',
        date: `${item.year}-${mm}-${dd}`,
        category: 'Other',
        location: undefined,
        wikipediaTitle: page?.title,
      }
    })
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const dateStr = url.pathname.split('/').pop() // "MM-DD"
  const match = dateStr?.match(/^(\d{2})-(\d{2})$/)

  if (!match) {
    return new Response(JSON.stringify({ error: 'Invalid date format. Use MM-DD.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const month = Number(match[1])
  const day = Number(match[2])

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return new Response(JSON.stringify({ error: 'Invalid date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })

  const cacheKey = `onThisDay:${match[1]}-${match[2]}`

  try {
    const cached = await redis.get<TimelineEvent[]>(cacheKey)
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      })
    }
  } catch {
    // Redis error — proceed to fetch
  }

  const events = await fetchOnThisDay(month, day)

  if (events.length > 0) {
    try {
      await redis.set(cacheKey, events, { ex: CACHE_TTL_SECONDS })
    } catch {
      // Cache write failure — non-fatal
    }
  }

  return new Response(JSON.stringify(events), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
    },
  })
}
