import type { Person } from '@/types/person'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1'

export interface WikipediaSummary {
  title: string
  extract: string
  thumbnail?: { source: string; width: number; height: number }
  contentUrls?: { desktop?: { page: string } }
}

export async function fetchWikipediaSummary(
  wikipediaUrl: string,
): Promise<WikipediaSummary | null> {
  try {
    const title = decodeURIComponent(wikipediaUrl.split('/wiki/').pop() ?? '')
    if (!title) return null
    const res = await fetch(`${WIKIPEDIA_API}/page/summary/${encodeURIComponent(title)}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title ?? title,
      extract: data.extract ?? '',
      thumbnail: data.thumbnail,
      contentUrls: data.content_urls,
    }
  } catch {
    return null
  }
}

interface WikidataEntity {
  labels?: { en?: { value: string } }
  descriptions?: { en?: { value: string } }
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value: unknown } } }>>
  sitelinks?: { enwiki?: { url?: string; title?: string } }
}

function extractYear(timeValue: unknown): number | undefined {
  if (typeof timeValue !== 'object' || timeValue === null) return undefined
  const v = timeValue as { time?: string }
  const time = v.time
  if (typeof time !== 'string') return undefined
  const match = time.match(/^([+-]?\d{4})/)
  return match ? parseInt(match[1], 10) : undefined
}

function extractEntityId(ref: unknown): string | undefined {
  if (typeof ref !== 'object' || ref === null) return undefined
  const v = ref as { id?: string }
  return v.id
}

function getImageUrl(filename: string): string {
  const encoded = encodeURIComponent(filename)
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`
}

export function entityToPerson(entityId: string, data: WikidataEntity): Person {
  const labels = data.labels?.en?.value
  const descriptions = data.descriptions?.en?.value
  const name = labels ?? entityId

  let birthYear: number | undefined
  let deathYear: number | undefined
  let title: string | undefined
  let imageUrl: string | undefined

  const claims = data.claims ?? {}
  const p569 = claims.P569?.[0]?.mainsnak?.datavalue?.value
  const p570 = claims.P570?.[0]?.mainsnak?.datavalue?.value
  birthYear = extractYear(p569)
  deathYear = extractYear(p570)

  if (claims.P39?.length) {
    title = descriptions ?? 'Royal'
  }

  const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value
  if (typeof p18 === 'string') {
    imageUrl = getImageUrl(p18)
  }

  const enwiki = data.sitelinks?.enwiki
  const wikipediaUrl =
    enwiki?.url ??
    (enwiki?.title
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki.title.replace(/ /g, '_'))}`
      : undefined)

  const houseId = extractEntityId(claims.P53?.[0]?.mainsnak?.datavalue?.value)

  return {
    id: entityId,
    name,
    birthYear,
    deathYear,
    title: title ?? descriptions,
    description: descriptions,
    imageUrl,
    wikipediaUrl,
    houseId,
  }
}

/** Fetch en labels for entity IDs. */
export async function fetchEntityLabels(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const unique = [...new Set(ids)].filter(Boolean)
  const idParam = unique.map((id) => (id.startsWith('Q') ? id : `Q${id}`)).join('|')
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${idParam}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return new Map()
  const json = await res.json()
  const entities = json.entities ?? {}
  const map = new Map<string, string>()
  for (const id of unique) {
    const eid = id.startsWith('Q') ? id : `Q${id}`
    const entity = entities[eid]
    const label = entity?.labels?.en?.value
    if (label) map.set(eid, label)
  }
  return map
}

export async function fetchPerson(qId: string): Promise<Person | null> {
  const id = qId.startsWith('Q') ? qId : `Q${qId}`
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${id}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const entity = json.entities?.[id]
  if (!entity || entity.missing) return null
  return entityToPerson(id, entity)
}

/** Get English Wikipedia article title for a Wikidata entity (for events, etc.). */
export async function getWikipediaTitleForEntity(qId: string): Promise<string | null> {
  const id = qId.startsWith('Q') ? qId : `Q${qId}`
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${id}&props=sitelinks&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const entity = json.entities?.[id]
  const title = entity?.sitelinks?.enwiki?.title
  return typeof title === 'string' ? title : null
}

export function getParentIds(entity: WikidataEntity): string[] {
  const ids: string[] = []
  const claims = entity.claims ?? {}
  const p22 = claims.P22?.[0]?.mainsnak?.datavalue?.value
  const p25 = claims.P25?.[0]?.mainsnak?.datavalue?.value
  const father = extractEntityId(p22)
  const mother = extractEntityId(p25)
  if (father) ids.push(father)
  if (mother) ids.push(mother)
  return ids
}

export function getParentIdsByRole(entity: WikidataEntity): {
  fatherId?: string
  motherId?: string
} {
  const claims = entity.claims ?? {}
  const p22 = claims.P22?.[0]?.mainsnak?.datavalue?.value
  const p25 = claims.P25?.[0]?.mainsnak?.datavalue?.value
  const fatherId = extractEntityId(p22)
  const motherId = extractEntityId(p25)
  return { fatherId, motherId }
}

export function getChildIds(entity: WikidataEntity): string[] {
  const claims = entity.claims ?? {}
  const p40 = claims.P40 ?? []
  return p40
    .map((c) => extractEntityId(c.mainsnak?.datavalue?.value))
    .filter((id): id is string => !!id)
}

export async function fetchPersonWithRelations(qId: string): Promise<{
  person: Person
  parentIds: string[]
  childIds: string[]
  fatherId?: string
  motherId?: string
} | null> {
  const id = qId.startsWith('Q') ? qId : `Q${qId}`
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${id}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const entity = json.entities?.[id]
  if (!entity || entity.missing) return null

  const person = entityToPerson(id, entity)
  if (person.houseId) {
    const labels = await fetchEntityLabels([person.houseId])
    person.houseLabel = labels.get(person.houseId) ?? undefined
  }
  const parentIds = getParentIds(entity)
  const { fatherId, motherId } = getParentIdsByRole(entity)
  const childIds = getChildIds(entity)

  return { person, parentIds, childIds, fatherId, motherId }
}

export interface WikidataSearchResult {
  id: string
  label: string
  description?: string
}

const WIKIDATA_Q_HUMAN = 'Q5'
const WIKIDATA_P_INSTANCE_OF = 'P31'

type ClaimSnak = { mainsnak?: { datavalue?: { value?: { id?: string } } } }

/** Returns true if the entity has P31 (instance of) = Q5 (human). */
function entityIsHuman(claims: Record<string, Array<ClaimSnak>> | undefined): boolean {
  if (!claims?.[WIKIDATA_P_INSTANCE_OF]) return false
  return claims[WIKIDATA_P_INSTANCE_OF].some(
    (c) => c.mainsnak?.datavalue?.value?.id === WIKIDATA_Q_HUMAN
  )
}

export async function searchWikidataEntities(
  query: string,
  limit = 10,
  personsOnly = false
): Promise<WikidataSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  try {
    const searchLimit = personsOnly ? Math.max(limit * 3, 20) : limit
    const url = `${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(trimmed)}&language=en&limit=${searchLimit}&format=json&origin=*`
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    let items = (json.search ?? [])
      .filter((item: { description?: string }) => item.description !== 'Wikimedia disambiguation page')
      .map((item: { id: string; label?: string; description?: string }) => ({
        id: item.id,
        label: item.label ?? item.id,
        description: item.description,
      }))

    if (personsOnly && items.length > 0) {
      const ids = items.map((i: WikidataSearchResult) => i.id).join('|')
      const entityRes = await fetch(
        `${WIKIDATA_API}?action=wbgetentities&ids=${ids}&props=claims&format=json&origin=*`
      )
      if (!entityRes.ok) return items.slice(0, limit)
      const entityJson = await entityRes.json()
      const entities = entityJson.entities ?? {}
      const humanIds = new Set(
        Object.entries(entities)
          .filter(([, e]) => e && !(e as { missing?: number }).missing && entityIsHuman((e as { claims?: Record<string, ClaimSnak[]> }).claims))
          .map(([id]) => id)
      )
      items = items.filter((item: WikidataSearchResult) => humanIds.has(item.id)).slice(0, limit)
    } else {
      items = items.slice(0, limit)
    }

    return items
  } catch {
    return []
  }
}

export async function fetchEntities(ids: string[]): Promise<Map<string, Person>> {
  if (ids.length === 0) return new Map()
  const unique = [...new Set(ids)]
  const idParam = unique.map((id) => (id.startsWith('Q') ? id : `Q${id}`)).join('|')
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${idParam}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return new Map()
  const json = await res.json()
  const entities = json.entities ?? {}
  const map = new Map<string, Person>()
  const houseIds = new Set<string>()
  for (const id of unique) {
    const eid = id.startsWith('Q') ? id : `Q${id}`
    const entity = entities[eid]
    if (entity && !entity.missing) {
      const person = entityToPerson(eid, entity)
      if (person.houseId) houseIds.add(person.houseId)
      map.set(eid, person)
    }
  }
  if (houseIds.size > 0) {
    const houseLabels = await fetchEntityLabels([...houseIds])
    for (const person of map.values()) {
      if (person.houseId) {
        person.houseLabel = houseLabels.get(person.houseId) ?? undefined
      }
    }
  }
  return map
}

export interface PersonWithParents {
  person: Person
  fatherId?: string
  motherId?: string
}

export async function fetchEntitiesWithParents(
  ids: string[],
): Promise<Map<string, PersonWithParents>> {
  if (ids.length === 0) return new Map()
  const unique = [...new Set(ids)]
  const idParam = unique
    .map((id) => (id.startsWith('Q') ? id : `Q${id}`))
    .join('|')
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${idParam}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return new Map()
  const json = await res.json()
  const entities = json.entities ?? {}
  const map = new Map<string, PersonWithParents>()
  const houseIds = new Set<string>()
  for (const id of unique) {
    const eid = id.startsWith('Q') ? id : `Q${id}`
    const entity = entities[eid]
    if (entity && !entity.missing) {
      const person = entityToPerson(eid, entity)
      if (person.houseId) houseIds.add(person.houseId)
      const { fatherId, motherId } = getParentIdsByRole(entity)
      map.set(eid, { person, fatherId, motherId })
    }
  }
  if (houseIds.size > 0) {
    const houseLabels = await fetchEntityLabels([...houseIds])
    for (const entry of map.values()) {
      if (entry.person.houseId) {
        entry.person.houseLabel =
          houseLabels.get(entry.person.houseId) ?? undefined
      }
    }
  }
  return map
}
