import { useState, useEffect } from 'react'
import type { Event } from '@/types/event'
import { fetchEventsForYear, fetchOnThisDay } from '@/services/timeline'
import { getCached, setCached, TTL_MS_TIMELINE } from '@/services/cache'

const CACHE_KEY_EVENTS = (year: number) => `events:${year}`
const CACHE_KEY_ON_THIS_DAY = (month: number, day: number) => `onThisDay:${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** In-flight requests: one per key to avoid duplicate SPARQL calls */
const inflight = new Map<string, Promise<Event[]>>()

async function getEventsForYearWithCache(year: number): Promise<Event[]> {
  const key = CACHE_KEY_EVENTS(year)
  const cached = await getCached<Event[]>(key, { ttlMs: TTL_MS_TIMELINE })
  if (cached !== null) return cached
  let promise = inflight.get(key)
  if (!promise) {
    promise = fetchEventsForYear(year)
    inflight.set(key, promise)
    promise
      .then((events) => { if (events.length > 0) setCached(key, events) })
      .finally(() => inflight.delete(key))
  }
  return promise
}

async function getOnThisDayWithCache(month: number, day: number): Promise<Event[]> {
  const key = CACHE_KEY_ON_THIS_DAY(month, day)
  const cached = await getCached<Event[]>(key, { ttlMs: TTL_MS_TIMELINE })
  if (cached !== null) return cached
  let promise = inflight.get(key)
  if (!promise) {
    promise = fetchOnThisDay(month, day)
    inflight.set(key, promise)
    promise
      .then((events) => { if (events.length > 0) setCached(key, events) })
      .finally(() => inflight.delete(key))
  }
  return promise
}

export interface UseEventsForYearResult {
  events: Event[]
  loading: boolean
  error: Error | null
}

export function useEventsForYear(year: number): UseEventsForYearResult {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getEventsForYearWithCache(year)
      .then((data) => {
        if (!cancelled) {
          setEvents(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setEvents([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [year])

  return { events, loading, error }
}

export interface UseOnThisDayResult {
  events: Event[]
  loading: boolean
  error: Error | null
}

export function useOnThisDay(month?: number, day?: number): UseOnThisDayResult {
  const now = new Date()
  const m = month ?? now.getMonth() + 1
  const d = day ?? now.getDate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getOnThisDayWithCache(m, d)
      .then((data) => {
        if (!cancelled) {
          setEvents(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setEvents([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [m, d])

  return { events, loading, error }
}
