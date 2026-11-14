import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Person } from '@/types/person'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { fetchWikipediaSummary, type WikipediaSummary } from '@/services/wikidata'

interface DynastyPanelProps {
  person: Person
  node?: FamilyTreeNodeData
  houseColor: string
  /** Parents and children already in the scene. */
  relatives: { label: string; people: FamilyTreeNodeData[] }[]
  onClose: () => void
  onFocusNode: (id: string) => void
  /** Open the relationship finder starting from this person. */
  onRelate?: () => void
  onRevealParents?: () => void
  onRevealChildren?: () => void
}

export default function DynastyPanel({
  person,
  node,
  houseColor,
  relatives,
  onClose,
  onFocusNode,
  onRelate,
  onRevealParents,
  onRevealChildren,
}: DynastyPanelProps) {
  const [summary, setSummary] = useState<WikipediaSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setSummary(null)
    setImageFailed(false)
    if (!person.wikipediaUrl) return
    let cancelled = false
    setSummaryLoading(true)
    fetchWikipediaSummary(person.wikipediaUrl).then((s) => {
      if (cancelled) return
      setSummary(s)
      setSummaryLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [person.id, person.wikipediaUrl])

  const lifespan =
    person.birthYear || person.deathYear
      ? `${person.birthYear ?? '?'} – ${person.deathYear ?? 'present'}`
      : null
  const houseLabel = node?.houseLabel ?? person.houseLabel
  const body = summary?.extract || (!summaryLoading ? person.description : null)

  return (
    <motion.aside
      className="dynasty-panel"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 240 }}
      style={{ ['--house' as string]: houseColor }}
    >
      <button type="button" className="dynasty-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="dynasty-panel__portrait">
        {person.imageUrl && !imageFailed ? (
          <img
            key={person.id}
            src={`${person.imageUrl}?width=480`}
            alt={person.name}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="dynasty-panel__portrait-empty">{person.name.charAt(0)}</div>
        )}
      </div>

      <div className="dynasty-panel__body">
        <header className="dynasty-panel__header">
          {houseLabel && <span className="dynasty-panel__house">{houseLabel}</span>}
          <h2>{person.name}</h2>
          {person.title && <p className="dynasty-panel__title">{person.title}</p>}
          {lifespan && <p className="dynasty-panel__years">{lifespan}</p>}
        </header>

        {summaryLoading && <p className="dynasty-panel__loading">Consulting the archives…</p>}
        {body && <p className="dynasty-panel__summary">{body}</p>}

        {relatives.map(
          (group) =>
            group.people.length > 0 && (
              <div key={group.label} className="dynasty-panel__group">
                <h3>{group.label}</h3>
                <div className="dynasty-chips">
                  {group.people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="dynasty-chip"
                      onClick={() => onFocusNode(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}

        <div className="dynasty-panel__actions">
          {onRevealParents && (
            <button type="button" className="dynasty-button" onClick={onRevealParents}>
              Reveal parents
            </button>
          )}
          {onRevealChildren && (
            <button type="button" className="dynasty-button" onClick={onRevealChildren}>
              Reveal children
            </button>
          )}
          {onRelate && (
            <button type="button" className="dynasty-button" onClick={onRelate}>
              ⇄ Related to…
            </button>
          )}
          <Link
            to={`/family-tree?root=${person.id}`}
            className="dynasty-button dynasty-button--primary"
          >
            Explore from here
          </Link>
        </div>

        <div className="dynasty-panel__links">
          {person.wikipediaUrl && (
            <a href={person.wikipediaUrl} target="_blank" rel="noopener noreferrer">
              Wikipedia ↗
            </a>
          )}
          <a
            href={`https://www.wikidata.org/wiki/${person.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikidata ↗
          </a>
        </div>
      </div>
    </motion.aside>
  )
}
