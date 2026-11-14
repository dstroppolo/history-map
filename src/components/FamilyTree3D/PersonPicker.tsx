import { useEffect, useState } from 'react'
import { searchWikidataEntities, type WikidataSearchResult } from '@/services/wikidata'

export interface PickedPerson {
  id: string
  label: string
}

interface PersonPickerProps {
  label: string
  value: PickedPerson | null
  placeholder?: string
  onChange: (value: PickedPerson | null) => void
}

/** A one-person search field: type a name, pick a result, clear to change. */
export default function PersonPicker({ label, value, placeholder, onChange }: PersonPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikidataSearchResult[] | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const items = await searchWikidataEntities(q, 6, true)
      if (cancelled) return
      setResults(items)
      setHighlight(0)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const choose = (item: WikidataSearchResult) => {
    onChange({ id: item.id, label: item.label })
    setQuery('')
    setResults(null)
  }

  return (
    <div className="dynasty-picker">
      <span className="dynasty-picker__label">{label}</span>
      {value ? (
        <div className="dynasty-picker__value">
          <span>{value.label}</span>
          <button type="button" aria-label={`Change ${label}`} onClick={() => onChange(null)}>
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            placeholder={placeholder ?? 'Search a person…'}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (!results?.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight((i) => (i + 1) % results.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight((i) => (i - 1 + results.length) % results.length)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                choose(results[highlight])
              }
            }}
          />
          {query.trim() && (
            <ul className="dynasty-picker__results">
              {results === null ? (
                <li className="dynasty-picker__note">Searching…</li>
              ) : results.length === 0 ? (
                <li className="dynasty-picker__note">No one found</li>
              ) : (
                results.map((item, i) => (
                  <li
                    key={item.id}
                    className={i === highlight ? 'is-active' : undefined}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(item)}
                  >
                    <strong>{item.label}</strong>
                    {item.description && <span>{item.description}</span>}
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
