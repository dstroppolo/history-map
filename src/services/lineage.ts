import type { Person } from '@/types/person'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { describeRelation, type Gender } from '@/utils/kinship'
import { entityToPerson, fetchEntityLabels, getParentIdsByRole } from './wikidata'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const SPARQL_API = 'https://query.wikidata.org/sparql'
const BATCH = 50
const PARALLEL = 5

/** A guided walk through a purpose-built tree: a bloodline or a succession. */
export interface JourneyStep {
  id: string
  label: string
  detail?: string
}

export interface Journey {
  kind: 'relation' | 'crown'
  /** Short name shown as the page heading. */
  heading: string
  /** The finding, in a sentence. */
  title: string
  subtitle?: string
  rootId: string
  nodes: FamilyTreeNodeData[]
  people: Map<string, Person>
  steps: JourneyStep[]
  /** Step at which each person lights up. */
  revealAt: Map<string, number>
  /** URL parameters that recreate this journey from a shared link. */
  link: Record<string, string>
}

interface Kin {
  person: Person
  fatherId?: string
  motherId?: string
  gender: Gender
}

const kinCache = new Map<string, Kin | null>()

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function fetchKinBatch(ids: string[]): Promise<void> {
  const url =
    `${WIKIDATA_API}?action=wbgetentities&ids=${ids.join('|')}` +
    '&props=labels|descriptions|claims|sitelinks/urls&sitefilter=enwiki&languages=en&format=json&origin=*'
  let entities: Record<string, any> = {}
  try {
    const res = await fetch(url)
    if (res.ok) entities = (await res.json()).entities ?? {}
  } catch {
    // Treated as unknown people below.
  }
  for (const id of ids) {
    const entity = entities[id]
    if (!entity || entity.missing !== undefined) {
      kinCache.set(id, null)
      continue
    }
    const { fatherId, motherId } = getParentIdsByRole(entity)
    const sex = entity.claims?.P21?.[0]?.mainsnak?.datavalue?.value?.id
    const gender: Gender =
      sex === 'Q6581097' ? 'male' : sex === 'Q6581072' ? 'female' : undefined
    kinCache.set(id, { person: entityToPerson(id, entity), fatherId, motherId, gender })
  }
}

/** Load people (with parents and gender) into the cache. */
async function loadKin(ids: Iterable<string>): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => !kinCache.has(id))
  const batches = chunks(missing, BATCH)
  for (const group of chunks(batches, PARALLEL)) {
    await Promise.all(group.map(fetchKinBatch))
  }
}

function parentsOf(id: string): string[] {
  const kin = kinCache.get(id)
  return [kin?.fatherId, kin?.motherId].filter((p): p is string => !!p)
}

async function labelHouses(people: Map<string, Person>): Promise<void> {
  const houseIds = [...new Set([...people.values()].map((p) => p.houseId).filter(Boolean))] as string[]
  const labels = new Map<string, string>()
  await Promise.all(
    chunks(houseIds, BATCH).map(async (group) => {
      for (const [id, label] of await fetchEntityLabels(group)) labels.set(id, label)
    }),
  )
  for (const person of people.values()) {
    if (person.houseId && !person.houseLabel) person.houseLabel = labels.get(person.houseId)
  }
}

/** Build scene nodes from a child → parent map (undefined parent = a root). */
async function buildTree(
  parentOf: Map<string, string | undefined>,
  companions: Map<string, string[]> = new Map(),
): Promise<{ nodes: FamilyTreeNodeData[]; people: Map<string, Person> }> {
  const ids = [...parentOf.keys(), ...companions.keys()]
  await loadKin(ids)

  const people = new Map<string, Person>()
  for (const id of ids) {
    const kin = kinCache.get(id)
    people.set(id, kin ? { ...kin.person } : { id, name: id })
  }
  await labelHouses(people)

  const children = new Map<string, string[]>()
  for (const [id, parent] of parentOf) {
    if (!parent) continue
    children.set(parent, [...(children.get(parent) ?? []), id])
  }

  const nodes: FamilyTreeNodeData[] = ids.map((id) => {
    const person = people.get(id)!
    const kin = kinCache.get(id)
    const kids = companions.get(id) ?? children.get(id)
    return {
      id,
      qId: id,
      name: person.name,
      avatarUrl: person.imageUrl,
      birthYear: person.birthYear,
      deathYear: person.deathYear,
      title: person.title,
      houseId: person.houseId,
      houseLabel: person.houseLabel,
      childOf: parentOf.get(id),
      fatherId: kin?.fatherId,
      motherId: kin?.motherId,
      parentOf: kids?.length ? kids : undefined,
      // These trees are fixed: nothing more to reveal.
      childrenFetched: true,
      parentsFetched: true,
    }
  })
  return { nodes, people }
}

const nameOf = (id: string) => kinCache.get(id)?.person.name ?? id

// ──────────────────────────────── Birthplaces ────────────────────────────────

export interface Birthplace {
  placeId: string
  name: string
  lat: number
  lon: number
}

const birthplaceCache = new Map<string, Birthplace | null>()

async function fetchBirthplaceBatch(ids: string[]): Promise<void> {
  const query = `SELECT ?p ?place ?placeLabel ?coord WHERE {
    VALUES ?p { ${ids.map((id) => `wd:${id}`).join(' ')} }
    ?p wdt:P19 ?place . ?place wdt:P625 ?coord .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`
  const res = await fetch(`${SPARQL_API}?format=json&query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json' },
  })
  if (!res.ok) throw new Error(`Wikidata query failed (${res.status})`)
  const rows: any[] = (await res.json()).results?.bindings ?? []
  for (const row of rows) {
    const id = String(row.p?.value ?? '').split('/').pop()!
    const point = String(row.coord?.value ?? '').match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/)
    if (!point || birthplaceCache.get(id)) continue
    birthplaceCache.set(id, {
      placeId: String(row.place?.value ?? '').split('/').pop()!,
      name: row.placeLabel?.value ?? 'Unknown place',
      lon: parseFloat(point[1]),
      lat: parseFloat(point[2]),
    })
  }
  // Anyone not returned has no recorded birthplace.
  for (const id of ids) if (!birthplaceCache.has(id)) birthplaceCache.set(id, null)
}

/** Where each person was born, for those Wikidata has a located birthplace for. */
export async function fetchBirthplaces(ids: string[]): Promise<Map<string, Birthplace>> {
  const missing = [...new Set(ids)].filter((id) => !birthplaceCache.has(id))
  await Promise.all(chunks(missing, 80).map(fetchBirthplaceBatch))
  const out = new Map<string, Birthplace>()
  for (const id of ids) {
    const place = birthplaceCache.get(id)
    if (place) out.set(id, place)
  }
  return out
}

// ───────────────────────────── How are they related? ─────────────────────────────

const MAX_GENERATIONS = 14
const MAX_ANCESTORS = 4000

interface Climb {
  /** Ancestor → generations above the start, and the child we came through. */
  seen: Map<string, { depth: number; via?: string }>
  frontier: string[]
}

async function climbOne(c: Climb, depth: number): Promise<void> {
  await loadKin(c.frontier)
  const next: string[] = []
  for (const id of c.frontier) {
    for (const pid of parentsOf(id)) {
      if (c.seen.has(pid)) continue
      c.seen.set(pid, { depth: depth + 1, via: id })
      next.push(pid)
    }
  }
  c.frontier = next
}

function chainDown(c: Climb, from: string): string[] {
  const chain = [from]
  let cur = c.seen.get(from)?.via
  while (cur) {
    chain.push(cur)
    cur = c.seen.get(cur)?.via
  }
  return chain
}

/**
 * Find the nearest common ancestor of two people and lay out the two
 * bloodlines that meet there. Returns null when no blood tie is found.
 */
export async function findRelation(aId: string, bId: string): Promise<Journey | null> {
  const a: Climb = { seen: new Map([[aId, { depth: 0 }]]), frontier: [aId] }
  const b: Climb = { seen: new Map([[bId, { depth: 0 }]]), frontier: [bId] }

  let best: { id: string; up: number; down: number } | null = null
  let extra = 0
  for (let depth = 0; depth <= MAX_GENERATIONS; depth++) {
    for (const [id, va] of a.seen) {
      const vb = b.seen.get(id)
      if (!vb) continue
      const better =
        !best ||
        va.depth + vb.depth < best.up + best.down ||
        (va.depth + vb.depth === best.up + best.down &&
          Math.max(va.depth, vb.depth) < Math.max(best.up, best.down))
      if (better) best = { id, up: va.depth, down: vb.depth }
    }
    // A closer, lopsided tie can still turn up a couple of generations later.
    if (best && extra++ >= 2) break
    if (a.frontier.length + b.frontier.length === 0) break
    if (a.seen.size + b.seen.size > MAX_ANCESTORS) break
    await Promise.all([climbOne(a, depth), climbOne(b, depth)])
  }
  if (!best) return null

  const chainA = chainDown(a, best.id) // ancestor … A
  const chainB = chainDown(b, best.id) // ancestor … B
  await loadKin([...chainA, ...chainB])

  // Both lines descending from the same couple makes it a full relationship.
  const a1 = chainA[1]
  const b1 = chainB[1]
  let spouse: string | undefined
  let half = false
  if (a1 && b1 && a1 !== b1) {
    const pa = parentsOf(a1)
    const pb = parentsOf(b1)
    spouse = pa.find((p) => p !== best!.id && pb.includes(p))
    half = !spouse && pa.length === 2 && pb.length === 2
  }

  const parentOf = new Map<string, string | undefined>([[best.id, undefined]])
  for (const chain of [chainA, chainB]) {
    for (let i = 1; i < chain.length; i++) parentOf.set(chain[i], chain[i - 1])
  }
  const companions = new Map<string, string[]>()
  if (spouse && !parentOf.has(spouse)) companions.set(spouse, [a1, b1])
  const { nodes, people } = await buildTree(parentOf, companions)

  const aName = nameOf(aId)
  const bName = nameOf(bId)
  const genderOf = (id: string) => kinCache.get(id)?.gender
  const order = [...chainA].reverse().concat(chainB.slice(1))
  const collateral = best.up > 0 && best.down > 0

  const steps: JourneyStep[] = order.map((id, i) => {
    const up = Math.min(i, best!.up)
    const down = Math.max(0, i - best!.up)
    const relation = describeRelation(up, down, genderOf(id), half && down > 0)
    let detail = i === 0 ? 'Starting point' : `${aName}’s ${relation}`
    if (id === best!.id && collateral) detail += ' · where the two lines meet'
    return { id, label: nameOf(id), detail }
  })

  const revealAt = new Map(order.map((id, i) => [id, i]))
  if (spouse) revealAt.set(spouse, best.up)

  const relation = describeRelation(best.up, best.down, genderOf(bId), half)
  const through = spouse ? `${nameOf(best.id)} and ${nameOf(spouse)}` : nameOf(best.id)
  return {
    kind: 'relation',
    heading: `${aName} & ${bName}`,
    title:
      aId === bId ? `${aName} is ${relation}` : `${bName} is ${aName}’s ${relation}`,
    subtitle: collateral
      ? `Both descend from ${through}`
      : aId === bId
        ? undefined
        : `${Math.max(best.up, best.down)} generation${best.up + best.down === 1 ? '' : 's'} apart, in a direct line`,
    rootId: best.id,
    nodes,
    people,
    steps,
    revealAt,
    link: { relate: `${aId},${bId}` },
  }
}

// ─────────────────────────────── Follow the crown ───────────────────────────────

export interface Throne {
  id: string
  label: string
  /** Wikidata "position held" items that make up this throne over time. */
  positions: string[]
}

export const THRONES: Throne[] = [
  { id: 'britain', label: 'England & Britain', positions: ['Q18810062', 'Q110324075', 'Q111722535', 'Q9134365'] },
  { id: 'scotland', label: 'Scotland', positions: ['Q12716207'] },
  { id: 'france', label: 'France', positions: ['Q18384454', 'Q3439798'] },
  { id: 'hre', label: 'Holy Roman Empire', positions: ['Q181765'] },
  { id: 'spain', label: 'Spain', positions: ['Q3847454'] },
  { id: 'portugal', label: 'Portugal', positions: ['Q58800860'] },
  { id: 'russia', label: 'Russia', positions: ['Q12370489', 'Q2618625'] },
  { id: 'denmark', label: 'Denmark', positions: ['Q18341329'] },
  { id: 'sweden', label: 'Sweden', positions: ['Q1268572'] },
  { id: 'ottoman', label: 'Ottoman Empire', positions: ['Q15315411'] },
  { id: 'japan', label: 'Japan', positions: ['Q208233'] },
]

const MAX_REIGNS = 160
/** How far up a monarch's ancestry to look for an earlier holder of the throne. */
const CLAIM_GENERATIONS = 6

interface Reign {
  id: string
  start: number
  end?: number
}

function sparqlYear(value: string | undefined): number | undefined {
  const m = value?.match(/^(-?\d+)-/)
  return m ? parseInt(m[1], 10) : undefined
}

async function fetchReigns(throne: Throne): Promise<Reign[]> {
  const query = `SELECT ?p ?start ?end WHERE {
    VALUES ?pos { ${throne.positions.map((p) => `wd:${p}`).join(' ')} }
    ?p p:P39 ?s . ?s ps:P39 ?pos ; pq:P580 ?start .
    OPTIONAL { ?s pq:P582 ?end }
    ?p wdt:P31 wd:Q5 .
  } ORDER BY ?start`
  const res = await fetch(`${SPARQL_API}?format=json&query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json' },
  })
  if (!res.ok) throw new Error(`Wikidata query failed (${res.status})`)
  const rows: any[] = (await res.json()).results?.bindings ?? []

  const reigns: Reign[] = []
  for (const row of rows) {
    const id = String(row.p?.value ?? '').split('/').pop()
    const start = sparqlYear(row.start?.value)
    if (!id || start === undefined) continue
    const end = sparqlYear(row.end?.value)
    const last = reigns[reigns.length - 1]
    if (last && last.id === id) {
      // Same person carrying on (a renamed throne, or a duplicate statement).
      last.end = end === undefined || last.end === undefined ? end ?? last.end : Math.max(last.end, end)
      continue
    }
    reigns.push({ id, start, end })
  }
  return reigns.slice(0, MAX_REIGNS)
}

/**
 * The holders of a throne in order, joined into one tree by tracing each
 * monarch's ancestry back to an earlier holder.
 */
export async function followCrown(throne: Throne): Promise<Journey | null> {
  const reigns = await fetchReigns(throne)
  if (reigns.length === 0) return null

  const firstStep = new Map<string, number>()
  reigns.forEach((r, i) => {
    if (!firstStep.has(r.id)) firstStep.set(r.id, i)
  })
  const monarchs = [...firstStep.keys()]
  await loadKin(monarchs)

  // Climb every monarch's ancestry together, a generation per round.
  const searches = monarchs.slice(1).map((id) => ({
    id,
    via: new Map<string, string | undefined>([[id, undefined]]),
    frontier: [id],
    hit: undefined as string | undefined,
  }))
  for (let depth = 0; depth < CLAIM_GENERATIONS; depth++) {
    const active = searches.filter((s) => !s.hit && s.frontier.length > 0)
    if (active.length === 0) break
    await loadKin(active.flatMap((s) => s.frontier))
    for (const s of active) {
      const own = firstStep.get(s.id)!
      const next: string[] = []
      let hitStep = -1
      for (const id of s.frontier) {
        for (const pid of parentsOf(id)) {
          if (s.via.has(pid)) continue
          s.via.set(pid, id)
          next.push(pid)
          const step = firstStep.get(pid)
          if (step !== undefined && step < own && step > hitStep) {
            hitStep = step
            s.hit = pid
          }
        }
      }
      s.frontier = next
    }
  }

  const parentOf = new Map<string, string | undefined>()
  const revealAt = new Map<string, number>()
  parentOf.set(monarchs[0], undefined)
  revealAt.set(monarchs[0], 0)
  for (const s of searches) {
    if (parentOf.has(s.id)) continue
    const step = firstStep.get(s.id)!
    if (!s.hit) {
      parentOf.set(s.id, undefined)
      revealAt.set(s.id, step)
      continue
    }
    // Walk from the earlier monarch back down to this one.
    const chain = [s.hit]
    while (chain[chain.length - 1] !== s.id) {
      const below = s.via.get(chain[chain.length - 1])
      if (!below) break
      chain.push(below)
    }
    for (let i = chain.length - 1; i >= 1; i--) {
      if (parentOf.has(chain[i])) break
      parentOf.set(chain[i], chain[i - 1])
      revealAt.set(chain[i], step)
    }
    // The earlier monarch may not be placed yet if the data is out of order.
    if (!parentOf.has(s.hit)) {
      parentOf.set(s.hit, undefined)
      revealAt.set(s.hit, firstStep.get(s.hit)!)
    }
  }

  const { nodes, people } = await buildTree(parentOf)

  const steps: JourneyStep[] = reigns.map((r, i) => {
    const years = `${r.start} – ${r.end ?? ''}`.trim()
    const prev = reigns[i - 1]
    let how = ''
    if (prev && prev.id !== r.id) {
      const kin = kinCache.get(r.id)
      if (kin && (kin.fatherId === prev.id || kin.motherId === prev.id)) {
        how = ` · ${kin.gender === 'female' ? 'daughter' : kin.gender === 'male' ? 'son' : 'child'} of ${nameOf(prev.id)}`
      }
    }
    return { id: r.id, label: nameOf(r.id), detail: years + how }
  })

  const first = reigns[0]
  const last = reigns[reigns.length - 1]
  return {
    kind: 'crown',
    heading: `The crown of ${throne.label}`,
    title: throne.label,
    subtitle: `${monarchs.length} monarchs · ${first.start} – ${last.end ?? 'today'}`,
    rootId: monarchs[0],
    nodes,
    people,
    steps,
    revealAt,
    link: { crown: throne.id },
  }
}
