import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Person } from '@/types/person'
import {
  fetchWikipediaSummary,
  type WikipediaSummary,
} from '@/services/wikidata'

interface EntityDetailPanelProps {
  person: Person
  onClose: () => void
  onSeeEvents?: React.ReactNode
  /** Father's person id. When provided, shows a clickable father link. */
  fatherId?: string
  /** Mother's person id. When provided, shows a clickable mother link. */
  motherId?: string
  /** Look up person by id (for parent names). */
  getPersonById?: (id: string) => Person | undefined
  /** Called when user clicks a parent link - close drawer and focus graph on that person. */
  onFocusNode?: (id: string) => void
}

export default function EntityDetailPanel({
  person,
  onClose,
  onSeeEvents,
  fatherId,
  motherId,
  getPersonById,
  onFocusNode,
}: EntityDetailPanelProps) {
  const hasWikidataId = person.id.startsWith('Q') && !person.id.includes('-')

  const [summary, setSummary] = useState<WikipediaSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!person.wikipediaUrl) return
    let cancelled = false
    setSummary(null)
    setSummaryLoading(true)
    fetchWikipediaSummary(person.wikipediaUrl).then((s) => {
      if (!cancelled) {
        setSummary(s)
        setSummaryLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [person.wikipediaUrl])

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
          width: 400,
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
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 16,
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--color-muted)',
              marginBottom: 16,
            }}
          />
        )}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--color-primary)',
            margin: '0 0 4px 0',
          }}
        >
          {person.name}
        </h2>
        {person.title && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-secondary)',
              margin: '0 0 12px 0',
            }}
          >
            {person.title}
          </p>
        )}
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-body)',
            margin: '0 0 20px 0',
          }}
        >
          {person.birthYear && <>Born {person.birthYear}</>}
          {person.deathYear && <> · Died {person.deathYear}</>}
        </p>

        {/* Wikipedia summary */}
        {person.wikipediaUrl && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              marginBottom: 16,
            }}
          >
            {summaryLoading && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-secondary)',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                Loading summary…
              </p>
            )}
            {summary?.extract && (
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--color-body)',
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                {summary.extract}
              </p>
            )}
          </div>
        )}

        {!person.wikipediaUrl && person.description && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-body)',
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              {person.description}
            </p>
          </div>
        )}

        {/* Mother and Father */}
        {(fatherId || motherId) && getPersonById && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 14,
                color: 'var(--color-body)',
              }}
            >
              {fatherId && (
                <div>
                  <span style={{ color: 'var(--color-secondary)', marginRight: 6 }}>
                    Father:
                  </span>
                  {onFocusNode ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onFocusNode(fatherId)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--color-accent)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      {getPersonById(fatherId)?.name ?? fatherId}
                    </button>
                  ) : (
                    <span>{getPersonById(fatherId)?.name ?? fatherId}</span>
                  )}
                </div>
              )}
              {motherId && (
                <div>
                  <span style={{ color: 'var(--color-secondary)', marginRight: 6 }}>
                    Mother:
                  </span>
                  {onFocusNode ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onFocusNode(motherId)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--color-accent)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      {getPersonById(motherId)?.name ?? motherId}
                    </button>
                  ) : (
                    <span>{getPersonById(motherId)?.name ?? motherId}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {onSeeEvents && (
          <div style={{ marginTop: 8 }}>{onSeeEvents}</div>
        )}

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {hasWikidataId && (
            <Link
              to={`/family-tree?root=${person.id}`}
              onClick={onClose}
              style={{
                fontSize: 13,
                color: 'var(--color-accent)',
                textDecoration: 'underline',
              }}
            >
              View tree from this person
            </Link>
          )}
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
