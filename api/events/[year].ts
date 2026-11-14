import { Redis } from '@upstash/redis'

export const config = { runtime: 'edge' }

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days — year events don't change
const EVENT_LIMIT = 50
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function cleanWikitext(text: string): string {
  return text
    // Remove <ref>...</ref> tags (including multiline)
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    // Remove any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Resolve [[Link|Display]] → Display, [[Link]] → Link
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Remove bold/italic wiki markup
    .replace(/''+/g, '')
    // Remove {{templates}} (handle nested braces)
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '') // second pass for nested
    // Decode common HTML entities
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up leftover brackets/braces
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{\{|\}\}/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parseDatePrefix(prefix: string, year: number): string {
  const match = prefix.match(
    new RegExp(`(${MONTH_NAMES.join('|')})\\s+(\\d{1,2})`)
  )
  if (match) {
    const monthNum = MONTH_NAMES.indexOf(match[1]) + 1
    const dayNum = parseInt(match[2])
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
  }
  return `${year}-01-01`
}

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: string
  category: string
  location?: string
  wikipediaTitle?: string
}

function parseWikitextEvents(wikitext: string, year: number): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const lines = wikitext.split('\n')
  let counter = 0

  for (const line of lines) {
    // Only top-level list items (single *), skip sub-items (**)
    if (!line.match(/^\*[^*]/)) continue

    const raw = line.replace(/^\*\s*/, '')
    if (raw.length < 10) continue

    // Split on em dash: "January 10 – Event description"
    const dashMatch = raw.match(/^(.+?)\s*[–—]\s*(.+)$/s)
    let datePrefix = ''
    let eventRaw = raw

    if (dashMatch) {
      datePrefix = dashMatch[1].trim()
      eventRaw = dashMatch[2].trim()
    }

    // Extract first meaningful Wikipedia link (skip date/month links)
    let wikipediaTitle: string | undefined
    const linkMatches = raw.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g)
    for (const lm of linkMatches) {
      const title = lm[1].trim()
      if (title.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)( \d+)?$/)) continue
      wikipediaTitle = title.replace(/_/g, ' ')
      break
    }

    const eventText = cleanWikitext(eventRaw)
    const date = parseDatePrefix(cleanWikitext(datePrefix), year)

    events.push({
      id: wikipediaTitle || `event-${year}-${counter}`,
      title: eventText.length > 200 ? eventText.substring(0, 197) + '...' : eventText,
      description: cleanWikitext(datePrefix),
      date,
      category: 'Other',
      location: undefined,
      wikipediaTitle,
    })
    counter++
  }

  return events.slice(0, EVENT_LIMIT)
}

async function fetchEventsForYear(year: number): Promise<TimelineEvent[]> {
  // Step 1: Get page sections to find "Events"
  const sectionsUrl = `${WIKIPEDIA_API}?action=parse&page=${year}&prop=sections&format=json&origin=*`
  const sectionsRes = await fetch(sectionsUrl)
  if (!sectionsRes.ok) throw new Error(`Wikipedia API failed: ${sectionsRes.status}`)
  const sectionsJson = await sectionsRes.json()
  if (sectionsJson.error) return []

  const sections = sectionsJson?.parse?.sections ?? []
  const eventsSection = sections.find((s: { line: string }) => s.line === 'Events')
  if (!eventsSection) return []

  // Step 2: Fetch Events section as wikitext (easier to parse server-side than HTML)
  const contentUrl = `${WIKIPEDIA_API}?action=parse&page=${year}&section=${eventsSection.index}&prop=wikitext&format=json&origin=*`
  const contentRes = await fetch(contentUrl)
  if (!contentRes.ok) throw new Error(`Wikipedia API failed: ${contentRes.status}`)
  const contentJson = await contentRes.json()
  const wikitext = contentJson?.parse?.wikitext?.['*'] ?? ''

  return parseWikitextEvents(wikitext, year)
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const yearStr = url.pathname.split('/').pop()
  const year = Number(yearStr)

  if (!year || year < 1 || year > new Date().getFullYear() + 1) {
    return new Response(JSON.stringify({ error: 'Invalid year' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })

  const cacheKey = `events:v2:${year}`

  try {
    // Check Upstash cache
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

  // Fetch from Wikipedia
  const events = await fetchEventsForYear(year)

  // Cache in Upstash (only non-empty results)
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
