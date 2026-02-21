import type { Person } from '@/types/person'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

interface WikidataEntity {
  labels?: { en?: { value: string } }
  descriptions?: { en?: { value: string } }
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value: unknown } } }>>
  sitelinks?: { enwiki?: { url: string } }
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

  const wikipediaUrl = data.sitelinks?.enwiki?.url

  return {
    id: entityId,
    name,
    birthYear,
    deathYear,
    title: title ?? descriptions,
    description: descriptions,
    imageUrl,
    wikipediaUrl,
  }
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
} | null> {
  const id = qId.startsWith('Q') ? qId : `Q${qId}`
  const url = `${WIKIDATA_API}?action=wbgetentities&ids=${id}&languages=en&format=json&origin=*`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  const entity = json.entities?.[id]
  if (!entity || entity.missing) return null

  const person = entityToPerson(id, entity)
  const parentIds = getParentIds(entity)
  const childIds = getChildIds(entity)

  return { person, parentIds, childIds }
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
  for (const id of unique) {
    const eid = id.startsWith('Q') ? id : `Q${id}`
    const entity = entities[eid]
    if (entity && !entity.missing) {
      map.set(eid, entityToPerson(eid, entity))
    }
  }
  return map
}
