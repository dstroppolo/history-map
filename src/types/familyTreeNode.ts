export interface FamilyTreeNodeData {
  id: string
  name: string
  avatarUrl?: string | null
  /** Wikidata QID (e.g. "Q280856") */
  qId?: string
  birthYear?: number
  deathYear?: number
  /** Parent node id. Undefined for root nodes. */
  childOf?: string
  /** Child node ids. Undefined for leaf nodes. */
  parentOf?: string[]
  /** Whether children have been fetched */
  childrenFetched?: boolean
  /** Whether parents have been fetched */
  parentsFetched?: boolean
  /** Title or role (e.g. "King of the United Kingdom") */
  title?: string
  /** House/dynasty Wikidata QID (P53) */
  houseId?: string
  /** House/dynasty display label */
  houseLabel?: string
}
