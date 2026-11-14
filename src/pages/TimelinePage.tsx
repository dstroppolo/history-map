import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { config } from '@/config'
import type { Event } from '@/types/event'
import EventCard from '@/components/Timeline/EventCard'
import EventDetailPanel from '@/components/Timeline/EventDetailPanel'
import { useEventsForYear, useOnThisDay } from '@/hooks/useTimelineEvents'

export default function TimelinePage() {
  const [searchParams] = useSearchParams()
  const yearParam = searchParams.get('year')
  const initialYear = yearParam ? parseInt(yearParam, 10) : 1776
  const [year, setYear] = useState(
    Number.isNaN(initialYear) ? 1776 : Math.max(config.minYear, Math.min(config.maxYear, initialYear))
  )

  useEffect(() => {
    if (yearParam) {
      const y = parseInt(yearParam, 10)
      if (!Number.isNaN(y)) {
        setYear(Math.max(config.minYear, Math.min(config.maxYear, y)))
      }
    }
  }, [yearParam])

  const { events, loading: eventsLoading, error: eventsError } = useEventsForYear(year)
  const { events: onThisDay, loading: onThisDayLoading, error: onThisDayError } = useOnThisDay()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      {/* Year scrubber */}
      <section style={{ marginBottom: 32 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--color-secondary)',
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Year
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <input
            type="range"
            min={config.minYear}
            max={config.maxYear}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              flex: 1,
              height: 8,
              accentColor: 'var(--color-accent)',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-primary)',
              minWidth: 60,
            }}
          >
            {year}
          </span>
        </div>
      </section>

      {/* On this day */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-primary)',
            marginBottom: 12,
          }}
        >
          On this day
        </h2>
        {onThisDayError && (
          <p style={{ fontSize: 13, color: 'var(--color-error, #c00)', marginBottom: 8 }}>
            {onThisDayError.message}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {onThisDayLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="timeline-spinner" />
              <span style={{ fontSize: 13, color: 'var(--color-secondary)' }}>Loading…</span>
            </div>
          ) : (
            onThisDay.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedEvent(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(event)}
              >
                <EventCard event={event} compact />
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Events for year */}
      <section>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-primary)',
            marginBottom: 12,
          }}
        >
          Events in {year}
        </h2>
        <p
          style={{
            fontSize: 11,
            color: 'var(--color-hint)',
            marginBottom: 16,
          }}
        >
          Click any event to explore in knowledge graph
        </p>
        {eventsError && (
          <p style={{ fontSize: 13, color: 'var(--color-error, #c00)', marginBottom: 16 }}>
            {eventsError.message}
          </p>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {eventsLoading ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '24px 0' }}>
              <span className="timeline-spinner" />
              <span style={{ color: 'var(--color-secondary)' }}>Loading events…</span>
            </div>
          ) : events.length > 0 ? (
            events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedEvent(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(event)}
              >
                <EventCard event={event} />
              </motion.div>
            ))
          ) : (
            <p
              style={{
                color: 'var(--color-secondary)',
                gridColumn: '1 / -1',
              }}
            >
              No notable events for {year}.
            </p>
          )}
        </div>
      </section>
      <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </motion.div>
  )
}
