import type { Event, EventCategory } from '@/types/event'

const EVENT_LIMIT = 50
const ON_THIS_DAY_LIMIT = 20

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA_REST = 'https://en.wikipedia.org/api/rest_v1'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTH_DATE_RE = new RegExp(
  `^(${MONTH_NAMES.join('|')})\\s+(\\d{1,2})$`
)

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

/** Clean text by removing ref tags, HTML entities, and wiki artifacts */
function cleanText(text: string): string {
  return text
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{\{|\}\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Get direct text of an <li>, excluding nested <ul>/<ol> sub-lists and <sup>/<ref> */
function getDirectText(li: Element): string {
  let text = ''
  for (const node of li.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toUpperCase()
      if (tag === 'UL' || tag === 'OL' || tag === 'SUP') continue
      text += el.textContent
    }
  }
  return cleanText(text)
}

/** Parse Wikipedia year page HTML into events (browser-side fallback) */
function parseEventsHtml(html: string, year: number): Event[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const events: Event[] = []
  let counter = 0

  const allItems = doc.querySelectorAll('li')
  for (const li of allItems) {
    if (li.parentElement?.closest('li')) continue

    const text = getDirectText(li)
    if (!text || text.length < 10) continue

    const dashMatch = text.match(/^(.+?)\s*[–—-]\s*(.+)$/s)
    let datePrefix = ''
    let eventText = text

    if (dashMatch) {
      datePrefix = dashMatch[1].trim()
      eventText = dashMatch[2].trim()
    }

    let wikipediaTitle: string | undefined
    const allLinks = li.querySelectorAll('a[href*="/wiki/"]')
    for (const link of allLinks) {
      const href = link.getAttribute('href') ?? ''
      const title = decodeURIComponent(href.replace(/^.*\/wiki\//, ''))
      if (MONTH_DATE_RE.test(title)) continue
      if (MONTH_NAMES.includes(title)) continue
      if (title.startsWith('Category:') || title.startsWith('Help:') || title.startsWith('Wikipedia:')) continue
      wikipediaTitle = title.replace(/_/g, ' ')
      break
    }

    const date = parseDatePrefix(datePrefix, year)

    events.push({
      id: wikipediaTitle || `event-${year}-${counter}`,
      title: eventText.length > 200 ? eventText.substring(0, 197) + '...' : eventText,
      description: datePrefix,
      date,
      category: 'Other' as EventCategory,
      location: undefined,
      wikipediaTitle,
    })
    counter++
  }

  return events
}

/** Direct Wikipedia fetch — used as fallback when API routes aren't available (local dev) */
async function fetchEventsFromWikipediaDirect(year: number): Promise<Event[]> {
  const sectionsUrl = `${WIKIPEDIA_API}?action=parse&page=${year}&prop=sections&format=json&origin=*`
  const sectionsRes = await fetch(sectionsUrl)
  if (!sectionsRes.ok) throw new Error(`Wikipedia API failed: ${sectionsRes.status}`)
  const sectionsJson = await sectionsRes.json()
  if (sectionsJson.error) return []

  const sections = sectionsJson?.parse?.sections ?? []
  const eventsSection = sections.find((s: { line: string }) => s.line === 'Events')
  if (!eventsSection) return []

  const contentUrl = `${WIKIPEDIA_API}?action=parse&page=${year}&section=${eventsSection.index}&prop=text&format=json&origin=*`
  const contentRes = await fetch(contentUrl)
  if (!contentRes.ok) throw new Error(`Wikipedia API failed: ${contentRes.status}`)
  const contentJson = await contentRes.json()
  const html = contentJson?.parse?.text?.['*'] ?? ''

  return parseEventsHtml(html, year).slice(0, EVENT_LIMIT)
}

async function fetchOnThisDayFromWikipediaDirect(month: number, day: number): Promise<Event[]> {
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
        category: 'Other' as EventCategory,
        location: undefined,
        wikipediaTitle: page?.title,
      }
    })
}

/**
 * Fetch events for a year. Tries the Vercel API route (Upstash-cached) first,
 * falls back to direct Wikipedia fetch for local dev.
 */
export async function fetchEventsForYear(year: number): Promise<Event[]> {
  try {
    const res = await fetch(`/api/events/${year}`)
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) return res.json()
    }
  } catch {
    // API route not available — fall back to direct fetch
  }
  return fetchEventsFromWikipediaDirect(year)
}

/**
 * Fetch "on this day" events. Tries the Vercel API route first,
 * falls back to direct Wikipedia fetch.
 */
export async function fetchOnThisDay(month: number, day: number): Promise<Event[]> {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  try {
    const res = await fetch(`/api/onthisday/${mm}-${dd}`)
    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) return res.json()
    }
  } catch {
    // API route not available — fall back to direct fetch
  }
  return fetchOnThisDayFromWikipediaDirect(month, day)
}
