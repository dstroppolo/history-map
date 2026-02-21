export interface Event {
  id: string
  title: string
  description: string
  date: string
  category: 'Politics' | 'Science' | 'Culture' | 'War' | 'Discovery'
  location?: string
}
