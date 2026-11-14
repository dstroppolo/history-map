export type EventCategory = 'Politics' | 'Science' | 'Culture' | 'War' | 'Discovery' | 'Other'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  category: EventCategory
  location?: string
  /** Wikipedia article title for lazy-loading full summary (enwiki) */
  wikipediaTitle?: string
}
