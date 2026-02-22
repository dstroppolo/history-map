export interface Person {
  id: string
  name: string
  birthYear?: number
  deathYear?: number
  title?: string
  description?: string
  imageUrl?: string
  wikipediaUrl?: string
  /** House/dynasty Wikidata QID (P53) */
  houseId?: string
  /** House/dynasty display label */
  houseLabel?: string
}
