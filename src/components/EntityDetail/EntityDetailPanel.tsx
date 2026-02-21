import { motion, AnimatePresence } from 'framer-motion'
import type { Person } from '@/types/person'

interface EntityDetailPanelProps {
  person: Person
  onClose: () => void
  onSeeEvents?: React.ReactNode
}

export default function EntityDetailPanel({
  person,
  onClose,
  onSeeEvents,
}: EntityDetailPanelProps) {
  const hasWikidataId = person.id.startsWith('Q') && !person.id.includes('-')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.2)',
          zIndex: 100,
        }}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          maxWidth: '90vw',
          background: 'var(--color-card)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 101,
          padding: 24,
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: 'var(--color-secondary)',
          }}
        >
          ×
        </button>

        {person.imageUrl ? (
          <img
            src={person.imageUrl}
            alt={person.name}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 16,
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--color-muted)',
              marginBottom: 16,
            }}
          />
        )}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--color-primary)',
            margin: '0 0 8px 0',
          }}
        >
          {person.name}
        </h2>
        {person.title && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-secondary)',
              margin: '0 0 16px 0',
            }}
          >
            {person.title}
          </p>
        )}
        {person.description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-body)',
              margin: '0 0 12px 0',
              lineHeight: 1.5,
            }}
          >
            {person.description}
          </p>
        )}
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-body)',
            margin: 0,
          }}
        >
          {person.birthYear && <>Born {person.birthYear}</>}
          {person.deathYear && <> · Died {person.deathYear}</>}
        </p>

        {onSeeEvents && (
          <div style={{ marginTop: 24 }}>{onSeeEvents}</div>
        )}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {person.wikipediaUrl && (
            <a
              href={person.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: 'var(--color-accent)',
                textDecoration: 'underline',
              }}
            >
              View on Wikipedia
            </a>
          )}
          {hasWikidataId && (
            <a
              href={`https://www.wikidata.org/wiki/${person.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: 'var(--color-accent)',
                textDecoration: 'underline',
              }}
            >
              View on Wikidata
            </a>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
