import { motion, AnimatePresence } from 'framer-motion'
import type { Event } from '@/types/event'
import { useEventArticle } from '@/hooks/useEventArticle'

interface EventDetailPanelProps {
  event: Event | null
  onClose: () => void
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const { summary, loading } = useEventArticle(event?.wikipediaTitle)

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1000,
            }}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(400px, 100vw)',
              background: 'var(--color-card)',
              borderLeft: '1px solid var(--color-border)',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
              zIndex: 1001,
              overflowY: 'auto',
              padding: 24,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: 'var(--color-secondary)',
                lineHeight: 1,
              }}
            >
              ×
            </button>
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
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--color-primary)',
                margin: '4px 0 8px 0',
              }}
            >
              {event.title}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-secondary)', margin: '0 0 12px 0' }}>
              {event.date}
              {event.location ? ` · ${event.location}` : ''}
            </p>
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-body)',
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              {event.description}
            </p>
            {event.wikipediaTitle && (
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(event.wikipediaTitle.replace(/ /g, '_'))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  color: 'var(--color-accent)',
                  marginBottom: 24,
                  display: 'inline-block',
                }}
              >
                View on Wikipedia
              </a>
            )}
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 8,
              }}
            >
              From Wikipedia
            </h3>
            {loading && (
              <p style={{ fontSize: 13, color: 'var(--color-secondary)' }}>Loading…</p>
            )}
            {!loading && summary && (
              <>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--color-body)',
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  {summary.extract}
                </p>
                {summary.contentUrls?.desktop?.page && (
                  <a
                    href={summary.contentUrls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: 'var(--color-accent)' }}
                  >
                    Read full article
                  </a>
                )}
              </>
            )}
            {!loading && !summary && (
              <p style={{ fontSize: 13, color: 'var(--color-secondary)' }}>
                No Wikipedia article available for this event.
              </p>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
