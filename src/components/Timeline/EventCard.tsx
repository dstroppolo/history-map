import { motion } from 'framer-motion'
import type { Event } from '@/types/event'

interface EventCardProps {
  event: Event
  compact?: boolean
}

export default function EventCard({ event, compact }: EventCardProps) {
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: compact ? 12 : 16,
    minWidth: compact ? 200 : undefined,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
  }

  return (
    <motion.article
      style={cardStyle}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
    >
      <span
        style={{
          fontSize: 10,
          color: 'var(--color-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {event.category}
      </span>
      <h3
        style={{
          fontSize: compact ? 13 : 15,
          fontWeight: 600,
          color: 'var(--color-primary)',
          margin: '4px 0 4px 0',
        }}
      >
        {event.title}
      </h3>
      {!compact && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-body)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {event.description}
        </p>
      )}
      {event.location && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-secondary)',
            marginTop: 8,
            display: 'block',
          }}
        >
          {event.location}
        </span>
      )}
    </motion.article>
  )
}
