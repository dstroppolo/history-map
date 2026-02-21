import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { config } from '@/config'
import { dummyEventsByYear, dummyOnThisDay } from '@/data/dummy'
import EventCard from '@/components/Timeline/EventCard'

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

  const events = dummyEventsByYear[year] ?? []
  const onThisDay = dummyOnThisDay

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
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {onThisDay.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <EventCard event={event} compact />
            </motion.div>
          ))}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {events.length > 0 ? (
            events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
              No notable events for {year}. Try 1770–1780 for sample data.
            </p>
          )}
        </div>
      </section>
    </motion.div>
  )
}
